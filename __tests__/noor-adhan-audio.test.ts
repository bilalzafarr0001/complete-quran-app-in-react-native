import notifee from '@notifee/react-native';
import { NativeModules, Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import type { Place } from '../src/noor/data/places';
import { isRamadan } from '../src/noor/logic/ramadan';
import {
  buildNotification,
  CHANNELS,
  localToUtcMs,
  planAlerts,
  scheduleAlerts,
  sendTestAdhan,
} from '../src/noor/services/adhan';
import {
  ayahAudioUrl,
  buildSurahQueue,
  globalAyahNumber,
  parseTrackId,
  playSurah,
} from '../src/noor/services/recitation';
import { calculatePrayerTimes } from '../src/noor/logic/prayerTimes';
import { offsetOn } from '../src/noor/logic/timezone';
import type { NotifySettings } from '../src/noor/store';

const LAHORE: Place = {
  name: 'Lahore',
  country: 'Pakistan',
  countryCode: 'PK',
  lat: 31.5204,
  lng: 74.3587,
  timeZone: 'Asia/Karachi',
  utcOffset: 5,
  source: 'gps',
};
const LONDON: Place = {
  name: 'London',
  country: 'United Kingdom',
  countryCode: 'GB',
  lat: 51.5074,
  lng: -0.1278,
  timeZone: 'Europe/London',
  utcOffset: 0,
  source: 'search',
};

const ON: NotifySettings = {
  enabled: true,
  modes: {
    fajr: 'adhan',
    dhuhr: 'adhan',
    asr: 'adhan',
    maghrib: 'adhan',
    isha: 'adhan',
  },
  reminderMinutes: 0,
  sehriMinutes: 0,
  sunrise: false,
};

describe('recitation', () => {
  test('global ayah numbers match the Quran audio CDN', () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
    expect(globalAyahNumber(2, 1)).toBe(8);
    expect(globalAyahNumber(2, 255)).toBe(262); // Ayat al-Kursi
    expect(globalAyahNumber(112, 1)).toBe(6222); // as returned by the API
    expect(globalAyahNumber(114, 6)).toBe(6236); // last ayah
  });

  test('audio URLs use each reciter’s bitrate', () => {
    expect(ayahAudioUrl('ar.alafasy', 2, 255)).toBe(
      'https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3',
    );
    expect(ayahAudioUrl('ar.abdulbasitmurattal', 1, 1)).toBe(
      'https://cdn.islamic.network/quran/audio/64/ar.abdulbasitmurattal/1.mp3',
    );
  });

  test('a surah is preceded by the Bismillah (except Al-Fatihah and At-Tawbah)', () => {
    const baqarah = buildSurahQueue('ar.alafasy', 2, 1);
    expect(baqarah.tracks).toHaveLength(287);
    expect(baqarah.tracks[0]).toMatchObject({
      id: '2:0',
      url: expect.stringMatching(/\/1\.mp3$/),
    });
    expect(baqarah.startIndex).toBe(0);

    const fatiha = buildSurahQueue('ar.alafasy', 1, 1);
    expect(fatiha.tracks).toHaveLength(7);
    expect(fatiha.tracks[0].id).toBe('1:1');

    const tawbah = buildSurahQueue('ar.alafasy', 9, 1);
    expect(tawbah.tracks).toHaveLength(129);
    expect(tawbah.tracks[0].id).toBe('9:1');
  });

  test('starting mid-surah skips straight to that ayah', () => {
    const q = buildSurahQueue('ar.alafasy', 2, 255);
    expect(q.tracks[q.startIndex].id).toBe('2:255');
    const t = buildSurahQueue('ar.alafasy', 9, 5);
    expect(t.tracks[t.startIndex].id).toBe('9:5');
  });

  test('playSurah loads the queue and starts at the right ayah', async () => {
    await playSurah('ar.husary', 36, 12, 'off');
    const { queue, index } = (
      TrackPlayer as unknown as {
        __state: () => { queue: { id: string }[]; index: number };
      }
    ).__state();
    expect(queue[index].id).toBe('36:12');
    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  test('track ids parse back to surah/ayah', () => {
    expect(parseTrackId('2:255')).toEqual({ surah: 2, ayah: 255 });
    expect(parseTrackId(undefined)).toBeNull();
  });
});

describe('adhan schedule', () => {
  // 19 Oct 2026 10:00 in Lahore (05:00 UTC).
  const NOW = Date.UTC(2026, 9, 19, 5, 0);

  test('nothing is scheduled while notifications are off', () => {
    expect(
      planAlerts({
        place: LAHORE,
        method: 'karachi',
        madhab: 'hanafi',
        settings: { ...ON, enabled: false },
        now: NOW,
      }),
    ).toEqual([]);
  });

  test('each alert fires exactly at the calculated prayer time', () => {
    const plan = planAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings: ON,
      now: NOW,
      days: 2,
    });
    // Fajr today (4:47) has passed; Dhuhr…Isha today + all five tomorrow.
    expect(plan.map(a => a.id)).toEqual([
      'adhan-2026-10-19-dhuhr',
      'adhan-2026-10-19-asr',
      'adhan-2026-10-19-maghrib',
      'adhan-2026-10-19-isha',
      'adhan-2026-10-20-fajr',
      'adhan-2026-10-20-dhuhr',
      'adhan-2026-10-20-asr',
      'adhan-2026-10-20-maghrib',
      'adhan-2026-10-20-isha',
    ]);
    const today = { y: 2026, m: 10, d: 19 };
    const t = calculatePrayerTimes(today, LAHORE, 5, 'karachi', 'hanafi');
    expect(plan[0].at).toBe(localToUtcMs(today, t.dhuhr, 5));
    // Sanity: Lahore Dhuhr ≈ 11:48 local = 06:48 UTC.
    const d = new Date(plan[0].at);
    expect(d.getUTCHours()).toBe(6);
    expect(Math.abs(d.getUTCMinutes() - 48)).toBeLessThanOrEqual(2);
  });

  test('handles daylight saving changes (London, last Sunday of March)', () => {
    // Sat 28 Mar 2026 noon UTC; clocks go forward on Sun 29 Mar.
    const plan = planAlerts({
      place: LONDON,
      method: 'mwl',
      madhab: 'standard',
      settings: ON,
      now: Date.UTC(2026, 2, 28, 12),
      days: 3,
    });
    const dhuhr = (day: number) =>
      plan.find(a => a.id === `adhan-2026-3-${day}-dhuhr`)!;
    // Solar noon ≈ 12:04 UTC both days: 12:04 local before the change, 13:04 local after (BST).
    const sat = new Date(dhuhr(29).at);
    const mon = new Date(dhuhr(30).at);
    expect(
      Math.abs(sat.getUTCHours() * 60 + sat.getUTCMinutes() - (12 * 60 + 4)),
    ).toBeLessThanOrEqual(3);
    expect(
      Math.abs(mon.getUTCHours() * 60 + mon.getUTCMinutes() - (12 * 60 + 4)),
    ).toBeLessThanOrEqual(3);
    expect(offsetOn(LONDON, { y: 2026, m: 3, d: 30 })).toBe(1);
  });

  test('per-prayer modes, reminders and sunrise', () => {
    const settings: NotifySettings = {
      ...ON,
      modes: { ...ON.modes, asr: 'off', isha: 'beep' },
      reminderMinutes: 15,
      sunrise: true,
    };
    const plan = planAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings,
      now: NOW,
      days: 1,
    });
    expect(plan.some(a => a.id.endsWith('-asr'))).toBe(false);
    expect(plan.find(a => a.id === 'adhan-2026-10-19-isha')!.kind).toBe('beep');
    const maghrib = plan.find(a => a.id === 'adhan-2026-10-19-maghrib')!;
    const reminder = plan.find(a => a.id === 'remind-2026-10-19-maghrib')!;
    expect(maghrib.at - reminder.at).toBe(15 * 60000);
    // Sunrise (6:09) already passed at 10:00, so it's not scheduled today.
    expect(plan.some(a => a.kind === 'sunrise')).toBe(false);
  });

  test('Fajr uses the Fajr adhan; others the regular adhan', () => {
    const fajr = buildNotification(
      { id: 'x', kind: 'adhan', prayer: 'fajr', at: NOW, hours: 4.8 },
      LAHORE,
      0,
    );
    const asr = buildNotification(
      { id: 'y', kind: 'adhan', prayer: 'asr', at: NOW, hours: 15.8 },
      LAHORE,
      0,
    );
    const beep = buildNotification(
      { id: 'z', kind: 'beep', prayer: 'asr', at: NOW, hours: 15.8 },
      LAHORE,
      0,
    );
    expect(fajr.android?.channelId).toBe(CHANNELS.fajr);
    expect(asr.android?.channelId).toBe(CHANNELS.adhan);
    expect(beep.android?.channelId).toBe(CHANNELS.beep);
    expect(asr.android?.actions?.[0].title).toBe('Stop adhan');
    expect(asr.title).toBe('Asr · العصر');
    expect(asr.body).toBe("It's time for Asr in Lahore (3:48 PM).");
  });

  test('scheduling replaces previous alerts and uses exact alarms', async () => {
    const triggers = (
      notifee as unknown as {
        __triggers: Map<
          string,
          { trigger: { alarmManager: { type: number } } }
        >;
      }
    ).__triggers;
    triggers.set('adhan-old', { trigger: { alarmManager: { type: 3 } } });
    triggers.set('unrelated', { trigger: { alarmManager: { type: 3 } } });
    const count = await scheduleAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings: ON,
      now: NOW,
      days: 7,
    });
    expect(count).toBe(34); // 4 left today + 5 × 6 days
    expect(triggers.has('adhan-old')).toBe(false);
    expect(triggers.has('unrelated')).toBe(true);
    expect(
      [...triggers.values()].every(t => t.trigger.alarmManager.type === 3),
    ).toBe(true);
  });
});

