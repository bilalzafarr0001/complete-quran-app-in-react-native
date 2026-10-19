/**
 * Offline prayer-time calculation based on the solar position formulas
 * popularised by PrayTimes.org. Accuracy is typically within a minute or two.
 */

export type MethodId =
  | 'mwl'
  | 'karachi'
  | 'makkah'
  | 'egypt'
  | 'isna'
  | 'gulf'
  | 'sea';
export type Madhab = 'standard' | 'hanafi';

type Method = {
  name: string;
  fajr: number;
  isha?: number;
  ishaMinutes?: number;
};

export const METHODS: Record<MethodId, Method> = {
  mwl: { name: 'Muslim World League', fajr: 18, isha: 17 },
  karachi: { name: 'Univ. of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  makkah: { name: 'Umm al-Qura, Makkah', fajr: 18.5, ishaMinutes: 90 },
  egypt: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  isna: { name: 'ISNA (North America)', fajr: 15, isha: 15 },
  gulf: { name: 'Gulf Region', fajr: 19.5, ishaMinutes: 90 },
  sea: { name: 'Southeast Asia (JAKIM, MUIS, Kemenag)', fajr: 20, isha: 18 },
};

export const PRAYER_KEYS = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];
export const SALAH_KEYS: PrayerKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

export const PRAYER_LABELS: Record<PrayerKey, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
};

/** Hours (0–24, local time at the location) for each prayer. */
export type PrayerTimes = Record<PrayerKey, number>;

export type YMD = { y: number; m: number; d: number };
export type Coords = { lat: number; lng: number };

// ---------- math helpers (degrees) ----------
const dtr = (d: number) => (d * Math.PI) / 180;
const rtd = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(dtr(d));
const cos = (d: number) => Math.cos(dtr(d));
const tan = (d: number) => Math.tan(dtr(d));
const arcsin = (x: number) => rtd(Math.asin(x));
const arccos = (x: number) => rtd(Math.acos(x));
const arctan2 = (y: number, x: number) => rtd(Math.atan2(y, x));
const arccot = (x: number) => rtd(Math.atan(1 / x));
const fix = (a: number, b: number) => {
  const r = a - b * Math.floor(a / b);
  return r < 0 ? r + b : r;
};
const fixAngle = (a: number) => fix(a, 360);
export const fixHour = (a: number) => fix(a, 24);
const timeDiff = (a: number, b: number) => fixHour(b - a);

function julian({ y, m, d }: YMD) {
  let year = y;
  let month = m;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    d +
    B -
    1524.5
  );
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
}

// ---------- calculation ----------
/**
 * @param tz UTC offset in hours at the location on that date (DST included).
 */
export function calculatePrayerTimes(
  date: YMD,
  { lat, lng }: Coords,
  tz: number,
  methodId: MethodId,
  madhab: Madhab,
): PrayerTimes {
  const method = METHODS[methodId];
  const jDate = julian(date) - lng / (15 * 24);

  const midDay = (t: number) => fixHour(12 - sunPosition(jDate + t).eqt);
  const sunAngleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jDate + t);
    const noon = midDay(t);
    const T =
      arccos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) /
      15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const { decl } = sunPosition(jDate + t);
    const angle = -arccot(factor + tan(Math.abs(lat - decl)));
    return sunAngleTime(angle, t, false);
  };

  const adjust = tz - lng / 15;
  let fajr = sunAngleTime(method.fajr, 5 / 24, true) + adjust;
  const sunrise = sunAngleTime(0.833, 6 / 24, true) + adjust;
  const dhuhr = midDay(12 / 24) + adjust;
  const asr = asrTime(madhab === 'hanafi' ? 2 : 1, 13 / 24) + adjust;
  const sunset = sunAngleTime(0.833, 18 / 24, false) + adjust;
  let isha =
    method.ishaMinutes !== undefined
      ? sunset + method.ishaMinutes / 60
      : sunAngleTime(method.isha ?? 17, 18 / 24, false) + adjust;

  // High-latitude safety net (angle-based rule): keeps Fajr/Isha sensible
  // in places like London during summer when twilight never fully ends.
  const night = timeDiff(sunset, sunrise);
  const fajrPortion = (method.fajr / 60) * night;
  if (Number.isNaN(fajr) || timeDiff(fajr, sunrise) > fajrPortion) {
    fajr = sunrise - fajrPortion;
  }
  if (method.ishaMinutes === undefined) {
    const ishaPortion = ((method.isha ?? 17) / 60) * night;
    if (Number.isNaN(isha) || timeDiff(sunset, isha) > ishaPortion) {
      isha = sunset + ishaPortion;
    }
  }

  // Keep the day's times in order. Near the poles Isha can fall after midnight
  // (kept as e.g. 24.2 = 12:12 AM) and Fajr before it (negative hours).
  const times = [fajr, sunrise, dhuhr, asr, sunset, isha].map(fixHour);
  if (times[0] > times[1]) times[0] -= 24;
  for (let i = 2; i < times.length; i++) {
    if (times[i] < times[i - 1]) times[i] += 24;
  }
  return {
    fajr: times[0],
    sunrise: times[1],
    dhuhr: times[2],
    asr: times[3],
    maghrib: times[4],
    isha: times[5],
  };
}

export function addDays({ y, m, d }: YMD, days: number): YMD {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Current local date and time (hours) at a location. */
export type LocalNow = YMD & { hours: number; weekday: number };

export type PrayerStatus = {
  current: PrayerKey;
  next: PrayerKey;
  /** Hours from now until the next prayer. */
  remaining: number;
  /** 0–1 progress between current and next prayer. */
  progress: number;
  nextTime: number;
};

/** Works out the current / next salah for a moment in time. */
export function prayerStatus(
  now: LocalNow,
  today: PrayerTimes,
  tomorrow: PrayerTimes,
  yesterday: PrayerTimes,
): PrayerStatus {
  const h = now.hours;
  const upcoming = SALAH_KEYS.find(k => today[k] > h);

  let next: PrayerKey;
  let nextTime: number;
  if (upcoming) {
    next = upcoming;
    nextTime = today[upcoming];
  } else {
    next = 'fajr';
    nextTime = tomorrow.fajr + 24;
  }

  const passed = SALAH_KEYS.filter(k => today[k] <= h);
  let current: PrayerKey;
  let prevTime: number;
  if (passed.length) {
    current = passed[passed.length - 1];
    prevTime = today[current];
  } else {
    current = 'isha';
    prevTime = yesterday.isha - 24;
  }

  const span = nextTime - prevTime;
  return {
    current,
    next,
    nextTime,
    remaining: nextTime - h,
    progress: span > 0 ? Math.min(1, Math.max(0, (h - prevTime) / span)) : 0,
  };
}

// ---------- formatting ----------
export function formatTime(hours: number, withPeriod = true): string {
  const total = Math.round(fixHour(hours) * 60) % 1440;
  const h24 = Math.floor(total / 60);
  const min = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = min < 10 ? `0${min}` : `${min}`;
  return withPeriod ? `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}` : `${h12}:${mm}`;
}

export function formatCountdown(hours: number): string {
  const totalSec = Math.max(0, Math.floor(hours * 3600));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
