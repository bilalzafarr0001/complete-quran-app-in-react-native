import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { MomentVerse, nextVerse } from '../services/verseOfMoment';

/**
 * A random verse each time the app is opened or brought back from the
 * background. The next one is fetched ahead so it appears instantly.
 */
export function useVerseOfMoment() {
  const [verse, setVerse] = useState<MomentVerse | null>(null);
  const upcoming = useRef<Promise<MomentVerse> | null>(null);
  const loading = useRef(false);
  const alive = useRef(true);

  const next = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    const pending = upcoming.current ?? nextVerse();
    upcoming.current = null;
    const v = await pending;
    loading.current = false;
    if (!alive.current) return;
    setVerse(v);
    upcoming.current = nextVerse();
  }, []);

  useEffect(() => {
    alive.current = true;
    next();
    let wasAway = false;
    const sub = AppState.addEventListener('change', s => {
      if (s === 'background') wasAway = true;
      else if (s === 'active' && wasAway) {
        wasAway = false;
        next();
      }
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [next]);

  return { verse };
}
