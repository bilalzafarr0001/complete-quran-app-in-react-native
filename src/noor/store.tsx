import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defaultsForCountry, Place } from './data/places';
import type { Madhab, MethodId, PrayerKey } from './logic/prayerTimes';
import { readJson, writeJson } from './services/storage';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AlertMode = 'adhan' | 'beep' | 'off';
/** Short = only the opening "Allahu Akbar, Allahu Akbar"; full = the whole adhan. */
export type AdhanLength = 'short' | 'full';
export type SalahKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type RepeatSetting = 'off' | 'ayah' | 'surah';

export type NotifySettings = {
  /** Master switch (also means permission was granted). */
  enabled: boolean;
  /** Per-prayer alert: adhan, short sound, or nothing. */
  modes: Record<SalahKey, AlertMode>;
  /** How much of the adhan plays at prayer time. */
  adhanLength: AdhanLength;
  /** Heads-up this many minutes before each prayer (0 = off). */
  reminderMinutes: 0 | 10 | 15 | 30;
  /** Ramadan: remind this many minutes before Sehri ends (0 = off). */
  sehriMinutes: 0 | 30 | 45 | 60;
  /** Alert at sunrise (end of Fajr time). */
  sunrise: boolean;
};
export type Translation = 'en' | 'ur' | 'both' | 'off';

export type AppState = {
  onboarded: boolean;
  name: string;
  /** Where prayer times are calculated for; null until detected / chosen. */
  place: Place | null;
  method: MethodId;
  madhab: Madhab;
  themeMode: ThemeMode;
  arabicSize: number;
  translation: Translation;
  vibrate: boolean;
  bookmarks: string[]; // "surah:ayah"
  lastRead: { surah: number; ayah: number } | null;
  prayed: Record<string, PrayerKey[]>; // dateKey -> prayers marked as done
  tasbeeh: { dhikrId: string; count: number; target: number; total: number };
  /** Days to shift the arithmetical Hijri calendar to match the official one. */
  hijriAuto: number;
  /** Extra manual Hijri adjustment chosen by the user (local moon sighting). */
  hijriOffset: number;
  /** Date key of the last successful official Hijri sync. */
  hijriSyncedOn: string | null;
  notifications: NotifySettings;
  reciterId: string;
  repeat: RepeatSetting;
  /** Auto-scroll the reader to the ayah being recited. */
  followAlong: boolean;
};

const INITIAL: AppState = {
  onboarded: false,
  name: '',
  place: null,
  method: 'makkah',
  madhab: 'standard',
  themeMode: 'system',
  arabicSize: 28,
  translation: 'en',
  vibrate: true,
  bookmarks: [],
  lastRead: null,
  prayed: {},
  tasbeeh: { dhikrId: 'subhanallah', count: 0, target: 33, total: 0 },
  hijriAuto: 0,
  hijriOffset: 0,
  hijriSyncedOn: null,
  notifications: {
    enabled: false,
    modes: {
      fajr: 'adhan',
      dhuhr: 'adhan',
      asr: 'adhan',
      maghrib: 'adhan',
      isha: 'adhan',
    },
    adhanLength: 'short',
    reminderMinutes: 0,
    sehriMinutes: 0,
    sunrise: false,
  },
  reciterId: 'ar.alafasy',
  repeat: 'off',
  followAlong: true,
};

const STORAGE_KEY = 'noor:state:v1';

/** Applies a new place; method/madhab follow the country only when it changes. */
export function withPlace(s: AppState, place: Place): AppState {
  const countryChanged = !s.place || s.place.countryCode !== place.countryCode;
  if (!countryChanged || !place.countryCode) return { ...s, place };
  return { ...s, place, ...defaultsForCountry(place.countryCode) };
}

function useAppStore() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  // Load saved state once.
  useEffect(() => {
    let alive = true;
    readJson<Partial<AppState>>(STORAGE_KEY).then(saved => {
      if (!alive) return;
      if (saved) {
        setState(s => ({
          ...s,
          ...saved,
          // Keep defaults for any nested fields added in newer versions.
          notifications: {
            ...s.notifications,
            ...saved.notifications,
            modes: { ...s.notifications.modes, ...saved.notifications?.modes },
          },
        }));
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Save (debounced) whenever state changes after loading.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => writeJson(STORAGE_KEY, state), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated]);

  const actions = useMemo(
    () => ({
      update: (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch })),
      finishOnboarding: (name: string, place: Place | null, madhab: Madhab) =>
        setState(s => {
          const next = place ? withPlace(s, place) : s;
          return { ...next, onboarded: true, name: name.trim(), madhab };
        }),
      setPlace: (place: Place) => setState(s => withPlace(s, place)),
      toggleBookmark: (surah: number, ayah: number) =>
        setState(s => {
          const key = `${surah}:${ayah}`;
          return {
            ...s,
            bookmarks: s.bookmarks.includes(key)
              ? s.bookmarks.filter(b => b !== key)
              : [key, ...s.bookmarks],
          };
        }),
      setLastRead: (surah: number, ayah: number) =>
        setState(s => ({ ...s, lastRead: { surah, ayah } })),
      togglePrayed: (day: string, prayer: PrayerKey) =>
        setState(s => {
          const list = s.prayed[day] ?? [];
          return {
            ...s,
            prayed: {
              ...s.prayed,
              [day]: list.includes(prayer)
                ? list.filter(p => p !== prayer)
                : [...list, prayer],
            },
          };
        }),
      tasbeehTap: () =>
        setState(s => ({
          ...s,
          tasbeeh: {
            ...s.tasbeeh,
            count: s.tasbeeh.count + 1,
            total: s.tasbeeh.total + 1,
          },
        })),
      tasbeehReset: () =>
        setState(s => ({ ...s, tasbeeh: { ...s.tasbeeh, count: 0 } })),
      tasbeehConfig: (patch: Partial<{ dhikrId: string; target: number }>) =>
        setState(s => ({
          ...s,
          tasbeeh: { ...s.tasbeeh, ...patch, count: 0 },
        })),
      resetOnboarding: () => setState(s => ({ ...s, onboarded: false })),
      updateNotifications: (patch: Partial<NotifySettings>) =>
        setState(s => ({
          ...s,
          notifications: { ...s.notifications, ...patch },
        })),
      setAlertMode: (prayer: SalahKey, mode: AlertMode) =>
        setState(s => ({
          ...s,
          notifications: {
            ...s.notifications,
            modes: { ...s.notifications.modes, [prayer]: mode },
          },
        })),
    }),
    [],
  );

  return { state, hydrated, ...actions };
}

type Store = ReturnType<typeof useAppStore>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used inside <StoreProvider>');
  }
  return store;
}
