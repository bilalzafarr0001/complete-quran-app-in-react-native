import { useColorScheme } from 'react-native';
import { useStore } from './store';

const light = {
  isDark: false,
  bg: '#F6F2E9',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EADC',
  text: '#13241D',
  muted: '#6C7A73',
  border: '#E6DECC',
  primary: '#0E6B4E',
  primarySoft: '#E3F1EB',
  gold: '#C59A2A',
  goldSoft: '#F7EDD2',
  arabic: '#0B3F2F',
  danger: '#D14343',
  tabBar: '#FFFFFF',
  hero: 'linear-gradient(160deg, #06301F 0%, #0B5A40 55%, #13805C 100%)',
  /** Solid colour matching the top edge of `hero` (status-bar strip). */
  heroTop: '#06301F',
  gold3: 'linear-gradient(135deg, #F3D98B 0%, #D4AA3A 50%, #B8891E 100%)',
  green3: 'linear-gradient(135deg, #17936A 0%, #0E6B4E 100%)',
  cardShadow: '0px 6px 18px rgba(11, 63, 47, 0.08)',
  floatShadow: '0px 12px 30px rgba(6, 48, 31, 0.22)',
  goldGlow: '0px 0px 28px rgba(229, 189, 92, 0.55)',
};

const dark: typeof light = {
  isDark: true,
  bg: '#06120D',
  surface: '#0E1E17',
  surfaceAlt: '#14281F',
  text: '#ECF3EE',
  muted: '#8DA197',
  border: '#1D3A2D',
  primary: '#2DB386',
  primarySoft: '#123327',
  gold: '#E2BC55',
  goldSoft: '#2B2512',
  arabic: '#F3E3B3',
  danger: '#F07171',
  tabBar: '#0C1913',
  hero: 'linear-gradient(160deg, #020A06 0%, #06301F 55%, #0B5A40 100%)',
  heroTop: '#020A06',
  gold3: 'linear-gradient(135deg, #F3D98B 0%, #D4AA3A 50%, #B8891E 100%)',
  green3: 'linear-gradient(135deg, #17936A 0%, #0B5A40 100%)',
  cardShadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  floatShadow: '0px 12px 30px rgba(0, 0, 0, 0.5)',
  goldGlow: '0px 0px 28px rgba(229, 189, 92, 0.45)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { state } = useStore();
  const mode = state.themeMode === 'system' ? system : state.themeMode;
  return mode === 'dark' ? dark : light;
}

/** Colours used on top of the green hero gradient (same in both themes). */
export const onHero = {
  text: '#FFFFFF',
  soft: 'rgba(255,255,255,0.75)',
  faint: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.22)',
  gold: '#F1CF74',
};
