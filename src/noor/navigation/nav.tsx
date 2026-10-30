import { createContext, useContext } from 'react';
import type { DuaCategory } from '../data/duas';

export type TabName = 'home' | 'quran' | 'qibla' | 'tasbeeh' | 'more';

export type Route =
  | { name: 'surah'; surah: number; ayah?: number }
  | { name: 'prayer' }
  | { name: 'names' }
  | { name: 'duas'; category?: DuaCategory; dua?: string }
  | { name: 'ramadan' }
  | { name: 'settings' }
  | { name: 'assistant' };

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
