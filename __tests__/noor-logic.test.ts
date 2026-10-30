import {
  isRamadan,
  nextFastEvent,
  oddNightAfter,
  ordinal,
  ramadanFor,
} from '../src/noor/logic/ramadan';
import { DUA_CATEGORIES, DUAS } from '../src/noor/data/duas';
import {
  defaultsForCountry,
  DEFAULT_PLACE,
  Place,
} from '../src/noor/data/places';
import { DHIKR } from '../src/noor/data/dhikr';
import { NAMES_OF_ALLAH } from '../src/noor/data/names';
import { QURAN_TEXT } from '../src/noor/data/quran';
import { SURAHS } from '../src/noor/data/surahs';
import { isFriday, prayerLabel } from '../src/noor/logic/friday';
import { toHijri } from '../src/noor/logic/hijri';
import {
  addDays,
  calculatePrayerTimes,
  formatCountdown,
  formatTime,
  dayPhase,
  prayerStatus,
  sunProgress,
  PRAYER_KEYS,
} from '../src/noor/logic/prayerTimes';
import { qiblaBearing } from '../src/noor/logic/qibla';
import {
  openingPage,
  PRAYER_PHASE,
  prayerPages,
} from '../src/noor/logic/skies';
import { offsetOn, placeNow, zoneOffsetAt } from '../src/noor/logic/timezone';

const place = (p: Partial<Place> & Pick<Place, 'lat' | 'lng'>): Place => ({
  name: 'Test',
  country: '',
  countryCode: '',
  utcOffset: 0,
  source: 'search',
  ...p,
});

const LAHORE = place({
  name: 'Lahore',
  countryCode: 'PK',
  lat: 31.5204,
  lng: 74.3587,
  timeZone: 'Asia/Karachi',
  utcOffset: 5,
});
const LONDON = place({
  name: 'London',
  countryCode: 'GB',
  lat: 51.5074,
  lng: -0.1278,
  timeZone: 'Europe/London',
});
const NEW_YORK = place({
  name: 'New York',
  countryCode: 'US',
  lat: 40.7128,
  lng: -74.006,
  timeZone: 'America/New_York',
  utcOffset: -5,
});
const OSLO = place({
  name: 'Oslo',
  countryCode: 'NO',
  lat: 59.91,
  lng: 10.75,
  timeZone: 'Europe/Oslo',
  utcOffset: 1,
});
const JAKARTA = place({
  name: 'Jakarta',
  countryCode: 'ID',
  lat: -6.2088,
  lng: 106.8456,
  timeZone: 'Asia/Jakarta',
  utcOffset: 7,
});

describe('data', () => {
  test('114 surahs with 6236 ayat in total', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((n, s) => n + s.ayahs, 0)).toBe(6236);
  });

  test('bundled offline sample matches ayah counts', () => {
    for (const [num, ayat] of Object.entries(QURAN_TEXT)) {
      expect(ayat).toHaveLength(SURAHS[Number(num) - 1].ayahs);
    }
  });

  test('99 names of Allah', () => {
    expect(NAMES_OF_ALLAH).toHaveLength(99);
  });

  test('country defaults for calculation method and Asr', () => {
    expect(defaultsForCountry('PK')).toEqual({
      method: 'karachi',
      madhab: 'hanafi',
    });
    expect(defaultsForCountry('sa')).toEqual({
      method: 'makkah',
      madhab: 'standard',
    });
    expect(defaultsForCountry('US')).toEqual({
      method: 'isna',
      madhab: 'standard',
    });
    expect(defaultsForCountry('MY')).toEqual({
      method: 'sea',
      madhab: 'standard',
    });
    expect(defaultsForCountry('TR')).toEqual({
      method: 'mwl',
      madhab: 'hanafi',
    });
    expect(defaultsForCountry('')).toEqual({
      method: 'mwl',
      madhab: 'standard',
    });
  });
});

