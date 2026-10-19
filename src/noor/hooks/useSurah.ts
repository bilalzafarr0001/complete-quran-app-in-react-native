import { useCallback, useEffect, useState } from 'react';
import { FullAyah, loadSurah, SurahSource } from '../services/quran';

type State =
  | { status: 'loading' }
  | { status: 'ready'; ayat: FullAyah[]; source: SurahSource }
  | { status: 'error'; message: string };

/** Loads a surah (cache → network → bundled sample) with retry support. */
export function useSurah(surah: number) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadSurah(surah)
      .then(r => alive && setState({ status: 'ready', ...r }))
      .catch(
        () =>
          alive &&
          setState({
            status: 'error',
            message:
              'Could not load this surah. Check your internet connection — once loaded it stays available offline.',
          }),
      );
    return () => {
      alive = false;
    };
  }, [surah, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { ...state, retry };
}
