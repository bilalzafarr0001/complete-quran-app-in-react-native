import { useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent } from 'react-native';

export type CollapsibleHeader = {
  translateY: Animated.AnimatedInterpolation<number>;
  titleOpacity: Animated.AnimatedInterpolation<number>;
  onLayout: (e: LayoutChangeEvent) => void;
  onCollapseLayout: (e: LayoutChangeEvent) => void;
};

/**
 * "Quick return" header: the title part slides away while scrolling down and
 * comes back as soon as you scroll up. Search / tabs inside the header stay pinned.
 *
 * Usage: pass `header` to <ScreenHeader collapsible={...}>, `onScroll` to the
 * list, and pad the list content by `headerHeight`.
 */
export function useCollapsibleHeader() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [collapseHeight, setCollapseHeight] = useState(0);
  const range = Math.max(1, collapseHeight);

  const header = useMemo<CollapsibleHeader>(() => {
    const positive = scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolateLeft: 'clamp',
    });
    const clamped = Animated.diffClamp(positive, 0, range);
    return {
      translateY: clamped.interpolate({
        inputRange: [0, range],
        outputRange: [0, -range],
      }),
      titleOpacity: clamped.interpolate({
        inputRange: [0, range * 0.7],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
      onLayout: e => setHeaderHeight(Math.round(e.nativeEvent.layout.height)),
      onCollapseLayout: e =>
        setCollapseHeight(Math.round(e.nativeEvent.layout.height)),
    };
  }, [scrollY, range]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  return { header, headerHeight, onScroll };
}
