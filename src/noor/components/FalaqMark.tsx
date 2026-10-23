import { Animated, Image, StyleSheet, View } from 'react-native';

// Two layers of the logo, rendered by scripts/render-icons.swift on 160pt
// canvases with the mark 90% wide: the arch (with the horizon line) and the sun.
const ARCH = require('../assets/falaq-arch.png');
const SUN = require('../assets/falaq-sun.png');

/** Horizon height as a fraction of the canvas (design-grid y 88, see the script). */
const HORIZON = 0.5 + (32 / 76) * 0.9;
/** Sun radius as a fraction of the canvas. */
const SUN_RADIUS = (19 / 76) * 0.9;

/**
 * The Falaq mark: the sun rising inside an arch. Pass `rise` (0 → 1) to
 * animate the sun up from below the horizon; without it the mark is still.
 */
export function FalaqMark({
  size,
  rise,
}: {
  size: number;
  rise?: Animated.Value;
}) {
  const translateY = rise
    ? rise.interpolate({
        inputRange: [0, 1],
        outputRange: [size * SUN_RADIUS * 1.2, 0],
      })
    : 0;
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel="Falaq: the sun rising inside an arch"
    >
      {/* The sun is clipped at the horizon, so it rises from behind it. */}
      <View style={[styles.clip, { height: size * HORIZON }]}>
        <Animated.Image
          source={SUN}
          style={{ width: size, height: size, transform: [{ translateY }] }}
        />
      </View>
      <Image
        source={ARCH}
        style={[styles.layer, { width: size, height: size }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0 },
});
