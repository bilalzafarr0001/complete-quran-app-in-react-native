import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Staggered fade + slide-up entrance for `count` elements.
 * Usage: const enter = useEntrance(3); <Animated.View style={enter(0)} />
 */
export function useEntrance(count: number, stagger = 90) {
  const values = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.stagger(
      stagger,
      values.map(v =>
        Animated.timing(v, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [values, stagger]);

  return (index: number) => ({
    opacity: values[index],
    transform: [
      {
        translateY: values[index].interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  });
}
