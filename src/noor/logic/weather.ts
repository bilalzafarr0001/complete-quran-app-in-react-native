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

/**
 * Hourly weather in the place's local time ("2026-10-30T13:00"): condition
 * codes and cloud cover (%).
 */
export type Forecast = {
  time: string[];
  code: (number | null)[];
  cloud?: (number | null)[];
};

/** The sky at one hour: its kind and cloud cover (%). */
export type SkyNow = { weather: SkyWeather; cloud: number | null };

/** Typical cloud cover for a kind of sky (when the exact % is unknown). */
const TYPICAL_CLOUD: Record<SkyWeather, number> = {
  clear: 0.05,
  partly: 0.4,
  cloudy: 0.85,
  fog: 0.6,
  drizzle: 0.8,
  rain: 0.9,
  snow: 0.85,
  storm: 1,
};

/** How much cloud to draw: 0 (none) to 1 (a sky full of heavy cloud). */
export function cloudiness(s: SkyNow): number {
  return s.cloud === null
    ? TYPICAL_CLOUD[s.weather]
    : Math.min(1, Math.max(0, s.cloud / 100));
}

/**
 * How sunny it is (0–1): a clear sky with little cloud is fully sunny,
 * partly cloudy a little, anything cloudier (or wet or hazy) not at all.
 */
export function sunshine(s: SkyNow | null): number {
  if (!s || (s.weather !== 'clear' && s.weather !== 'partly')) return 0;
  return Math.min(1, Math.max(0, 1 - cloudiness(s) / 0.6));
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * The sky for the hour nearest a local time at the place. `hours` may run
 * past midnight either way (e.g. -0.5 = 11:30 PM the day before).
 */
export function forecastAt(
  f: Forecast,
  day: YMD,
  hours: number,
): SkyNow | null {
  const t = new Date(
    Date.UTC(day.y, day.m - 1, day.d) + Math.round(hours) * 3600000,
  );
  const key = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(
    t.getUTCDate(),
  )}T${pad(t.getUTCHours())}:00`;
  const i = f.time.indexOf(key);
  const code = i >= 0 ? f.code[i] : null;
  if (code === null || code === undefined) return null;
  return { weather: skyWeather(code), cloud: f.cloud?.[i] ?? null };
}
