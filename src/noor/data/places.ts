import type { Madhab, MethodId } from '../logic/prayerTimes';

/** A location the user prays in — detected by GPS or found by search. */
export type Place = {
  name: string;
  region?: string;
  country: string;
  /** ISO 3166-1 alpha-2, e.g. "PK". */
  countryCode: string;
  lat: number;
  lng: number;
  /** IANA time zone, e.g. "Asia/Karachi" (used to handle daylight saving). */
  timeZone?: string;
  /** UTC offset in hours when the place was saved (fallback if time zone lookup fails). */
  utcOffset: number;
  source: 'gps' | 'search' | 'default';
};

/** Used only until the user's real location is known. */
export const DEFAULT_PLACE: Place = {
  name: 'Makkah',
  region: 'Makkah Province',
  country: 'Saudi Arabia',
  countryCode: 'SA',
  lat: 21.4225,
  lng: 39.8262,
  timeZone: 'Asia/Riyadh',
  utcOffset: 3,
  source: 'default',
};

const METHOD_BY_COUNTRY: Record<string, MethodId> = {
  PK: 'karachi',
  IN: 'karachi',
  BD: 'karachi',
  AF: 'karachi',
  NP: 'karachi',
  LK: 'karachi',
  SA: 'makkah',
  YE: 'makkah',
  AE: 'gulf',
  QA: 'gulf',
  KW: 'gulf',
  BH: 'gulf',
  OM: 'gulf',
  EG: 'egypt',
  SD: 'egypt',
  LY: 'egypt',
  SY: 'egypt',
  LB: 'egypt',
  JO: 'egypt',
  IQ: 'egypt',
  US: 'isna',
  CA: 'isna',
  MY: 'sea',
  SG: 'sea',
  ID: 'sea',
  BN: 'sea',
};

/** Countries where the Hanafi Asr time is the common default. */
const HANAFI_COUNTRIES = new Set([
  'PK',
  'IN',
  'BD',
  'AF',
  'TR',
  'UZ',
  'TJ',
  'TM',
  'KZ',
  'KG',
  'AZ',
  'BA',
  'AL',
  'XK',
  'MK',
]);

/** Sensible calculation defaults for a country (user can still override). */
export function defaultsForCountry(countryCode: string): {
  method: MethodId;
  madhab: Madhab;
} {
  const code = countryCode.toUpperCase();
  return {
    method: METHOD_BY_COUNTRY[code] ?? 'mwl',
    madhab: HANAFI_COUNTRIES.has(code) ? 'hanafi' : 'standard',
  };
}

export function placeLabel(p: Place) {
  return p.country ? `${p.name}, ${p.country}` : p.name;
}