describe('time zones', () => {
  test('daylight saving is handled from the IANA zone', () => {
    expect(zoneOffsetAt('Europe/London', Date.UTC(2026, 6, 1, 12))).toBe(1);
    expect(zoneOffsetAt('Europe/London', Date.UTC(2026, 0, 15, 12))).toBe(0);
    expect(zoneOffsetAt('America/New_York', Date.UTC(2026, 6, 1, 12))).toBe(-4);
    expect(zoneOffsetAt('Asia/Kolkata', Date.UTC(2026, 6, 1, 12))).toBe(5.5);
    expect(zoneOffsetAt('Not/AZone', Date.now())).toBeNull();
  });

  test('offsetOn uses the local calendar date', () => {
    expect(offsetOn(LONDON, { y: 2026, m: 3, d: 28 })).toBe(0); // day before BST
    expect(offsetOn(LONDON, { y: 2026, m: 3, d: 30 })).toBe(1);
  });

  test('falls back to the saved offset when no time zone is known', () => {
    const p = place({ lat: 0, lng: 0, utcOffset: 3 });
    expect(offsetOn(p, { y: 2026, m: 1, d: 1 })).toBe(3);
  });

  test('placeNow converts to local time', () => {
    const now = placeNow(LAHORE, Date.UTC(2026, 9, 18, 20, 30));
    expect(now).toMatchObject({ y: 2026, m: 10, d: 19 });
    expect(now.hours).toBeCloseTo(1.5);
  });
});

describe('prayer times', () => {
  const minutes = (h: number) => Math.round(h * 60);

  test('Makkah, 21 June 2025 (Umm al-Qura) is close to published times', () => {
    const t = calculatePrayerTimes(
      { y: 2025, m: 6, d: 21 },
      DEFAULT_PLACE,
      3,
      'makkah',
      'standard',
    );
    // Published: Fajr 4:12, Sunrise 5:39, Dhuhr 12:22, Asr 3:41, Maghrib 7:06, Isha 8:36
    expect(Math.abs(minutes(t.fajr) - (4 * 60 + 12))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.sunrise) - (5 * 60 + 39))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.dhuhr) - (12 * 60 + 22))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.asr) - (15 * 60 + 41))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.maghrib) - (19 * 60 + 6))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.isha) - (20 * 60 + 36))).toBeLessThanOrEqual(3);
  });

  test('London summer times use BST (UTC+1)', () => {
    const d = { y: 2026, m: 7, d: 1 };
    const t = calculatePrayerTimes(
      d,
      LONDON,
      offsetOn(LONDON, d),
      'mwl',
      'standard',
    );
    // Solar noon in London is ~13:04 BST in early July.
    expect(Math.abs(minutes(t.dhuhr) - (13 * 60 + 4))).toBeLessThanOrEqual(3);
  });

  test('times are ordered and finite everywhere, all year (incl. high latitude)', () => {
    for (const p of [LAHORE, LONDON, NEW_YORK, OSLO, JAKARTA, DEFAULT_PLACE]) {
      const { method, madhab } = defaultsForCountry(p.countryCode);
      for (let m = 1; m <= 12; m++) {
        const d = { y: 2026, m, d: 15 };
        const t = calculatePrayerTimes(d, p, offsetOn(p, d), method, madhab);
        const values = PRAYER_KEYS.map(k => t[k]);
        values.forEach(v => expect(Number.isFinite(v)).toBe(true));
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
      }
    }
  });

  test('status rolls over to tomorrow after Isha', () => {
    const today = calculatePrayerTimes(
      { y: 2026, m: 10, d: 18 },
      LAHORE,
      5,
      'karachi',
      'hanafi',
    );
    const s = prayerStatus(
      { y: 2026, m: 10, d: 18, weekday: 0, hours: 23.5 },
      today,
      today,
      today,
    );
    expect(s.current).toBe('isha');
    expect(s.next).toBe('fajr');
    expect(s.remaining).toBeGreaterThan(0);
  });

  test('current prayer: Fajr until sunrise, then no prayer due until Dhuhr', () => {
    const t = calculatePrayerTimes(
      { y: 2026, m: 10, d: 18 },
      LAHORE,
      5,
      'karachi',
      'hanafi',
    );
    const at = (hours: number) =>
      prayerStatus({ y: 2026, m: 10, d: 18, weekday: 0, hours }, t, t, t);

    const fajr = at(t.fajr + 0.1);
    expect([fajr.current, fajr.next]).toEqual(['fajr', 'dhuhr']);
    expect(fajr.currentTime).toBe(t.fajr);

    const duha = at(t.sunrise + 0.5);
    expect([duha.current, duha.next]).toEqual(['sunrise', 'dhuhr']);
    expect(duha.currentTime).toBe(t.sunrise);

    const asr = at(t.asr + 0.2);
    expect([asr.current, asr.next]).toEqual(['asr', 'maghrib']);
    expect(asr.currentTime).toBe(t.asr);

    // After midnight it's still Isha (from yesterday) until Fajr.
    const late = at(1);
    expect([late.current, late.next]).toEqual(['isha', 'fajr']);
    expect(late.currentTime).toBeLessThan(0);
  });

  test('sky phase and sun position follow the prayer times', () => {
    const t = calculatePrayerTimes(
      { y: 2026, m: 10, d: 18 },
      LAHORE,
      5,
      'karachi',
      'hanafi',
    );
    expect(dayPhase(t.fajr + 0.1, t)).toBe('dawn');
    expect(dayPhase(t.dhuhr, t)).toBe('day');
    expect(dayPhase(t.asr + 0.1, t)).toBe('afternoon');
    expect(dayPhase(t.maghrib + 0.1, t)).toBe('dusk');
    expect(dayPhase(t.isha + 0.1, t)).toBe('night');
    expect(dayPhase(2, t)).toBe('night');
    expect(sunProgress(t.sunrise, t)).toBe(0);
    expect(sunProgress((t.sunrise + t.maghrib) / 2, t)).toBeCloseTo(0.5);
    expect(sunProgress(t.isha, t)).toBe(1);
  });

  test('formatting', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(13.5)).toBe('1:30 PM');
    expect(formatCountdown(1.5)).toBe('01:30:00');
  });
});

