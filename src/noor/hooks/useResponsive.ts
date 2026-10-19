import { useWindowDimensions, ViewStyle } from 'react-native';

/** Widest the main content column gets on tablets / landscape. */
export const MAX_CONTENT = 720;

/** Centres a column of content and caps its width on large screens. */
export const contentColumn: ViewStyle = {
  width: '100%',
  maxWidth: MAX_CONTENT,
  alignSelf: 'center',
};

/** Screen-size helpers shared by every screen. */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;
  const isSmall = width < 360;
  const contentWidth = Math.min(width, MAX_CONTENT);
  // Scale type relative to a 390pt-wide phone, gently clamped.
  const k = Math.min(1.18, Math.max(0.86, contentWidth / 390));
  const fs = (size: number) => Math.round(size * k);

  return {
    width,
    height,
    fontScale,
    isTablet,
    isSmall,
    isLandscape: width > height,
    compactHeight: height < 720,
    contentWidth,
    fs,
  };
}
