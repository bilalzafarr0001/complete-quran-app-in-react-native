import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

/** Horizontal shake, used to signal a form error. */
export function useShake() {
  const x = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    x.setValue(0);
    Animated.sequence(
      [12, -12, 9, -9, 4, 0].map(toValue =>
        Animated.timing(x, { toValue, duration: 55, useNativeDriver: true }),
      ),
    ).start();
  }, [x]);

  return { shakeStyle: { transform: [{ translateX: x }] }, shake };
}