describe('five skies (the pages on Today)', () => {
  const date = { y: 2026, m: 10, d: 18 };
  const t = calculatePrayerTimes(date, LAHORE, 5, 'karachi', 'hanafi');
  const at = (hours: number) => {
    const status = prayerStatus({ ...date, weekday: 0, hours }, t, t, t);
    return prayerPages(date, hours, t, status);
  };
  const states = (hours: number) => at(hours).map(p => p.state);
  const nobodyPrayed = () => false;

  test('one page per salah, in order, each with its own sky', () => {
    expect(at(12).map(p => p.key)).toEqual([
      'fajr',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ]);
    // The page's sky is the one the app shows at that prayer's time.
    for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(dayPhase(t[k] + 0.05, t)).toBe(PRAYER_PHASE[k]);
    }
  });

  test('during Asr: earlier prayers are past, Asr is now, Maghrib next', () => {
    expect(states(t.asr + 0.3)).toEqual([
      'past',
      'past',
      'now',
      'next',
      'later',
    ]);
    const pages = at(t.asr + 0.3);
    expect(pages[2].time).toBe(t.asr);
    expect(pages.every(p => p.dayOffset === 0 && p.day === date)).toBe(true);
    expect(openingPage(pages, nobodyPrayed)).toBe(2);
  });

  test('opens on the next prayer once the current one is marked prayed', () => {
    const pages = at(t.asr + 0.3);
    expect(openingPage(pages, p => p.key === 'asr')).toBe(3);
  });

  test('after sunrise no prayer is due, so it opens on Dhuhr', () => {
    expect(states(t.sunrise + 1)).toEqual([
      'past',
      'next',
      'later',
      'later',
      'later',
    ]);
    expect(openingPage(at(t.sunrise + 1), nobodyPrayed)).toBe(1);
  });

  test("after Isha the next Fajr is tomorrow's", () => {
    const pages = at(t.isha + 1);
    expect(pages.map(p => p.state)).toEqual([
      'next',
      'past',
      'past',
      'past',
      'now',
    ]);
    expect(pages[0].dayOffset).toBe(1);
    expect(pages[0].day).toEqual(addDays(date, 1));
    expect(pages[0].time).toBeGreaterThan(24);
    expect(openingPage(pages, nobodyPrayed)).toBe(4);
  });

  test("before Fajr it is still last night's Isha", () => {
    const pages = at(1);
    expect(pages.map(p => p.state)).toEqual([
      'next',
      'later',
      'later',
      'later',
      'now',
    ]);
    expect(pages[4].dayOffset).toBe(-1);
    expect(pages[4].day).toEqual(addDays(date, -1));
    expect(pages[4].time).toBeLessThan(0);
    // Today's Fajr is still today's.
    expect(pages[0].dayOffset).toBe(0);
  });

  test('an Isha after midnight (high latitude) still belongs to today', () => {
    const polar = { ...t, maghrib: 22.6, isha: 24.3 };
    const status = prayerStatus(
      { ...date, weekday: 0, hours: 23 },
      polar,
      polar,
      polar,
    );
    const pages = prayerPages(date, 23, polar, status);
    expect(pages[4].state).toBe('next');
    expect(pages[4].dayOffset).toBe(0);
    expect(pages[4].day).toBe(date);
  });
});