describe('sehri reminders (Ramadan)', () => {
  // 25 Feb 2026, 05:00 in Lahore: during Ramadan 1447.
  const RAMADAN_NOW = Date.UTC(2026, 1, 25, 0, 0);
  const plan = (now: number, sehriMinutes: 0 | 45) =>
    planAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings: { ...ON, sehriMinutes },
      now,
      days: 3,
    });

  test('a reminder before Fajr on Ramadan days only', () => {
    expect(isRamadan({ y: 2026, m: 2, d: 25 })).toBe(true);
    const alerts = plan(RAMADAN_NOW, 45);
    const sehri = alerts.filter(a => a.kind === 'sehri');
    // Today's Sehri (≈4:40) has passed at 05:00, so tomorrow and the day after.
    expect(sehri.map(a => a.id)).toEqual([
      'sehri-2026-2-26',
      'sehri-2026-2-27',
    ]);
    for (const s of sehri) {
      const fajr = alerts.find(
        a => a.id === s.id.replace('sehri-', 'adhan-') + '-fajr',
      )!;
      expect(fajr.at - s.at).toBe(45 * 60000);
    }
    const n = buildNotification(sehri[0], LAHORE, 0);
    expect(n.title).toBe('Sehri ends in 45 minutes');
    expect(n.body).toMatch(
      /^Fajr \(end of Sehri\) is at \d+:\d\d AM in Lahore\.$/,
    );
  });

  test('nothing when off, or outside Ramadan', () => {
    expect(plan(RAMADAN_NOW, 0).some(a => a.kind === 'sehri')).toBe(false);
    const october = Date.UTC(2026, 9, 19, 5, 0);
    expect(plan(october, 45).some(a => a.kind === 'sehri')).toBe(false);
  });
});

