import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { syncHijriAdjustment } from '../src/noor/services/hijri';
import { detectPlace, searchPlaces } from '../src/noor/services/location';
import { loadSurah, stripBasmala } from '../src/noor/services/quran';

const fetchMock = globalThis.fetch as jest.Mock;
const json = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

/** Route mocked fetch calls by URL substring. */
function routes(map: Record<string, unknown>) {
  fetchMock.mockImplementation((url: string) => {
    const hit = Object.keys(map).find(k => url.includes(k));
    return hit ? json(map[hit]) : Promise.reject(new Error('offline'));
  });
}

afterEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
  (AsyncStorage as unknown as { __store: Map<string, string> }).__store.clear();
});

describe('location', () => {
  test('detects city, country and time zone from GPS', async () => {
    (
      Geolocation as unknown as { __setPosition: (p: unknown) => void }
    ).__setPosition({
      coords: { latitude: 31.52, longitude: 74.36 },
    });
    routes({
      'bigdatacloud.net': {
        city: 'Lahore',
        principalSubdivision: 'Punjab',
        countryName: 'Pakistan',
        countryCode: 'PK',
      },
      'api.open-meteo.com': {
        timezone: 'Asia/Karachi',
        utc_offset_seconds: 18000,
      },
    });
    await expect(detectPlace()).resolves.toMatchObject({
      name: 'Lahore',
      region: 'Punjab',
      country: 'Pakistan',
      countryCode: 'PK',
      timeZone: 'Asia/Karachi',
      utcOffset: 5,
      source: 'gps',
    });
  });

  test('still works offline with coordinates and the phone time zone', async () => {
    const p = await detectPlace();
    expect(p.name).toBe('Current location');
    expect(p.lat).toBeCloseTo(31.52);
    expect(p.utcOffset).toBe(-new Date().getTimezoneOffset() / 60);
  });

  test('reports permission problems clearly', async () => {
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementationOnce(
      (_ok, fail) => fail({ code: 1 }),
    );
    await expect(detectPlace()).rejects.toMatchObject({ code: 'denied' });
  });

  test('searches cities worldwide', async () => {
    routes({
      'geocoding-api.open-meteo.com': {
        results: [
          {
            name: 'Jakarta',
            latitude: -6.2,
            longitude: 106.8,
            country: 'Indonesia',
            country_code: 'ID',
            admin1: 'Jakarta',
            timezone: 'Asia/Jakarta',
          },
        ],
      },
    });
    const [jakarta] = await searchPlaces('Jakar');
    expect(jakarta).toMatchObject({
      name: 'Jakarta',
      countryCode: 'ID',
      timeZone: 'Asia/Jakarta',
      utcOffset: 7,
      source: 'search',
    });
    await expect(searchPlaces('J')).resolves.toEqual([]);
  });
});

describe('quran', () => {
  test('removes the Bismillah the API puts in ayah 1', () => {
    expect(
      stripBasmala(
        112,
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ',
      ),
    ).toBe('قُلْ هُوَ اللَّهُ أَحَدٌ');
    expect(stripBasmala(1, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')).toBe(
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    );
    expect(stripBasmala(9, 'بَرَاءَةٌ مِّنَ اللَّهِ')).toBe(
      'بَرَاءَةٌ مِّنَ اللَّهِ',
    );
  });

  test('downloads Arabic + English + Urdu once, then reads from cache', async () => {
    const ayahs = (texts: string[]) =>
      texts.map((text, i) => ({ text, numberInSurah: i + 1 }));
    routes({
      'api.alquran.cloud': {
        data: [
          {
            edition: { identifier: 'quran-simple-enhanced' },
            ayahs: ayahs([
              'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
              'فَصَلِّ لِرَبِّكَ وَانْحَرْ',
              'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ',
            ]),
          },
          {
            edition: { identifier: 'en.sahih' },
            ayahs: ayahs(['en1', 'en2', 'en3']),
          },
          {
            edition: { identifier: 'ur.jalandhry' },
            ayahs: ayahs(['ur1', 'ur2', 'ur3']),
          },
        ],
      },
    });
    const first = await loadSurah(108);
    expect(first.source).toBe('online');
    expect(first.ayat[0]).toEqual({
      ar: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
      en: 'en1',
      ur: 'ur1',
    });

    fetchMock.mockClear();
    const again = await loadSurah(108);
    expect(again.source).toBe('cache');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('falls back to the bundled sample offline, and errors for others', async () => {
    await expect(loadSurah(112)).resolves.toMatchObject({ source: 'bundled' });
    await expect(loadSurah(2)).rejects.toThrow();
  });
});

describe('hijri sync', () => {
  test('finds the day shift that matches the official calendar', async () => {
    routes({
      'api.aladhan.com': {
        data: { hijri: { day: '8', month: { number: 5 }, year: '1448' } },
      },
    });
    // The arithmetical calendar says 7 Jumada al-Ula on 19 Oct 2026 → shift +1.
    await expect(syncHijriAdjustment({ y: 2026, m: 10, d: 19 })).resolves.toBe(
      1,
    );
  });
});
