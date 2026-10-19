import { useEffect, useRef } from 'react';
import { DEFAULT_PLACE } from '../data/places';
import { dateKey } from '../logic/dates';
import { placeNow } from '../logic/timezone';
import { syncHijriAdjustment } from '../services/hijri';
import {
  detectPlace,
  distanceKm,
  hasLocationPermission,
} from '../services/location';
import { useStore } from '../store';

/**
 * Keeps dynamic data fresh in the background:
 * - re-detects the GPS location on launch (only if permission was already given
 *   and the user hasn't picked a city by hand), so travelling updates times;
 * - syncs the official Hijri date once per day.
 */
export function useBackgroundSync() {
  const { state, hydrated, setPlace, update } = useStore();
  const locationChecked = useRef(false);

  useEffect(() => {
    if (!hydrated || !state.onboarded || locationChecked.current) return;
    locationChecked.current = true;
    const saved = state.place;
    if (saved && saved.source === 'search') return; // user chose manually
    (async () => {
      try {
        if (!(await hasLocationPermission())) return;
        const fresh = await detectPlace();
        if (!saved || distanceKm(saved, fresh) > 3) setPlace(fresh);
      } catch {
        // Keep the saved location.
      }
    })();
  }, [hydrated, state.onboarded, state.place, setPlace]);

  const place = state.place ?? DEFAULT_PLACE;
  const today = placeNow(place);
  const todayKey = dateKey(today);

  useEffect(() => {
    if (!hydrated || state.hijriSyncedOn === todayKey) return;
    let alive = true;
    syncHijriAdjustment(today)
      .then(adj => {
        if (alive && adj !== null) {
          update({ hijriAuto: adj, hijriSyncedOn: todayKey });
        }
      })
      .catch(() => {
        // Offline: keep using the on-device calendar.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, todayKey, state.hijriSyncedOn]);
}
