import { createContext, useContext } from 'react';

export type TabName = 'home' | 'quran' | 'prayer' | 'tasbeeh' | 'more';

export type Route =
  | { name: 'surah'; surah: number; ayah?: number }
  | { name: 'names' }
  | { name: 'duas' }
  | { name: 'qibla' }
  | { name: 'settings' };

export type Nav = {
  tab: TabName;
  setTab: (tab: TabName) => void;
  push: (route: Route) => void;
  pop: () => void;
};

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) {
    throw new Error('useNav must be used inside the app shell');
  }
  return nav;
}
