import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  AdhanPermission,
  getAdhanPermission,
  requestAdhanPermission,
} from '../services/adhan';
import { AlertMode, SalahKey, useStore } from '../store';

const CYCLE: AlertMode[] = ['adhan', 'beep', 'off'];

/** Turning adhan alerts on/off, per-prayer modes and permission state. */
export function useAdhanControls() {
  const { state, updateNotifications, setAlertMode } = useStore();
  const [perm, setPerm] = useState<AdhanPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getAdhanPermission()
      .then(setPerm)
      .catch(() => {});
  }, []);

  // Re-check when returning from system settings.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await requestAdhanPermission();
      setPerm(p);
      if (!p.notifications) {
        setError(
          'Notifications are turned off for Falaq. Allow them in system settings to hear the adhan.',
        );
        return false;
      }
      updateNotifications({ enabled: true });
      return true;
    } catch {
      setError('Could not turn on notifications. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [updateNotifications]);

  const disable = useCallback(
    () => updateNotifications({ enabled: false }),
    [updateNotifications],
  );

  /** Adhan → short sound → off → adhan… (turns alerts on first if needed). */
  const cycle = useCallback(
    async (prayer: SalahKey) => {
      if (!state.notifications.enabled) {
        await enable();
        return;
      }
      const current = state.notifications.modes[prayer];
      setAlertMode(prayer, CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]);
    },
    [enable, setAlertMode, state.notifications],
  );

  return {
    settings: state.notifications,
    perm,
    busy,
    error,
    enable,
    disable,
    cycle,
    setAlertMode,
    updateNotifications,
    /** Enabled in the app but blocked in system settings. */
    blocked:
      state.notifications.enabled && perm !== null && !perm.notifications,
    refresh,
  };
}

export const ALERT_ICON: Record<AlertMode, string> = {
  adhan: '🔊',
  beep: '🔔',
  off: '🔕',
};

export const ALERT_LABEL: Record<AlertMode, string> = {
  adhan: 'Adhan',
  beep: 'Sound',
  off: 'Off',
};
