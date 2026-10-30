import type { YMD } from './prayerTimes';

/** The kinds of sky the Today pages paint (no text: the sky itself shows it). */
export type SkyWeather =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

/** WMO weather codes (as reported by Open-Meteo) → the sky to paint. */
export function skyWeather(code: number): SkyWeather {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'partly';
}

/** Hourly weather codes in the place's local time ("2026-10-30T13:00"). */
export type Forecast = { time: string[]; code: (number | null)[] };

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * The sky for the hour nearest a local time at the place. `hours` may run
 * past midnight either way (e.g. -0.5 = 11:30 PM the day before).
 */
export function forecastAt(
  f: Forecast,
  day: YMD,
  hours: number,
): SkyWeather | null {
  const t = new Date(
    Date.UTC(day.y, day.m - 1, day.d) + Math.round(hours) * 3600000,
  );
  const key = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(
    t.getUTCDate(),
  )}T${pad(t.getUTCHours())}:00`;
  const i = f.time.indexOf(key);
  const code = i >= 0 ? f.code[i] : null;
  return code === null || code === undefined ? null : skyWeather(code);
}
