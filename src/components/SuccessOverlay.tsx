import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useColors } from '../theme';

type Props = {
  message: string;
  onDone: () => void;
};

/** Full-screen check-mark burst shown after a successful login / sign up. */
export function SuccessOverlay({ message, onDone }: Props) {
  const colors = useColors();
  const backdrop = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(pop, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(450),
    ]).start(({ finished }) => finished && onDone());
  }, [backdrop, pop, ring, onDone]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.card, opacity: backdrop },
      ]}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: colors.accent,
            opacity: ring.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0],
            }),
            transform: [
              {
                scale: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 2],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundImage: colors.buttonGradient,
            boxShadow: colors.buttonShadow,
            transform: [{ scale: pop }],
          },
        ]}
      >
        <Text style={styles.check}>✓</Text>
      </Animated.View>
      <Animated.Text
        style={[styles.message, { color: colors.text, opacity: pop }]}
      >
        {message}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#FFFFFF', fontSize: 52, fontWeight: '900' },
  message: { fontSize: 22, fontWeight: '800', marginTop: 28 },
});