describe("Fridays (Jumu'ah)", () => {
  const thursday = { y: 2026, m: 10, d: 29 };
  const friday = { y: 2026, m: 10, d: 30 };

  test('Friday is found from the date alone', () => {
    expect(isFriday(friday)).toBe(true);
    expect(isFriday(thursday)).toBe(false);
    expect(isFriday(addDays(friday, 7))).toBe(true);
    expect(isFriday({ y: 2027, m: 1, d: 1 })).toBe(true);
  });

  test("Dhuhr is called Jumu'ah on Fridays only; other prayers keep their names", () => {
    expect(prayerLabel('dhuhr', friday)).toEqual({
      en: "Jumu'ah",
      ar: 'الجمعة',
    });
    expect(prayerLabel('dhuhr', thursday)).toEqual({
      en: 'Dhuhr',
      ar: 'الظهر',
    });
    for (const k of PRAYER_KEYS.filter(p => p !== 'dhuhr')) {
      expect(prayerLabel(k, friday)).toEqual(prayerLabel(k, thursday));
    }
  });

  test('Durood is in the Friday duas and the tasbeeh counter', () => {
    const fridayDuas = DUAS.filter(d => d.category === 'Friday');
    expect(fridayDuas.map(d => d.id)).toEqual([
      'durood-ibrahimi',
      'durood-short',
    ]);
    // The same Durood Ibrahimi as recited in the Janazah prayer.
    const janazah = DUAS.find(d => d.id === 'janazah-durood')!;
    expect(fridayDuas[0].arabic).toBe(janazah.arabic);
    expect(fridayDuas[0].reference).toContain('Abi Dawud 1047');
    expect(DHIKR.find(d => d.id === 'durood')?.transliteration).toBe(
      "Allahumma salli 'ala Muhammad",
    );
  });
});

describe('hijri & qibla', () => {
  test('1 Ramadan 1446 ≈ 1 March 2025', () => {
    const h = toHijri({ y: 2025, m: 3, d: 1 });
    expect(h.year).toBe(1446);
    expect(h.month).toBe(9);
    expect(Math.abs(h.day - 1)).toBeLessThanOrEqual(1);
  });

  test('qibla from London is roughly 119°', () => {
    expect(qiblaBearing(LONDON.lat, LONDON.lng)).toBeCloseTo(119, 0);
  });
});

