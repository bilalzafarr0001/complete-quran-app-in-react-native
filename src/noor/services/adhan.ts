import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidStyle,
  AndroidVisibility,
  AuthorizationStatus,
  Event,
  EventType,
  Notification,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { NativeModules, Platform } from 'react-native';
import type { Place } from '../data/places';
import { dateKey } from '../logic/dates';
import { DUROOD_HOUR, isFriday, JUMUAH_LABEL } from '../logic/friday';
import {
  addDays,
  calculatePrayerTimes,
  formatTime,
  Madhab,
  MethodId,
  PRAYER_LABELS,
  SALAH_KEYS,
  YMD,
} from '../logic/prayerTimes';
import { isRamadan } from '../logic/ramadan';
import { offsetOn, placeNow } from '../logic/timezone';
import type { AdhanLength, NotifySettings, SalahKey } from '../store';

/**
 * Android channel ids. A channel's sound can't change after creation,
 * so the version suffix must change if the sound files ever change.
 */
export const CHANNELS = {
  adhan: 'noor-adhan-v1',
  fajr: 'noor-adhan-fajr-v1',
  beep: 'noor-prayer-v1',
  reminder: 'noor-reminder-v1',
  friday: 'noor-friday-v1',
} as const;

const PREFIXES = ['adhan-', 'remind-', 'sunrise-', 'sehri-', 'durood-'];
/** Days of alerts kept scheduled ahead (refreshed every time the app opens). */
export const SCHEDULE_DAYS = 7;
/** iOS keeps at most 64 pending notifications per app. */
const IOS_LIMIT = 60;

type NativeAdhanAlarm = {
  id: string;
  at: number;
  fajr: boolean;
  title: string;
  body: string;
  /** A file in android/app/src/main/res/raw (without extension). */
  sound: string;
};

/**
 * Android's native adhan player (android/app/src/main/java/com/myapp/adhan).
 * It plays the full adhan on the alarm volume from a foreground service, so
 * it's heard on silent/vibrate and isn't cut short like long notification
 * sounds are on many Android brands. Undefined on iOS.
 */
type NativeAdhan = {
  schedule(alarms: NativeAdhanAlarm[]): Promise<number>;
  cancelAll(): Promise<void>;
  test(
    fajr: boolean,
    sound: string,
    delayMs: number,
    title: string,
    body: string,
  ): Promise<void>;
  stop(): Promise<void>;
};

/**
 * The recording to play: the opening "Allahu Akbar, Allahu Akbar" (short), or
 * the full adhan, which for Fajr includes "as-salatu khayrun min an-nawm".
 */
export function adhanSound(fajr: boolean, length: AdhanLength) {
  if (length === 'short') return 'adhan_short';
  return fajr ? 'adhan_fajr' : 'adhan';
}

function nativeAdhan(): NativeAdhan | undefined {
  return Platform.OS === 'android' ? NativeModules.NoorAdhan : undefined;
}

/** Only used if the native player is missing (it has its own channels). */
const ADHAN_CHANNELS = [
  {
    id: CHANNELS.adhan,
    name: 'Adhan',
    description: 'Full adhan for Dhuhr, Asr, Maghrib and Isha',
    sound: 'adhan', // res/raw/adhan.mp3
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
  },
  {
    id: CHANNELS.fajr,
    name: 'Fajr adhan',
    description: 'Fajr adhan, with “as-salatu khayrun min an-nawm”',
    sound: 'adhan_fajr', // res/raw/adhan_fajr.mp3
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
  },
];

