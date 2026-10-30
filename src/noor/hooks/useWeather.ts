import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Place } from '../data/places';
import type { Forecast } from '../logic/weather';
import {
  cachedForecast,
  fetchForecast,
  saveForecast,
} from '../services/weather';

/** Refetch when the saved forecast is older than this. */
const FRESH_MS = 30 * 60000;
/** Still worth showing (offline) up to this age. */
const KEEP_MS = 12 * 3600000;

/**
 * The hourly forecast for a place: the saved one straight away, refreshed in
 * the background when it's stale, the place changes or the app is reopened.
 * Null when there's none (offline on first run) — the sky then looks as usual.
 */
export function useWeather(place: Place): Forecast | null {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [resumed, setResumed] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setResumed(n => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await cachedForecast(place);
      if (!alive) return;
      setForecast(cached && cached.age < KEEP_MS ? cached.forecast : null);
      if (cached && cached.age < FRESH_MS) return;
      try {
        const fresh = await fetchForecast(place);
        if (!alive) return;
        setForecast(fresh);
        saveForecast(place, fresh);
      } catch {
        // Offline: keep whatever we had.
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.lat, place.lng, place.timeZone, place.countryCode, resumed]);

  return forecast;
}