describe('adhan on Android (native player)', () => {
  const NOW = Date.UTC(2026, 9, 19, 5, 0);
  const native = {
    schedule: jest.fn(async (alarms: unknown[]) => alarms.length),
    cancelAll: jest.fn(async () => {}),
    test: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
  };
  const triggers = (notifee as unknown as { __triggers: Map<string, unknown> })
    .__triggers;
  const os = Platform.OS;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
    NativeModules.NoorAdhan = native;
  });
  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => os });
    delete NativeModules.NoorAdhan;
  });
  beforeEach(() => {
    triggers.clear();
    jest.clearAllMocks();
  });

  test('full adhans go to the native player, other alerts to notifee', async () => {
    const count = await scheduleAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings: {
        ...ON,
        modes: { ...ON.modes, isha: 'beep' },
        reminderMinutes: 10,
      },
      now: NOW,
      days: 1,
    });
    // Today after 10:00: Dhuhr, Asr, Maghrib adhans + Isha beep + 4 reminders.
    expect(count).toBe(8);
    const alarms = native.schedule.mock.calls[0][0] as {
      id: string;
      fajr: boolean;
      title: string;
    }[];
    expect(alarms.map(a => a.id)).toEqual([
      'adhan-2026-10-19-dhuhr',
      'adhan-2026-10-19-asr',
      'adhan-2026-10-19-maghrib',
    ]);
    expect(alarms[1].title).toBe('Asr · العصر');
    expect(alarms.every(a => !a.fajr)).toBe(true);
    expect([...triggers.keys()].some(id => id.startsWith('adhan-'))).toBe(
      true, // the Isha beep
    );
    expect(triggers.has('adhan-2026-10-19-asr')).toBe(false);
    expect(triggers.size).toBe(5);
    expect(notifee.deleteChannel).toHaveBeenCalledWith(CHANNELS.adhan);
  });

  test('turning alerts off clears the native adhans too', async () => {
    await scheduleAlerts({
      place: LAHORE,
      method: 'karachi',
      madhab: 'hanafi',
      settings: { ...ON, enabled: false },
      now: NOW,
    });
    expect(native.schedule).toHaveBeenCalledWith([]);
  });

  test('test adhan uses the native player', async () => {
    await sendTestAdhan(LAHORE, true, 5);
    expect(native.test).toHaveBeenCalledWith(
      true,
      5000,
      'Test · Fajr adhan',
      'This is how the adhan will sound at prayer time.',
    );
    expect(triggers.size).toBe(0);
  });
});
