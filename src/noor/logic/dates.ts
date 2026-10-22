import type { YMD } from './prayerTimes';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function weekdayOf({ y, m, d }: YMD) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatGregorian(date: YMD, withWeekday = true) {
  const base = `${date.d} ${MONTHS[date.m - 1]} ${date.y}`;
  return withWeekday ? `${WEEKDAYS[weekdayOf(date)]}, ${base}` : base;
}

export function dateKey({ y, m, d }: YMD) {
  return `${y}-${m}-${d}`;
}

/** Stable index for "of the day" content. */
export function dayIndex({ y, m, d }: YMD) {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
