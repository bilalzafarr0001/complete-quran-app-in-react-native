import type { Place } from '../data/places';
import type { LocalNow, YMD } from './prayerTimes';

const formatters: Record<string, Intl.DateTimeFormat | null> = {};

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  if (!(timeZone in formatters)) {
    try {
      formatters[timeZone] = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      formatters[timeZone] = null;
    }
  }
  return formatters[timeZone];
}

/**
 * UTC offset (hours) of an IANA time zone at a given instant, or null if the
 * JS engine can't resolve time zones.
 */
export function zoneOffsetAt(timeZone: string, utcMs: number): number | null {
  const fmt = formatterFor(timeZone);
  if (!fmt || typeof fmt.formatToParts !== 'function') return null;
  try {
    const parts: Record<string, number> = {};
    for (const p of fmt.formatToParts(new Date(utcMs))) {
      if (p.type !== 'literal') parts[p.type] = Number(p.value);
    }
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour % 24,
      parts.minute,
    );
    const offset = (asUtc - Math.floor(utcMs / 60000) * 60000) / 3600000;
    if (!Number.isFinite(offset) || Math.abs(offset) > 14) return null;
    return Math.round(offset * 4) / 4; // offsets are multiples of 15 min
  } catch {
    return null;
  }
}

/** UTC offset (hours) for a place at a given instant — handles daylight saving. */
export function offsetAt(place: Place, utcMs: number): number {
  if (place.timeZone) {
    const o = zoneOffsetAt(place.timeZone, utcMs);
    if (o !== null) return o;
  }
  if (place.source === 'gps') {
    // The phone is physically there, so its own clock zone is the best guess.
    return -new Date(utcMs).getTimezoneOffset() / 60;
  }
  return place.utcOffset;
}

/** UTC offset (hours) for a place on a local calendar date (taken at local noon). */
export function offsetOn(place: Place, { y, m, d }: YMD): number {
  const guess = Date.UTC(y, m - 1, d, 12) - place.utcOffset * 3600000;
  return offsetAt(place, guess);
}

/** Current local date and time at a place. */
export function placeNow(place: Place, nowMs = Date.now()): LocalNow {
  const offset = offsetAt(place, nowMs);
  const local = new Date(nowMs + offset * 3600000);
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth() + 1,
    d: local.getUTCDate(),
    weekday: local.getUTCDay(),
    hours:
      local.getUTCHours() +
      local.getUTCMinutes() / 60 +
      local.getUTCSeconds() / 3600,
  };
}

export function formatOffset(hours: number) {
  const sign = hours < 0 ? '−' : '+';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? `:${m < 10 ? `0${m}` : m}` : ''}`;
}
