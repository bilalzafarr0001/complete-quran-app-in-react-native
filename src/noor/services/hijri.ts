import { toHijri } from '../logic/hijri';
import type { YMD } from '../logic/prayerTimes';
import { fetchJson } from './http';

type GToHResponse = {
  data: { hijri: { day: string; month: { number: number }; year: string } };
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Official Hijri date for a Gregorian date (AlAdhan API). */
export async function fetchHijri({ y, m, d }: YMD) {
  const r = await fetchJson<GToHResponse>(
    `https://api.aladhan.com/v1/gToH/${pad(d)}-${pad(m)}-${y}`,
  );
  return {
    day: Number(r.data.hijri.day),
    month: r.data.hijri.month.number,
    year: Number(r.data.hijri.year),
  };
}

/**
 * How many days the on-device (arithmetical) calendar must shift to match
 * the official date, so other days can be converted offline.
 */
export async function syncHijriAdjustment(date: YMD): Promise<number | null> {
  const official = await fetchHijri(date);
  for (const adj of [0, 1, -1, 2, -2]) {
    const h = toHijri(date, adj);
    if (
      h.day === official.day &&
      h.month === official.month &&
      h.year === official.year
    ) {
      return adj;
    }
  }
  return null;
}
