import notifee from '@notifee/react-native';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_PLACE } from '../data/places';
import { handleAdhanEvent, scheduleAlerts } from '../services/adhan';
import { ensurePlayer } from '../services/recitation';
import { useStore } from '../store';

/**
 * Keeps the next 7 days of adhan alerts scheduled. Re-plans whenever the
 * location, calculation settings or alert choices change, and every time
 * the app comes to the foreground (so the 7-day window keeps rolling).
 */
export function useAdhanScheduler() {
  const { state, hydrated } = useStore();
  const place = state.place ?? DEFAULT_PLACE;
  const [resumed, setResumed] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setResumed(n => n + 1);
    });
    const unsubscribe = notifee.onForegroundEvent(e => {
      handleAdhanEvent(e).catch(() => {});
    });
    // Prepare the recitation player early so the first tap plays instantly.
    ensurePlayer().catch(() => {});
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, []);

  const hijriAdjust = state.hijriAuto + state.hijriOffset;
  const key = JSON.stringify([
    state.notifications,
    hijriAdjust,
    place.lat,
    place.lng,
    place.timeZone,
    place.name,
    state.method,
    state.madhab,
  ]);

  useEffect(() => {
    if (!hydrated || !state.onboarded) return;
    const timer = setTimeout(() => {
      scheduleAlerts({
        place,
        method: state.method,
        madhab: state.madhab,
        settings: state.notifications,
        hijriAdjust,
      }).catch(() => {
        // Scheduling failures are retried on the next change / resume.
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, state.onboarded, key, resumed]);
}
