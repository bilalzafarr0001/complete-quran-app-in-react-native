import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Place } from '../data/places';
import type { Coords } from '../logic/prayerTimes';
import { zoneOffsetAt } from '../logic/timezone';
import { fetchJson } from './http';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true, // we ask ourselves, with our own UI
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
  enableBackgroundLocationUpdates: false,
});

export type LocationErrorCode = 'denied' | 'unavailable' | 'timeout';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

/** True if the app may already read the location (never shows a prompt). */
export async function hasLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return (
      (await PermissionsAndroid.check(COARSE)) ||
      (await PermissionsAndroid.check(FINE))
    );
  }
  // iOS: only query, the prompt is shown by requestLocationPermission().
  return true;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
    return res[FINE] === 'granted' || res[COARSE] === 'granted';
  }
  return new Promise(resolve =>
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    ),
  );
}

function getPosition(highAccuracy: boolean, timeout: number): Promise<Coords> {
  return new Promise((resolve, reject) =>
    Geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => reject(e),
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 10 * 60 * 1000,
      },
    ),
  );
}

function toLocationError(e: unknown): LocationError {
  const code = (e as { code?: number })?.code;
  if (code === 1)
    return new LocationError('denied', 'Location permission was denied.');
  if (code === 3)
    return new LocationError('timeout', 'Finding your location took too long.');
  return new LocationError(
    'unavailable',
    'Location is unavailable. Check that location services are on.',
  );
}

/**
 * Current coordinates. A quick network fix and precise GPS run side by side;
 * whichever answers first wins (indoors GPS is slow, outdoors network may be off).
 */
export function getCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    let failures = 0;
    let firstError: unknown;
    const fail = (e: unknown) => {
      firstError = firstError ?? e;
      if ((e as { code?: number })?.code === 1 || ++failures === 2) {
        reject(toLocationError(firstError));
      }
    };
    getPosition(false, 15000).then(resolve, fail);
    getPosition(true, 25000).then(resolve, fail);
  });
}

type ReverseResult = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
};

export async function reverseGeocode({ lat, lng }: Coords) {
  const r = await fetchJson<ReverseResult>(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
  );
  return {
    name: r.city || r.locality || r.principalSubdivision || '',
    region: r.principalSubdivision || undefined,
    country: r.countryName ?? '',
    countryCode: r.countryCode ?? '',
  };
}

type ZoneResult = { timezone?: string; utc_offset_seconds?: number };

export async function lookupTimeZone({ lat, lng }: Coords) {
  const r = await fetchJson<ZoneResult>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto&forecast_days=1`,
  );
  return {
    timeZone: r.timezone,
    utcOffset: (r.utc_offset_seconds ?? 0) / 3600,
  };
}

/**
 * Detects where the user is: GPS position, then city name and time zone.
 * Works offline too (falls back to coordinates + the phone's time zone).
 */
export async function detectPlace(): Promise<Place> {
  const coords = await getCoords();
  const [geo, zone] = await Promise.all([
    reverseGeocode(coords).catch(() => null),
    lookupTimeZone(coords).catch(() => null),
  ]);
  return {
    name: geo?.name || 'Current location',
    region: geo?.region,
    country: geo?.country ?? '',
    countryCode: geo?.countryCode ?? '',
    lat: coords.lat,
    lng: coords.lng,
    timeZone: zone?.timeZone,
    utcOffset: zone?.utcOffset ?? -new Date().getTimezoneOffset() / 60,
    source: 'gps',
  };
}

type SearchResult = {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }[];
};

/** Worldwide city search (Open-Meteo geocoding). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetchJson<SearchResult>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q,
    )}&count=10&language=en&format=json`,
  );
  return (r.results ?? []).map(x => ({
    name: x.name,
    region: x.admin1,
    country: x.country ?? '',
    countryCode: x.country_code ?? '',
    lat: x.latitude,
    lng: x.longitude,
    timeZone: x.timezone,
    utcOffset: x.timezone ? zoneOffsetAt(x.timezone, Date.now()) ?? 0 : 0,
    source: 'search' as const,
  }));
}

/** Makes sure a searched place has a usable UTC offset. */
export async function resolvePlace(place: Place): Promise<Place> {
  if (place.timeZone && zoneOffsetAt(place.timeZone, Date.now()) !== null) {
    return place;
  }
  try {
    const zone = await lookupTimeZone(place);
    return {
      ...place,
      timeZone: zone.timeZone ?? place.timeZone,
      utcOffset: zone.utcOffset,
    };
  } catch {
    return place;
  }
}

/** Distance between two points in km (haversine). */
export function distanceKm(a: Coords, b: Coords) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
