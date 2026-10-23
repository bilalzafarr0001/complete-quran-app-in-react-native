import { useMemo } from 'react';
import { DEFAULT_PLACE } from '../data/places';
import { toHijri } from '../logic/hijri';
import {
  addDays,
  calculatePrayerTimes,
  prayerStatus,
  YMD,
} from '../logic/prayerTimes';
import { offsetOn, placeNow } from '../logic/timezone';
import { useStore } from '../store';
import { useNow } from './useNow';

/** The place prayer times are calculated for (falls back to Makkah). */
export function usePlace() {
  const { state } = useStore();
  const place = state.place ?? DEFAULT_PLACE;
  return { place, isDefault: !state.place };
}

/** Total Hijri adjustment (official sync + the user's manual tweak). */
export function useHijriAdjust() {
  const { state } = useStore();
  return state.hijriAuto + state.hijriOffset;
}

/**
 * Prayer information for the user's location.
 *
 * Screens refresh this slowly (every few seconds); the per-second countdown
 * lives in <RollingCountdown>, so whole screens don't re-render every tick.
 */
export function usePrayerData(intervalMs = 15000) {
  const { state } = useStore();
  const { place, isDefault } = usePlace();
  const hijriAdjust = useHijriAdjust();
  const [nowMs, refresh] = useNow(intervalMs);
  const now = placeNow(place, nowMs);
  const dayKey = `${now.y}-${now.m}-${now.d}`;
  const placeKey = `${place.lat},${place.lng},${place.timeZone}`;

  const days = useMemo(() => {
    const today: YMD = { y: now.y, m: now.m, d: now.d };
    const calc = (d: YMD) =>
      calculatePrayerTimes(
        d,
        place,
        offsetOn(place, d),
        state.method,
        state.madhab,
      );
    return {
      date: today,
      today: calc(today),
      tomorrow: calc(addDays(today, 1)),
      yesterday: calc(addDays(today, -1)),
      hijri: toHijri(today, hijriAdjust),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, placeKey, state.method, state.madhab, hijriAdjust]);

  const status = prayerStatus(now, days.today, days.tomorrow, days.yesterday);
  /** Absolute timestamp (ms) of the next prayer. */
  const nextAt = nowMs + status.remaining * 3600000;

  return {
    place,
    isDefaultPlace: isDefault,
    hijriAdjust,
    now,
    ...days,
    status,
    nextAt,
    /** The current time (ms) these values were computed for. */
    nowMs,
    refresh,
  };
}
