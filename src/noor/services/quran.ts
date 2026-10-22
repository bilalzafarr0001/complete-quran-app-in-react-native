import { QURAN_TEXT } from '../data/quran';
import { SURAHS } from '../data/surahs';
import { fetchJson } from './http';
import { keysWithPrefix, readJson, removeKeys, writeJson } from './storage';

/** One ayah with its translations (any may be missing when offline). */
export type FullAyah = { ar: string; en?: string; ur?: string };
export type SurahSource = 'cache' | 'online' | 'bundled';

export const EDITIONS = {
  ar: 'quran-simple-enhanced',
  en: 'en.sahih', // Saheeh International
  ur: 'ur.jalandhry', // Fateh Muhammad Jalandhry
};
const PREFIX = 'noor:surah:v1:';
const memory: Record<number, FullAyah[]> = {};

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const normalize = (s: string) => s.replace(DIACRITICS, '').replace(/ٱ/g, 'ا');
const BASMALA = 'بسم الله الرحمن الرحيم';

/**
 * The API prefixes ayah 1 of every surah (except Al-Fatihah and At-Tawbah)
 * with the Bismillah. The reader shows it separately, so remove it here.
 */
export function stripBasmala(surah: number, text: string): string {
  if (surah === 1 || surah === 9) return text;
  const words = text.trim().split(/\s+/);
  if (normalize(words.slice(0, 4).join(' ')) === BASMALA) {
    return words.slice(4).join(' ');
  }
  return text;
}

type ApiResponse = {
  data: {
    edition: { identifier: string };
    ayahs: { text: string; numberInSurah: number }[];
  }[];
};

/** Surah text from memory or the on-device cache, without any network. */
export async function getCachedSurah(n: number): Promise<FullAyah[] | null> {
  if (memory[n]) return memory[n];
  const cached = await readJson<FullAyah[]>(PREFIX + n);
  if (cached?.length) memory[n] = cached;
  return cached;
}

/** Downloads a surah (Arabic + English + Urdu) and caches it for offline use. */
export async function downloadSurah(n: number): Promise<FullAyah[]> {
  const r = await fetchJson<ApiResponse>(
    `https://api.alquran.cloud/v1/surah/${n}/editions/${EDITIONS.ar},${EDITIONS.en},${EDITIONS.ur}`,
    45000,
  );
  const byId = (id: string) => r.data.find(e => e.edition.identifier === id);
  const ar = byId(EDITIONS.ar);
  if (!ar || ar.ayahs.length !== SURAHS[n - 1].ayahs) {
    throw new Error('The Quran service returned incomplete data.');
  }
  const en = byId(EDITIONS.en)?.ayahs;
  const ur = byId(EDITIONS.ur)?.ayahs;
  const ayat = ar.ayahs.map((a, i) => ({
    ar: i === 0 ? stripBasmala(n, a.text) : a.text,
    en: en?.[i]?.text,
    ur: ur?.[i]?.text,
  }));
  memory[n] = ayat;
  await writeJson(PREFIX + n, ayat);
  return ayat;
}

/** Cache first, then network, then the small bundled sample. */
export async function loadSurah(
  n: number,
): Promise<{ ayat: FullAyah[]; source: SurahSource }> {
  const cached = await getCachedSurah(n);
  if (cached?.length) return { ayat: cached, source: 'cache' };
  try {
    return { ayat: await downloadSurah(n), source: 'online' };
  } catch (e) {
    const bundled = QURAN_TEXT[n];
    if (bundled) {
      return {
        ayat: bundled.map(a => ({ ar: a.ar, en: a.en })),
        source: 'bundled',
      };
    }
    throw e;
  }
}

/** Surah numbers saved on the device. */
export async function downloadedSurahs(): Promise<number[]> {
  const keys = await keysWithPrefix(PREFIX);
  return keys.map(k => Number(k.slice(PREFIX.length))).filter(Boolean);
}

export async function clearDownloads(): Promise<void> {
  await removeKeys(await keysWithPrefix(PREFIX));
  for (const k of Object.keys(memory)) delete memory[Number(k)];
}
