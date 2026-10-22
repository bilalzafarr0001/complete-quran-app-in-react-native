import { QURAN_TEXT } from '../data/quran';
import { SURAHS } from '../data/surahs';
import { fetchJson } from './http';
import {
  downloadedSurahs,
  EDITIONS,
  FullAyah,
  getCachedSurah,
  stripBasmala,
} from './quran';
import { readJson, writeJson } from './storage';

/** A single ayah with its meanings (English / Urdu may be missing offline). */
export type MomentVerse = {
  surah: number;
  ayah: number;
  ar: string;
  en?: string;
  ur?: string;
};

type Random = () => number;
type Ref = { surah: number; ayah: number };

const TOTAL_AYAT = SURAHS.reduce((n, s) => n + s.ayahs, 0); // 6,236
const POOL_KEY = 'noor:moment:pool:v1';
const POOL_SIZE = 40;
/** Network attempts before falling back to verses saved on the device. */
const ATTEMPTS = 3;

/**
 * Ayat made only of the "disconnected letters" (e.g. الم) — they have no
 * translation of their own, so they make a poor verse of the moment.
 */
const LETTERS_ONLY = new Set([
  '2:1', '3:1', '7:1', '19:1', '20:1', '26:1', '28:1', '29:1', '30:1', '31:1',
  '32:1', '36:1', '40:1', '41:1', '42:1', '42:2', '43:1', '44:1', '45:1', '46:1',
]); // prettier-ignore

const key = (r: Ref) => `${r.surah}:${r.ayah}`;

/** Ayah number across the whole Quran (1–6236) → surah and ayah. */
export function locateAyah(global: number): Ref {
  let left = global;
  for (const s of SURAHS) {
    if (left <= s.ayahs) return { surah: s.number, ayah: left };
    left -= s.ayahs;
  }
  throw new RangeError(`No ayah number ${global}`);
}

/** A random ayah from the whole Quran (every ayah equally likely). */
export function randomAyahRef(random: Random = Math.random): Ref {
  for (;;) {
    const ref = locateAyah(1 + Math.floor(random() * TOTAL_AYAT));
    if (!LETTERS_ONLY.has(key(ref))) return ref;
  }
}

/** Very short ayat (one or two words) read poorly on their own. */
function meaningful(v: MomentVerse) {
  return !LETTERS_ONLY.has(key(v)) && v.ar.trim().split(/\s+/).length >= 3;
}

type ApiResponse = {
  data: { edition: { identifier: string }; text: string }[];
};

/** Arabic + English + Urdu for one ayah from the Quran API. */
export async function fetchVerse({ surah, ayah }: Ref): Promise<MomentVerse> {
  const r = await fetchJson<ApiResponse>(
    `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/${EDITIONS.ar},${EDITIONS.en},${EDITIONS.ur}`,
  );
  const text = (id: string) =>
    r.data.find(e => e.edition.identifier === id)?.text;
  const ar = text(EDITIONS.ar);
  if (!ar) throw new Error('The Quran service returned incomplete data.');
  return {
    surah,
    ayah,
    ar: ayah === 1 ? stripBasmala(surah, ar) : ar,
    en: text(EDITIONS.en),
    ur: text(EDITIONS.ur),
  };
}

const pick = <T>(list: T[], random: Random) =>
  list[Math.floor(random() * list.length)];

function pickFromSurah(
  surah: number,
  ayat: FullAyah[],
  random: Random,
): MomentVerse | null {
  const options = ayat
    .map((a, i) => ({ surah, ayah: i + 1, ...a }))
    .filter(meaningful);
  return options.length ? pick(options, random) : null;
}

/** Offline: a surah saved on the device, then earlier verses, then the bundled sample. */
async function offlineVerse(random: Random): Promise<MomentVerse> {
  const saved = await downloadedSurahs();
  if (saved.length) {
    const n = pick(saved, random);
    const ayat = await getCachedSurah(n);
    const v = ayat && pickFromSurah(n, ayat, random);
    if (v) return v;
  }
  const pool = (await readJson<MomentVerse[]>(POOL_KEY)) ?? [];
  if (pool.length) return pick(pool, random);

  const bundled = Object.keys(QURAN_TEXT).map(Number);
  for (;;) {
    const n = pick(bundled, random);
    const v = pickFromSurah(n, QURAN_TEXT[n], random);
    if (v) return v;
  }
}

/** Keeps recent verses (with meanings) so offline visits still feel fresh. */
async function remember(v: MomentVerse) {
  const pool = (await readJson<MomentVerse[]>(POOL_KEY)) ?? [];
  const rest = pool.filter(p => key(p) !== key(v));
  await writeJson(POOL_KEY, [v, ...rest].slice(0, POOL_SIZE));
}

/** A new random verse. Never fails: falls back to verses on the device. */
export async function nextVerse(
  random: Random = Math.random,
): Promise<MomentVerse> {
  for (let i = 0; i < ATTEMPTS; i++) {
    let v: MomentVerse;
    try {
      v = await fetchVerse(randomAyahRef(random));
    } catch {
      break; // Offline or the service is down.
    }
    if (meaningful(v)) {
      await remember(v);
      return v;
    }
  }
  return offlineVerse(random);
}
