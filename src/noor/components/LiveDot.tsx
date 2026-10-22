import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/** A dot with a soft ripple, marking something as "now" / live. */
export function LiveDot({
  color,
  animate = true,
}: {
  color: string;
  animate?: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, animate]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.dot,
          styles.ring,
          {
            backgroundColor: color,
            opacity: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 0],
            }),
            transform: [
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.8],
                }),
              },
            ],
          },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ring: { position: 'absolute' },
});
