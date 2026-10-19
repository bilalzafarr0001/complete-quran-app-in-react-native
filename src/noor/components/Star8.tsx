import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  size: number;
  color: string;
  /** Draw outlines instead of filled squares. */
  outline?: boolean;
  borderWidth?: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Eight-pointed star (Rub el Hizb ۞) built from two overlapping squares.
 * Used for surah / ayah numbers and decorative patterns.
 */
export function Star8({
  size,
  color,
  outline,
  borderWidth = 1.5,
  fill,
  style,
  children,
}: Props) {
  const square = size / Math.SQRT2;
  const shape: ViewStyle = outline
    ? {
        borderColor: color,
        borderWidth,
        backgroundColor: fill ?? 'transparent',
      }
    : { backgroundColor: color };

  return (
    <View style={[{ width: size, height: size }, styles.center, style]}>
      <View
        style={[
          styles.square,
          shape,
          { width: square, height: square, borderRadius: square * 0.12 },
        ]}
      />
      <View
        style={[
          styles.square,
          shape,
          {
            width: square,
            height: square,
            borderRadius: square * 0.12,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  square: { position: 'absolute' },
});