export async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  const native = !!nativeAdhan();
  if (native) {
    // Remove the old adhan sound channels from earlier versions.
    await Promise.all(
      [CHANNELS.adhan, CHANNELS.fajr].map(id => notifee.deleteChannel(id)),
    );
  }
  await notifee.createChannels([
    ...(native ? [] : ADHAN_CHANNELS),
    {
      id: CHANNELS.beep,
      name: 'Prayer time alerts',
      description: 'A short sound when a prayer time begins',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
    },
    {
      id: CHANNELS.reminder,
      name: 'Prayer reminders',
      description: 'A heads-up before each prayer',
      sound: 'default',
      importance: AndroidImportance.DEFAULT,
    },
    {
      id: CHANNELS.friday,
      name: 'Friday reminders',
      description: "Jumu'ah Mubarak, and a reminder to send Durood",
      sound: 'default',
      importance: AndroidImportance.DEFAULT,
    },
  ]);
}

export type AdhanPermission = {
  notifications: boolean;
  /** Android 12+: "Alarms & reminders" — needed for on-the-minute alerts. */
  exactAlarms: boolean;
};

function toPermission(
  s: Awaited<ReturnType<typeof notifee.getNotificationSettings>>,
): AdhanPermission {
  return {
    notifications: s.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
    exactAlarms:
      Platform.OS !== 'android' ||
      s.android.alarm !== AndroidNotificationSetting.DISABLED,
  };
}

export async function getAdhanPermission(): Promise<AdhanPermission> {
  return toPermission(await notifee.getNotificationSettings());
}

export async function requestAdhanPermission(): Promise<AdhanPermission> {
  return toPermission(await notifee.requestPermission());
}

export const openExactAlarmSettings = () =>
  notifee.openAlarmPermissionSettings();
export const openNotificationSettings = () =>
  notifee.openNotificationSettings();

export type PlannedAlert = {
  id: string;
  kind: 'adhan' | 'beep' | 'reminder' | 'sunrise' | 'sehri' | 'durood';
  /** The Friday Durood reminder uses 'dhuhr' (the day of Jumu'ah). */
  prayer: SalahKey | 'sunrise';
  /** Dhuhr on a Friday, announced as Jumu'ah. */
  jumuah?: boolean;
  /** When to fire (UTC ms). */
  at: number;
  /** Local prayer time (hours) shown in the text. */
  hours: number;
  /** Sehri reminders: minutes before Fajr. */
  minutes?: number;
};

export type ScheduleInput = {
  place: Place;
  method: MethodId;
  madhab: Madhab;
  settings: NotifySettings;
  days?: number;
  now?: number;
  /** Hijri adjustment, to know which days are in Ramadan. */
  hijriAdjust?: number;
};

/** Local time at a place (hours, may exceed 24) → UTC timestamp. */
export function localToUtcMs({ y, m, d }: YMD, hours: number, offset: number) {
  return Date.UTC(y, m - 1, d) + (hours - offset) * 3600000;
}

