import { weekdayOf } from './dates';
import { PRAYER_LABELS, PrayerKey, YMD } from './prayerTimes';

/** On Fridays the Dhuhr prayer is Jumu'ah (same time: it begins at Dhuhr). */
export const JUMUAH_LABEL = { en: "Jumu'ah", ar: 'الجمعة' };

export const isFriday = (date: YMD) => weekdayOf(date) === 5;

/** A prayer's name on a given day: Dhuhr is called Jumu'ah on Fridays. */
export function prayerLabel(key: PrayerKey, date: YMD) {
  return key === 'dhuhr' && isFriday(date) ? JUMUAH_LABEL : PRAYER_LABELS[key];
}

/** Friday's Durood reminder goes out at this local time (hours). */
export const DUROOD_HOUR = 10;
