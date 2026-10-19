import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

type BlobProps = {
  size: number;
  color: string;
  top: number;
  left: number;
  duration: number;
  drift: number;
};

function Blob({ size, color, top, left, duration, drift }: BlobProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0, drift],
              }),
            },
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0, drift * 0.6],
              }),
            },
            {
              scale: t.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.15],
              }),
            },
          ],
        },
      ]}
    />
  );
}

/** Slowly drifting translucent circles that give the gradient hero some life. */
export function AnimatedBackground() {
  return (
    <>
      <Blob
        size={300}
        color="rgba(255,255,255,0.10)"
        top={-120}
        left={-90}
        duration={6000}
        drift={40}
      />
      <Blob
        size={200}
        color="rgba(255,255,255,0.08)"
        top={60}
        left={230}
        duration={7500}
        drift={-35}
      />
      <Blob
        size={120}
        color="rgba(255,255,255,0.12)"
        top={210}
        left={30}
        duration={5200}
        drift={25}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
});
