import {
  defaultsForCountry,
  DEFAULT_PLACE,
  Place,
} from '../src/noor/data/places';
import { NAMES_OF_ALLAH } from '../src/noor/data/names';
import { QURAN_TEXT } from '../src/noor/data/quran';
import { SURAHS } from '../src/noor/data/surahs';
import { toHijri } from '../src/noor/logic/hijri';
import {
  calculatePrayerTimes,
  formatCountdown,
  formatTime,
  prayerStatus,
  PRAYER_KEYS,
} from '../src/noor/logic/prayerTimes';
import { qiblaBearing } from '../src/noor/logic/qibla';
import { offsetOn, placeNow, zoneOffsetAt } from '../src/noor/logic/timezone';

const place = (p: Partial<Place> & Pick<Place, 'lat' | 'lng'>): Place => ({
  name: 'Test',
  country: '',
  countryCode: '',
  utcOffset: 0,
  source: 'search',
  ...p,
});

const LAHORE = place({
  name: 'Lahore',
  countryCode: 'PK',
  lat: 31.5204,
  lng: 74.3587,
  timeZone: 'Asia/Karachi',
  utcOffset: 5,
});
const LONDON = place({
  name: 'London',
  countryCode: 'GB',
  lat: 51.5074,
  lng: -0.1278,
  timeZone: 'Europe/London',
});
const NEW_YORK = place({
  name: 'New York',
  countryCode: 'US',
  lat: 40.7128,
  lng: -74.006,
  timeZone: 'America/New_York',
  utcOffset: -5,
});
const OSLO = place({
  name: 'Oslo',
  countryCode: 'NO',
  lat: 59.91,
  lng: 10.75,
  timeZone: 'Europe/Oslo',
  utcOffset: 1,
});
const JAKARTA = place({
  name: 'Jakarta',
  countryCode: 'ID',
  lat: -6.2088,
  lng: 106.8456,
  timeZone: 'Asia/Jakarta',
  utcOffset: 7,
});

describe('data', () => {
  test('114 surahs with 6236 ayat in total', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((n, s) => n + s.ayahs, 0)).toBe(6236);
  });

  test('bundled offline sample matches ayah counts', () => {
    for (const [num, ayat] of Object.entries(QURAN_TEXT)) {
      expect(ayat).toHaveLength(SURAHS[Number(num) - 1].ayahs);
    }
  });

  test('99 names of Allah', () => {
    expect(NAMES_OF_ALLAH).toHaveLength(99);
  });

  test('country defaults for calculation method and Asr', () => {
    expect(defaultsForCountry('PK')).toEqual({
      method: 'karachi',
      madhab: 'hanafi',
    });
    expect(defaultsForCountry('sa')).toEqual({
      method: 'makkah',
      madhab: 'standard',
    });
    expect(defaultsForCountry('US')).toEqual({
      method: 'isna',
      madhab: 'standard',
    });
    expect(defaultsForCountry('MY')).toEqual({
      method: 'sea',
      madhab: 'standard',
    });
    expect(defaultsForCountry('TR')).toEqual({
      method: 'mwl',
      madhab: 'hanafi',
    });
    expect(defaultsForCountry('')).toEqual({
      method: 'mwl',
      madhab: 'standard',
    });
  });
});

