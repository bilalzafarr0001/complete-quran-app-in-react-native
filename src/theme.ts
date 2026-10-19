import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    background: '#F5F7FB',
    card: '#FFFFFF',
    input: '#F4F5FA',
    inputBorder: '#E6E8F0',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    accent: '#6366F1',
    accentSoft: '#EEF2FF',
    tabTrack: '#F1F2F8',
    blob1: '#C7D2FE',
    blob2: '#FBCFE8',
    error: '#EF4444',
    heroGradient:
      'linear-gradient(150deg, #4F46E5 0%, #7C3AED 55%, #DB2777 100%)',
    buttonGradient:
      'linear-gradient(90deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%)',
    buttonShadow: '0px 10px 22px rgba(99, 102, 241, 0.38)',
    sheetShadow: '0px -12px 40px rgba(17, 24, 39, 0.18)',
  },
  dark: {
    background: '#0B1020',
    card: '#121829',
    input: '#1A2138',
    inputBorder: '#262E4A',
    text: '#F9FAFB',
    muted: '#9CA3AF',
    border: '#2A3352',
    accent: '#818CF8',
    accentSoft: '#1E2342',
    tabTrack: '#1A2138',
    blob1: '#312E81',
    blob2: '#701A75',
    error: '#F87171',
    heroGradient:
      'linear-gradient(150deg, #312E81 0%, #5B21B6 55%, #9D174D 100%)',
    buttonGradient:
      'linear-gradient(90deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%)',
    buttonShadow: '0px 10px 24px rgba(129, 140, 248, 0.30)',
    sheetShadow: '0px -12px 40px rgba(0, 0, 0, 0.5)',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
