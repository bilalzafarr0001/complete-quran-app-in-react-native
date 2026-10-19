import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  delay?: number;
  distance?: number;
  /** Start slightly smaller and grow in (e.g. 0.9). */
  scaleFrom?: number;
  /** Set false to render immediately (e.g. list rows mounted while scrolling). */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Fades and slides its children up when first mounted. */
export function FadeIn({
  children,
  delay = 0,
  distance = 18,
  scaleFrom,
  animate = true,
  style,
}: Props) {
  const t = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.timing(t, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, delay, animate]);

  if (!animate) {
    return <View style={style}>{children}</View>;
  }

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });
  const transform =
    scaleFrom === undefined
      ? [{ translateY }]
      : [
          { translateY },
          {
            scale: t.interpolate({
              inputRange: [0, 1],
              outputRange: [scaleFrom, 1],
            }),
          },
        ];

  return (
    <Animated.View style={[style, { opacity: t, transform }]}>
      {children}
    </Animated.View>
  );
}
