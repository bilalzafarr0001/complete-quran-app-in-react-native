import type { Place } from '../data/places';
import type { Forecast } from '../logic/weather';
import { fetchJson } from './http';
import { readJson, writeJson } from './storage';

const CACHE_KEY = 'noor:weather:v2';

type OpenMeteoForecast = {
  hourly?: { time?: string[]; weather_code?: (number | null)[] };
};

type Cached = { lat: number; lng: number; at: number; forecast: Forecast };

/**
 * Hourly weather conditions from yesterday to the day after tomorrow at a
 * place (free Open-Meteo API, no key), in the place's own local time.
 */
export async function fetchForecast(place: Place): Promise<Forecast> {
  const zone = encodeURIComponent(place.timeZone ?? 'auto');
  const r = await fetchJson<OpenMeteoForecast>(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lng}&hourly=weather_code&timezone=${zone}&past_days=1&forecast_days=3`,
  );
  const h = r.hourly;
  if (!h?.time?.length || !h.weather_code?.length) {
    throw new Error('No forecast in the response');
  }
  return { time: h.time, code: h.weather_code };
}

const samePlace = (c: Cached, place: Place) =>
  Math.abs(c.lat - place.lat) < 0.05 && Math.abs(c.lng - place.lng) < 0.05;

/** The saved forecast for this place and how old it is (ms), if any. */
export async function cachedForecast(
  place: Place,
): Promise<{ forecast: Forecast; age: number } | null> {
  const c = await readJson<Cached>(CACHE_KEY);
  if (!c || !samePlace(c, place)) return null;
  return { forecast: c.forecast, age: Date.now() - c.at };
}

export function saveForecast(place: Place, forecast: Forecast) {
  return writeJson(CACHE_KEY, {
    lat: place.lat,
    lng: place.lng,
    at: Date.now(),
    forecast,
  });
}
