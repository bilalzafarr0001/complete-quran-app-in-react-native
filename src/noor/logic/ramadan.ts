import { toHijri } from './hijri';
import type { NotifySettings } from '../store';
import { addDays, PrayerTimes, YMD } from './prayerTimes';

const RAMADAN = 9;

export type RamadanDay = { date: YMD; day: number };

export type RamadanInfo = {
  /** Hijri year of this Ramadan. */
  year: number;
  /** Today's day of Ramadan (1–30), or null if Ramadan hasn't started. */
  today: number | null;
  /** Days until the 1st of Ramadan (0 while it's Ramadan). */
  daysUntil: number;
  /** Every day of the month, in order. */
  days: RamadanDay[];
};

/**
 * The Ramadan happening now, or the next one, on the app's Hijri calendar
 * (`hijriAdjust` follows the official sync and the user's moon-sighting tweak).
 */
export function ramadanFor(today: YMD, hijriAdjust = 0): RamadanInfo {
  const h = toHijri(today, hijriAdjust);
  let start = today;
  let daysUntil = 0;
  if (h.month === RAMADAN) {
    start = addDays(today, 1 - h.day);
  } else {
    // At most a year away.
    for (daysUntil = 1; daysUntil <= 400; daysUntil++) {
      start = addDays(today, daysUntil);
      const x = toHijri(start, hijriAdjust);
      if (x.month === RAMADAN && x.day === 1) break;
    }
  }
  const days: RamadanDay[] = [];
  for (let i = 0; i < 31; i++) {
    const date = addDays(start, i);
    const x = toHijri(date, hijriAdjust);
    if (x.month !== RAMADAN) break;
    days.push({ date, day: x.day });
  }
  return {
    year: toHijri(start, hijriAdjust).year,
    today: h.month === RAMADAN ? h.day : null,
    daysUntil,
    days,
  };
}

/** True if the date falls in Ramadan on the app's Hijri calendar. */
export function isRamadan(date: YMD, hijriAdjust = 0) {
  return toHijri(date, hijriAdjust).month === RAMADAN;
}

export type FastEvent = {
  kind: 'sehri' | 'iftar';
  /** Local hours; above 24 means tomorrow. */
  at: number;
};

/**
 * The next fasting moment during Ramadan: Sehri ends at Fajr, Iftar is at
 * Maghrib. After Iftar it's tomorrow's Sehri, or null on the last day.
 */
export function nextFastEvent(
  hours: number,
  today: PrayerTimes,
  tomorrow: PrayerTimes,
  tomorrowIsRamadan: boolean,
): FastEvent | null {
  if (hours < today.fajr) return { kind: 'sehri', at: today.fajr };
  if (hours < today.maghrib) return { kind: 'iftar', at: today.maghrib };
  return tomorrowIsRamadan ? { kind: 'sehri', at: tomorrow.fajr + 24 } : null;
}

/** "21st", "22nd", "23rd", "24th"… */
export function ordinal(n: number) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * Laylat al-Qadr is sought in the odd nights of the last ten. The 21st night
 * begins at Maghrib on the 20th day, so this returns 21 for day 20, etc.
 */
export function oddNightAfter(day: number): number | null {
  const night = day + 1;
  return night >= 21 && night <= 29 && night % 2 === 1 ? night : null;
}

/** Choices for the Sehri reminder (minutes before Fajr, on Ramadan days). */
export const SEHRI_OPTIONS: {
  value: NotifySettings['sehriMinutes'];
  label: string;
}[] = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
];
