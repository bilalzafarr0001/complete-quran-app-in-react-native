import { useColorScheme } from 'react-native';
import { useStore } from './store';

// Falaq ("daybreak"): a dawn sky from plum through rose to apricot, with
// peach-gold accents.
const light = {
  isDark: false,
  bg: '#FBF5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F5E9E4',
  text: '#2A1520',
  muted: '#7D6670',
  border: '#EBDCD6',
  primary: '#A23E5C',
  primarySoft: '#F8E6EC',
  gold: '#C4602F',
  goldSoft: '#FBE6D6',
  arabic: '#5A1F3A',
  danger: '#D14343',
  tabBar: '#FFFFFF',
  hero: 'linear-gradient(160deg, #3A1630 0%, #8E3457 58%, #D9714F 100%)',
  /** Solid colour matching the top edge of `hero` (status-bar strip). */
  heroTop: '#3A1630',
  gold3: 'linear-gradient(135deg, #FFD9AE 0%, #F4A26B 55%, #E07B53 100%)',
  primary3: 'linear-gradient(135deg, #B84C6C 0%, #8E3457 100%)',
  cardShadow: '0px 6px 18px rgba(58, 22, 48, 0.08)',
  floatShadow: '0px 12px 30px rgba(58, 22, 48, 0.22)',
  goldGlow: '0px 0px 28px rgba(244, 162, 107, 0.55)',
};

const dark: typeof light = {
  isDark: true,
  bg: '#140A11',
  surface: '#21121C',
  surfaceAlt: '#2B1824',
  text: '#F6ECEF',
  muted: '#B49AA6',
  border: '#3D2433',
  primary: '#EE8FAA',
  primarySoft: '#3A1A2B',
  gold: '#F4A26B',
  goldSoft: '#3A2418',
  arabic: '#FFD9B8',
  danger: '#F07171',
  tabBar: '#1A0E16',
  hero: 'linear-gradient(160deg, #12060F 0%, #3A1630 55%, #7A2C4A 100%)',
  heroTop: '#12060F',
  gold3: 'linear-gradient(135deg, #FFD9AE 0%, #F4A26B 55%, #E07B53 100%)',
  primary3: 'linear-gradient(135deg, #B84C6C 0%, #6E2440 100%)',
  cardShadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  floatShadow: '0px 12px 30px rgba(0, 0, 0, 0.5)',
  goldGlow: '0px 0px 28px rgba(244, 162, 107, 0.45)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { state } = useStore();
  const mode = state.themeMode === 'system' ? system : state.themeMode;
  return mode === 'dark' ? dark : light;
}

/** Colours used on top of the dawn hero gradient (same in both themes). */
export const onHero = {
  text: '#FFFFFF',
  soft: 'rgba(255,255,255,0.78)',
  faint: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.24)',
  gold: '#FFC58A',
};
