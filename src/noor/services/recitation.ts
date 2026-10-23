import TrackPlayer, {
  AddTrack,
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from 'react-native-track-player';
import { getReciter } from '../data/reciters';
import { getSurah, SURAHS } from '../data/surahs';

export type RepeatSetting = 'off' | 'ayah' | 'surah';

/** Index of the first ayah of each surah in the whole Quran (0-based). */
const FIRST_AYAH: number[] = SURAHS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SURAHS[i - 1].ayahs);
  return acc;
}, []);

/** Ayah number across the whole Quran (1–6236), as used by the audio CDN. */
export function globalAyahNumber(surah: number, ayah: number): number {
  return FIRST_AYAH[surah - 1] + ayah;
}

export function ayahAudioUrl(reciterId: string, surah: number, ayah: number) {
  const r = getReciter(reciterId);
  return `https://cdn.islamic.network/quran/audio/${r.bitrate}/${
    r.id
  }/${globalAyahNumber(surah, ayah)}.mp3`;
}

/** Track ids look like "2:255"; "2:0" is the Bismillah recited before a surah. */
export function parseTrackId(id: string | undefined) {
  if (!id) return null;
  const [s, a] = id.split(':').map(Number);
  return Number.isFinite(s) && Number.isFinite(a)
    ? { surah: s, ayah: a }
    : null;
}

/** True when the surah is preceded by a separately recited Bismillah. */
export function hasSeparateBasmala(surah: number) {
  return surah !== 1 && surah !== 9;
}

/**
 * Playlist for a whole surah: an optional Bismillah, then every ayah.
 * Returns the tracks and the index to start from for `fromAyah`.
 */
export function buildSurahQueue(
  reciterId: string,
  surah: number,
  fromAyah = 1,
): { tracks: AddTrack[]; startIndex: number } {
  const info = getSurah(surah);
  const reciter = getReciter(reciterId);
  const tracks: AddTrack[] = [];
  const basmala = hasSeparateBasmala(surah);
  if (basmala) {
    tracks.push({
      id: `${surah}:0`,
      url: ayahAudioUrl(reciterId, 1, 1),
      title: `${info.name} · Bismillah`,
      artist: reciter.name,
      album: 'Falaq · Quran',
    });
  }
  for (let a = 1; a <= info.ayahs; a++) {
    tracks.push({
      id: `${surah}:${a}`,
      url: ayahAudioUrl(reciterId, surah, a),
      title: `${info.name} · Ayah ${a}`,
      artist: reciter.name,
      album: 'Falaq · Quran',
    });
  }
  // Start on the Bismillah only when beginning the surah from its first ayah.
  const first = Math.min(Math.max(1, fromAyah), info.ayahs);
  const startIndex = basmala ? (first === 1 ? 0 : first) : first - 1;
  return { tracks, startIndex };
}

let setupPromise: Promise<void> | null = null;

/** Sets the player up once (safe to call many times). */
export function ensurePlayer(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      try {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
          maxCacheSize: 300 * 1024, // KB — replays don't re-download
        });
      } catch (e) {
        // A previous JS reload may have already set it up.
        if (!String(e).includes('already')) throw e;
      }
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.SkipToPrevious,
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        progressUpdateEventInterval: 1,
      });
    })().catch(e => {
      setupPromise = null;
      throw e;
    });
  }
  return setupPromise;
}

const REPEAT: Record<RepeatSetting, RepeatMode> = {
  off: RepeatMode.Off,
  ayah: RepeatMode.Track,
  surah: RepeatMode.Queue,
};

export async function applyRepeat(setting: RepeatSetting) {
  await ensurePlayer();
  await TrackPlayer.setRepeatMode(REPEAT[setting]);
}

/** Starts reciting a surah from an ayah (replaces whatever was playing). */
export async function playSurah(
  reciterId: string,
  surah: number,
  fromAyah: number,
  repeat: RepeatSetting,
) {
  await ensurePlayer();
  const { tracks, startIndex } = buildSurahQueue(reciterId, surah, fromAyah);
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  await TrackPlayer.setRepeatMode(REPEAT[repeat]);
  await TrackPlayer.play();
}

export async function stopRecitation() {
  try {
    await TrackPlayer.reset();
  } catch {
    // Player was never set up.
  }
}
