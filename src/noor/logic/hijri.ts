import type { YMD } from './prayerTimes';

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhul-Qa'dah",
  'Dhul-Hijjah',
];

export type HijriDate = {
  day: number;
  month: number;
  year: number;
  monthName: string;
};

/**
 * Tabular (arithmetical) Islamic calendar. It can differ from the
 * moon-sighting calendar used locally by a day or so.
 */
export function toHijri({ y, m, d }: YMD, adjustDays = 0): HijriDate {
  const jdn =
    Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588 + adjustDays;
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] };
}

export function formatHijri(h: HijriDate) {
  return `${h.day} ${h.monthName} ${h.year} AH`;
}
