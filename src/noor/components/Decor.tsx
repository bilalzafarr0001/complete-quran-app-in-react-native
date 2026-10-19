import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Star8 } from './Star8';

/** A field of softly twinkling stars for night-sky hero backgrounds. */
export const StarField = memo(function StarFieldInner({
  count = 18,
  height = 260,
  seed = 7,
}: {
  count?: number;
  height?: number;
  seed?: number;
}) {
  const stars = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({
      left: `${rand() * 100}%` as const,
      top: rand() * height,
      size: 1.5 + rand() * 2.5,
      delay: rand() * 2500,
      duration: 1400 + rand() * 1800,
    }));
  }, [count, height, seed]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star, i) => (
        <Twinkle key={i} {...star} />
      ))}
    </View>
  );
});

function Twinkle({
  left,
  top,
  size,
  delay,
  duration,
}: {
  left: `${number}%`;
  top: number;
  size: number;
  delay: number;
  duration: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: t.interpolate({
            inputRange: [0, 1],
            outputRange: [0.15, 0.9],
          }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1.3],
              }),
            },
          ],
        },
      ]}
    />
  );
}

/** Large, slowly rotating geometric star used as a watermark. */
export const SpinningStar = memo(function SpinningStarInner({
  size,
  color,
  duration = 60000,
  style,
}: {
  size: number;
  color: string;
  duration?: number;
  style?: object;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, duration]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, style, { transform: [{ rotate }] }]}
    >
      <Star8 size={size} color={color} outline borderWidth={1.5} />
      <Star8
        size={size * 0.72}
        color={color}
        outline
        borderWidth={1}
        style={styles.abs}
      />
      <Star8
        size={size * 0.44}
        color={color}
        outline
        borderWidth={1}
        style={styles.abs}
      />
    </Animated.View>
  );
});

/** Crescent moon drawn with an inset shadow — no images needed. */
export const Crescent = memo(function CrescentInner({
  size,
  color,
  glow,
}: {
  size: number;
  color: string;
  glow?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        boxShadow: `inset ${size * 0.22}px ${-size * 0.08}px 0px 0px ${color}${
          glow ? `, ${glow}` : ''
        }`,
      }}
    />
  );
});

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#FFFFFF' },
  abs: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