/** Works out every alert to schedule (pure; unit-tested). */
export function planAlerts(input: ScheduleInput): PlannedAlert[] {
  const { place, method, madhab, settings } = input;
  if (!settings.enabled) return [];
  const now = input.now ?? Date.now();
  const days = input.days ?? SCHEDULE_DAYS;
  const today = placeNow(place, now);
  const plan: PlannedAlert[] = [];
  const future = (at: number) => at > now + 5000;

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const offset = offsetOn(place, date);
    const times = calculatePrayerTimes(date, place, offset, method, madhab);
    const key = dateKey(date);
    const friday = isFriday(date);

    for (const k of SALAH_KEYS as SalahKey[]) {
      const mode = settings.modes[k];
      if (mode === 'off') continue;
      const at = localToUtcMs(date, times[k], offset);
      const jumuah = friday && k === 'dhuhr' ? { jumuah: true } : {};
      if (future(at)) {
        plan.push({
          id: `adhan-${key}-${k}`,
          kind: mode,
          prayer: k,
          at,
          hours: times[k],
          ...jumuah,
        });
      }
      if (settings.reminderMinutes > 0) {
        const r = at - settings.reminderMinutes * 60000;
        if (future(r)) {
          plan.push({
            id: `remind-${key}-${k}`,
            kind: 'reminder',
            prayer: k,
            at: r,
            hours: times[k],
            ...jumuah,
          });
        }
      }
    }
    // Ramadan: a reminder before Sehri ends (Fajr).
    if (settings.sehriMinutes > 0 && isRamadan(date, input.hijriAdjust)) {
      const at =
        localToUtcMs(date, times.fajr, offset) - settings.sehriMinutes * 60000;
      if (future(at)) {
        plan.push({
          id: `sehri-${key}`,
          kind: 'sehri',
          prayer: 'fajr',
          at,
          hours: times.fajr,
          minutes: settings.sehriMinutes,
        });
      }
    }
    if (settings.sunrise) {
      const at = localToUtcMs(date, times.sunrise, offset);
      if (future(at)) {
        plan.push({
          id: `sunrise-${key}`,
          kind: 'sunrise',
          prayer: 'sunrise',
          at,
          hours: times.sunrise,
        });
      }
    }
  }
  // Fridays: Jumu'ah Mubarak, and a reminder to send Durood. Looks one day
  // further ahead, so next Friday's is queued even on a Friday afternoon.
  if (settings.durood) {
    for (let i = 0; i <= days; i++) {
      const date = addDays(today, i);
      if (!isFriday(date)) continue;
      const at = localToUtcMs(date, DUROOD_HOUR, offsetOn(place, date));
      if (future(at)) {
        plan.push({
          id: `durood-${dateKey(date)}`,
          kind: 'durood',
          prayer: 'dhuhr',
          at,
          hours: DUROOD_HOUR,
        });
      }
    }
  }
  plan.sort((a, b) => a.at - b.at);
  return Platform.OS === 'ios' ? plan.slice(0, IOS_LIMIT) : plan;
}

function channelFor(a: PlannedAlert) {
  if (a.kind === 'adhan')
    return a.prayer === 'fajr' ? CHANNELS.fajr : CHANNELS.adhan;
  if (a.kind === 'reminder') return CHANNELS.reminder;
  if (a.kind === 'durood') return CHANNELS.friday;
  return CHANNELS.beep;
}

const DUROOD_BODY =
  "Send abundant Durood upon the Prophet ﷺ today, as he asked us to on Fridays. Allahumma salli 'ala Muhammad wa 'ala ali Muhammad.";

export function buildNotification(
  a: PlannedAlert,
  place: Place,
  reminderMinutes: number,
): Notification {
  const time = formatTime(a.hours);
  let title: string;
  let body: string;
  if (a.kind === 'durood') {
    title = "Jumu'ah Mubarak · جمعة مباركة";
    body = DUROOD_BODY;
  } else if (a.kind === 'sehri') {
    title = `Sehri ends in ${a.minutes} minutes`;
    body = `Fajr (end of Sehri) is at ${time} in ${place.name}.`;
  } else if (a.prayer === 'sunrise') {
    title = 'Sunrise · الشروق';
    body = `The sun rises at ${time} in ${place.name}. Fajr time has ended.`;
  } else {
    const label = a.jumuah ? JUMUAH_LABEL : PRAYER_LABELS[a.prayer];
    if (a.kind === 'reminder') {
      title = `${label.en} in ${reminderMinutes} minutes`;
      body = `${label.en} begins at ${time} in ${place.name}.`;
    } else {
      title = `${label.en} · ${label.ar}`;
      body = `It's time for ${label.en} in ${place.name} (${time}).`;
    }
  }
  const isAdhan = a.kind === 'adhan';
  // Sehri reminders wake people up, so they're treated like an alarm.
  const isAlarm = isAdhan || a.kind === 'sehri';
  return {
    id: a.id,
    title,
    body,
    data: { prayer: a.prayer, kind: a.kind },
    android: {
      channelId: channelFor(a),
      category: isAlarm ? AndroidCategory.ALARM : AndroidCategory.REMINDER,
      importance:
        a.kind === 'reminder' || a.kind === 'durood'
          ? AndroidImportance.DEFAULT
          : AndroidImportance.HIGH,
      color: '#A23E5C',
      timestamp: a.at,
      showTimestamp: true,
      autoCancel: true,
      pressAction: { id: 'default', launchActivity: 'default' },
      // Dismissing the notification stops its sound; this makes it one tap.
      actions: isAdhan
        ? [{ title: 'Stop adhan', pressAction: { id: 'stop' } }]
        : undefined,
      // The Durood reminder is longer than one line, so it can expand.
      style:
        a.kind === 'durood'
          ? { type: AndroidStyle.BIGTEXT, text: body }
          : undefined,
    },
    ios: { sound: 'default' },
  };
}