describe('time zones', () => {
  test('daylight saving is handled from the IANA zone', () => {
    expect(zoneOffsetAt('Europe/London', Date.UTC(2026, 6, 1, 12))).toBe(1);
    expect(zoneOffsetAt('Europe/London', Date.UTC(2026, 0, 15, 12))).toBe(0);
    expect(zoneOffsetAt('America/New_York', Date.UTC(2026, 6, 1, 12))).toBe(-4);
    expect(zoneOffsetAt('Asia/Kolkata', Date.UTC(2026, 6, 1, 12))).toBe(5.5);
    expect(zoneOffsetAt('Not/AZone', Date.now())).toBeNull();
  });

  test('offsetOn uses the local calendar date', () => {
    expect(offsetOn(LONDON, { y: 2026, m: 3, d: 28 })).toBe(0); // day before BST
    expect(offsetOn(LONDON, { y: 2026, m: 3, d: 30 })).toBe(1);
  });

  test('falls back to the saved offset when no time zone is known', () => {
    const p = place({ lat: 0, lng: 0, utcOffset: 3 });
    expect(offsetOn(p, { y: 2026, m: 1, d: 1 })).toBe(3);
  });

  test('placeNow converts to local time', () => {
    const now = placeNow(LAHORE, Date.UTC(2026, 9, 18, 20, 30));
    expect(now).toMatchObject({ y: 2026, m: 10, d: 19 });
    expect(now.hours).toBeCloseTo(1.5);
  });
});

describe('prayer times', () => {
  const minutes = (h: number) => Math.round(h * 60);

  test('Makkah, 21 June 2025 (Umm al-Qura) is close to published times', () => {
    const t = calculatePrayerTimes(
      { y: 2025, m: 6, d: 21 },
      DEFAULT_PLACE,
      3,
      'makkah',
      'standard',
    );
    // Published: Fajr 4:12, Sunrise 5:39, Dhuhr 12:22, Asr 3:41, Maghrib 7:06, Isha 8:36
    expect(Math.abs(minutes(t.fajr) - (4 * 60 + 12))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.sunrise) - (5 * 60 + 39))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.dhuhr) - (12 * 60 + 22))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.asr) - (15 * 60 + 41))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.maghrib) - (19 * 60 + 6))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(t.isha) - (20 * 60 + 36))).toBeLessThanOrEqual(3);
  });

  test('London summer times use BST (UTC+1)', () => {
    const d = { y: 2026, m: 7, d: 1 };
    const t = calculatePrayerTimes(
      d,
      LONDON,
      offsetOn(LONDON, d),
      'mwl',
      'standard',
    );
    // Solar noon in London is ~13:04 BST in early July.
    expect(Math.abs(minutes(t.dhuhr) - (13 * 60 + 4))).toBeLessThanOrEqual(3);
  });

  test('times are ordered and finite everywhere, all year (incl. high latitude)', () => {
    for (const p of [LAHORE, LONDON, NEW_YORK, OSLO, JAKARTA, DEFAULT_PLACE]) {
      const { method, madhab } = defaultsForCountry(p.countryCode);
      for (let m = 1; m <= 12; m++) {
        const d = { y: 2026, m, d: 15 };
        const t = calculatePrayerTimes(d, p, offsetOn(p, d), method, madhab);
        const values = PRAYER_KEYS.map(k => t[k]);
        values.forEach(v => expect(Number.isFinite(v)).toBe(true));
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThan(values[i - 1]);
        }
      }
    }
  });

  test('status rolls over to tomorrow after Isha', () => {
    const today = calculatePrayerTimes(
      { y: 2026, m: 10, d: 18 },
      LAHORE,
      5,
      'karachi',
      'hanafi',
    );
    const s = prayerStatus(
      { y: 2026, m: 10, d: 18, weekday: 0, hours: 23.5 },
      today,
      today,
      today,
    );
    expect(s.current).toBe('isha');
    expect(s.next).toBe('fajr');
    expect(s.remaining).toBeGreaterThan(0);
  });

  test('formatting', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(13.5)).toBe('1:30 PM');
    expect(formatCountdown(1.5)).toBe('01:30:00');
  });
});

describe('hijri & qibla', () => {
  test('1 Ramadan 1446 ≈ 1 March 2025', () => {
    const h = toHijri({ y: 2025, m: 3, d: 1 });
    expect(h.year).toBe(1446);
    expect(h.month).toBe(9);
    expect(Math.abs(h.day - 1)).toBeLessThanOrEqual(1);
  });

  test('qibla from London is roughly 119°', () => {
    expect(qiblaBearing(LONDON.lat, LONDON.lng)).toBeCloseTo(119, 0);
  });
});
