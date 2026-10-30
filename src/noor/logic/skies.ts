import {
  addDays,
  DayPhase,
  PrayerKey,
  PrayerStatus,
  PrayerTimes,
  SALAH_KEYS,
  YMD,
} from './prayerTimes';

/**
 * "Five Skies": Today is one page per salah, each painted with the sky of
 * its time of day. This works out what each page shows.
 */

export type Salah = Exclude<PrayerKey, 'sunrise'>;

/** The sky each prayer's page is painted with. */
export const PRAYER_PHASE: Record<Salah, DayPhase> = {
  fajr: 'dawn',
  dhuhr: 'day',
  asr: 'afternoon',
  maghrib: 'dusk',
  isha: 'night',
};

/**
 * now   – its time has started and the next prayer hasn't
 * next  – the prayer coming up
 * past  – earlier today, already over
 * later – later today, after the next one
 */
export type PageState = 'now' | 'next' | 'past' | 'later';

export type PrayerPage = {
  key: Salah;
  state: PageState;
  /** Hours from today's midnight (negative = yesterday, ≥ 24 = tomorrow). */
  time: number;
  /** -1 = yesterday's (Isha before Fajr), 1 = tomorrow's (Fajr after Isha). */
  dayOffset: -1 | 0 | 1;
  /** The date this prayer belongs to (used to mark it as prayed). */
  day: YMD;
};

export function prayerPages(
  date: YMD,
  hours: number,
  today: PrayerTimes,
  status: PrayerStatus,
): PrayerPage[] {
  return (SALAH_KEYS as Salah[]).map(key => {
    let state: PageState;
    let time = today[key];
    let dayOffset: -1 | 0 | 1 = 0;
    if (key === status.next) {
      state = 'next';
      time = status.nextTime;
      // After Isha the next Fajr is tomorrow's.
      if (time !== today[key]) dayOffset = 1;
    } else if (key === status.current) {
      state = 'now';
      time = status.currentTime;
      // Before Fajr it is still Isha time from last night.
      if (time !== today[key]) dayOffset = -1;
    } else {
      state = today[key] <= hours ? 'past' : 'later';
    }
    return {
      key,
      state,
      time,
      dayOffset,
      day: dayOffset ? addDays(date, dayOffset) : date,
    };
  });
}

/**
 * The page Today opens on: the prayer whose time it is, unless it has been
 * marked as prayed (or none is due, after sunrise), then the next one.
 */
export function openingPage(
  pages: PrayerPage[],
  isPrayed: (page: PrayerPage) => boolean,
): number {
  const now = pages.findIndex(p => p.state === 'now');
  if (now >= 0 && !isPrayed(pages[now])) return now;
  const next = pages.findIndex(p => p.state === 'next');
  return next >= 0 ? next : 0;
}