describe('duas', () => {
  test('every dua is complete, has a unique id and a source', () => {
    const ids = new Set(DUAS.map(d => d.id));
    expect(ids.size).toBe(DUAS.length);
    for (const d of DUAS) {
      for (const field of [
        d.title,
        d.arabic,
        d.transliteration,
        d.translation,
        d.reference,
      ]) {
        expect(field.trim()).not.toBe('');
      }
      expect(DUA_CATEGORIES).toContain(d.category);
    }
  });

  test('every category, including Ramadan and Janazah, has duas', () => {
    for (const c of DUA_CATEGORIES) {
      expect(DUAS.some(d => d.category === c)).toBe(true);
    }
    expect(DUAS.filter(d => d.category === 'Ramadan').length).toBeGreaterThan(
      4,
    );
    expect(DUAS.filter(d => d.category === 'Janazah').length).toBeGreaterThan(
      4,
    );
  });
});

describe('ramadan', () => {
  const SHABAN = { y: 2026, m: 1, d: 20 }; // Sha'ban 1447

  test('finds the next Ramadan and all its days', () => {
    const r = ramadanFor(SHABAN);
    expect(r.today).toBeNull();
    expect(r.year).toBe(1447);
    const start = r.days[0].date;
    expect(toHijri(start)).toMatchObject({ month: 9, day: 1 });
    expect(toHijri(addDays(start, -1)).month).toBe(8);
    expect(addDays(SHABAN, r.daysUntil)).toEqual(start);
    expect(r.days.length).toBeGreaterThanOrEqual(29);
    expect(r.days.map(d => d.day)).toEqual(r.days.map((_, i) => i + 1));
    const after = addDays(r.days[r.days.length - 1].date, 1);
    expect(toHijri(after).month).toBe(10); // Shawwal: Eid
  });

  test('during Ramadan: today is the day of the month', () => {
    const start = ramadanFor(SHABAN).days[0].date;
    const r = ramadanFor(addDays(start, 11));
    expect(r.today).toBe(12);
    expect(r.daysUntil).toBe(0);
    expect(r.days[0].date).toEqual(start);
    expect(isRamadan(addDays(start, 11))).toBe(true);
    expect(isRamadan(addDays(start, -1))).toBe(false);
  });

  test('a moon-sighting adjustment moves the start', () => {
    const start = ramadanFor(SHABAN).days[0].date;
    expect(ramadanFor(SHABAN, 1).days[0].date).toEqual(addDays(start, -1));
  });

  test('next fasting moment: Sehri, then Iftar, then tomorrow’s Sehri', () => {
    const t = {
      fajr: 5,
      sunrise: 6.3,
      dhuhr: 12.1,
      asr: 15.6,
      maghrib: 18,
      isha: 19.4,
    };
    const tm = { ...t, fajr: 4.98 };
    expect(nextFastEvent(3, t, tm, true)).toEqual({ kind: 'sehri', at: 5 });
    expect(nextFastEvent(13, t, tm, true)).toEqual({ kind: 'iftar', at: 18 });
    expect(nextFastEvent(20, t, tm, true)).toEqual({
      kind: 'sehri',
      at: 28.98,
    });
    expect(nextFastEvent(20, t, tm, false)).toBeNull(); // last day: Eid
  });

  test('odd nights of the last ten begin at Iftar the day before', () => {
    expect([19, 20, 21, 22, 26, 28, 29].map(oddNightAfter)).toEqual([
      null,
      21,
      null,
      23,
      27,
      29,
      null,
    ]);
    expect([1, 2, 3, 11, 12, 13, 21, 22, 23, 27].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '27th',
    ]);
  });
});
