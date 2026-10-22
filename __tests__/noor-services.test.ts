import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { syncHijriAdjustment } from '../src/noor/services/hijri';
import { detectPlace, searchPlaces } from '../src/noor/services/location';
import { loadSurah, stripBasmala } from '../src/noor/services/quran';
import { globalAyahNumber } from '../src/noor/services/recitation';
import {
  locateAyah,
  nextVerse,
  randomAyahRef,
} from '../src/noor/services/verseOfMoment';

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

describe('verse of the moment', () => {
  /** A Math.random stand-in that lands on the given global ayah numbers. */
  const landsOn =
    (...globals: number[]) =>
    () =>
      (globals.shift()! - 0.5) / 6236;
  const ayahApi = (ar: string, en: string, ur: string) => ({
    data: [
      { edition: { identifier: 'quran-simple-enhanced' }, text: ar },
      { edition: { identifier: 'en.sahih' }, text: en },
      { edition: { identifier: 'ur.jalandhry' }, text: ur },
    ],
  });

  test('maps every ayah number in the Quran back to surah and ayah', () => {
    expect(locateAyah(1)).toEqual({ surah: 1, ayah: 1 });
    expect(locateAyah(8)).toEqual({ surah: 2, ayah: 1 });
    expect(locateAyah(262)).toEqual({ surah: 2, ayah: 255 });
    expect(locateAyah(6236)).toEqual({ surah: 114, ayah: 6 });
    for (let g = 1; g <= 6236; g += 37) {
      const { surah, ayah } = locateAyah(g);
      expect(globalAyahNumber(surah, ayah)).toBe(g);
    }
  });

  test('skips ayat that are only disconnected letters (e.g. الم)', () => {
    // 8 = Al-Baqarah 2:1 (الم) → re-rolls to 262 = 2:255.
    expect(randomAyahRef(landsOn(8, 262))).toEqual({ surah: 2, ayah: 255 });
  });

  test('loads Arabic, English and Urdu, and remembers it for offline', async () => {
    routes({
      '/ayah/2:255/': ayahApi(
        'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
        'Allah - there is no deity except Him',
        'خدا وہ معبود برحق ہے',
      ),
    });
    const v = await nextVerse(landsOn(262));
    expect(v).toEqual({
      surah: 2,
      ayah: 255,
      ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
      en: 'Allah - there is no deity except Him',
      ur: 'خدا وہ معبود برحق ہے',
    });

    // Offline later: the remembered verse comes back, Urdu included.
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
    expect(await nextVerse(landsOn(262, 1))).toEqual(v);
  });

  test('drops the Bismillah from ayah 1 and re-rolls one-word ayat', async () => {
    routes({
      // 55:64 is a single word: tried first, then skipped.
      '/ayah/55:64/': ayahApi('مُدْهَامَّتَانِ', 'Dark green [in color].', 'x'),
      '/ayah/112:1/': ayahApi(
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ',
        'Say, "He is Allah, [who is] One,',
        'کہو کہ وہ خدا ایک ہے',
      ),
    });
    const v = await nextVerse(
      landsOn(globalAyahNumber(55, 64), globalAyahNumber(112, 1)),
    );
    expect(v.surah).toBe(112);
    expect(v.ar).toBe('قُلْ هُوَ اللَّهُ أَحَدٌ');
  });

  test('offline: uses a surah saved on the device (with Urdu)', async () => {
    await AsyncStorage.setItem(
      'noor:surah:v1:94',
      JSON.stringify([
        {
          ar: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ',
          en: 'Did We not expand',
          ur: 'کیا ہم نے',
        },
      ]),
    );
    const v = await nextVerse(() => 0);
    expect(v).toMatchObject({ surah: 94, ayah: 1, ur: 'کیا ہم نے' });
  });

  test('offline with nothing saved: falls back to the bundled verses', async () => {
    const v = await nextVerse(() => 0.5);
    expect(v.ar.split(' ').length).toBeGreaterThanOrEqual(3);
    expect(v.en).toBeTruthy();
    expect(v.ur).toBeUndefined();
  });
});