function triggerAt(at: number, exact: boolean): TimestampTrigger {
  return {
    type: TriggerType.TIMESTAMP,
    timestamp: at,
    alarmManager: {
      // Exact alarms fire on the minute even in Doze; without the permission
      // Android may delay them slightly.
      type: exact
        ? AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE
        : AlarmType.SET_AND_ALLOW_WHILE_IDLE,
    },
  };
}

/** Replaces all scheduled prayer alerts. Returns how many were scheduled. */
export async function scheduleAlerts(input: ScheduleInput): Promise<number> {
  const existing = await notifee.getTriggerNotificationIds();
  const ours = existing.filter(id => PREFIXES.some(p => id.startsWith(p)));
  if (ours.length) await notifee.cancelTriggerNotifications(ours);

  const plan = planAlerts(input);
  const native = nativeAdhan();
  // On Android the full adhan goes to the native player; the rest to notifee.
  const toNative = native ? plan.filter(a => a.kind === 'adhan') : [];
  const toNotifee = native ? plan.filter(a => a.kind !== 'adhan') : plan;

  if (native) {
    await native.schedule(
      toNative.map(a => {
        const n = buildNotification(a, input.place, 0);
        return {
          id: a.id,
          at: a.at,
          fajr: a.prayer === 'fajr',
          title: n.title ?? '',
          body: n.body ?? '',
          sound: adhanSound(a.prayer === 'fajr', input.settings.adhanLength),
        };
      }),
    );
  }
  if (!toNotifee.length) return plan.length;
  await ensureChannels();
  const { exactAlarms } = await getAdhanPermission();
  for (const a of toNotifee) {
    await notifee.createTriggerNotification(
      buildNotification(a, input.place, input.settings.reminderMinutes),
      triggerAt(a.at, exactAlarms),
    );
  }
  return plan.length;
}

export async function cancelAllAlerts() {
  await nativeAdhan()?.cancelAll();
  const ids = await notifee.getTriggerNotificationIds();
  const ours = ids.filter(id => PREFIXES.some(p => id.startsWith(p)));
  if (ours.length) await notifee.cancelTriggerNotifications(ours);
}

/** Plays a real adhan alert in a few seconds, exactly as scheduled ones do. */
export async function sendTestAdhan(
  place: Place,
  fajr = false,
  length: AdhanLength = 'short',
  seconds = 5,
) {
  await ensureChannels();
  const { exactAlarms } = await getAdhanPermission();
  const at = Date.now() + seconds * 1000;
  const n = buildNotification(
    {
      id: 'test-adhan',
      kind: 'adhan',
      prayer: fajr ? 'fajr' : 'dhuhr',
      at,
      hours: 0,
    },
    place,
    0,
  );
  n.title = fajr ? 'Test · Fajr adhan' : 'Test · Adhan';
  n.body = 'This is how the adhan will sound at prayer time.';
  const native = nativeAdhan();
  if (native) {
    await native.test(
      fajr,
      adhanSound(fajr, length),
      seconds * 1000,
      n.title,
      n.body,
    );
    return;
  }
  await notifee.createTriggerNotification(n, triggerAt(at, exactAlarms));
}

/** Notification button handler (foreground and background). */
export async function handleAdhanEvent({ type, detail }: Event) {
  if (
    type === EventType.ACTION_PRESS &&
    detail.pressAction?.id === 'stop' &&
    detail.notification?.id
  ) {
    await notifee.cancelNotification(detail.notification.id);
  }
}
