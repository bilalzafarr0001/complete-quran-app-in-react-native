import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme';

type Props<T extends string | number> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Colours for use on top of the hero gradient. */
  onDark?: boolean;
};

const PAD = 4;

/** Segmented control with a springy sliding thumb. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  onDark,
}: Props<T>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex(o => o.value === value),
  );
  const pos = useRef(new Animated.Value(index)).current;
  const itemWidth = width ? (width - PAD * 2) / options.length : 0;

  useEffect(() => {
    Animated.spring(pos, {
      toValue: index,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [index, pos]);

  const trackColor = onDark ? 'rgba(255,255,255,0.12)' : theme.surfaceAlt;
  const idle = onDark ? 'rgba(255,255,255,0.75)' : theme.muted;

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {itemWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: itemWidth,
              backgroundImage: onDark ? theme.gold3 : theme.green3,
              transform: [
                {
                  translateX: pos.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, itemWidth],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            style={styles.item}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? (onDark ? '#2A1E00' : '#FFFFFF') : idle },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 16, padding: PAD },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 12,
  },
  item: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: { fontSize: 14, fontWeight: '700' },
});
