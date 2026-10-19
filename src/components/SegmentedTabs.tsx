import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '../theme';

type Props<T extends string> = {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
};

const PAD = 4;

/** Pill-style tab switcher with a sliding gradient indicator. */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: Props<T>) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const index = tabs.findIndex(t => t.key === value);
  const pos = useRef(new Animated.Value(index)).current;
  const tabWidth = width ? (width - PAD * 2) / tabs.length : 0;

  useEffect(() => {
    Animated.spring(pos, {
      toValue: index,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [index, pos]);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.track, { backgroundColor: colors.tabTrack }]}
      onLayout={onLayout}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth,
              backgroundImage: colors.buttonGradient,
              boxShadow: colors.buttonShadow,
              transform: [
                {
                  translateX: pos.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, tabWidth],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {tabs.map(tab => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                active ? styles.activeLabel : { color: colors.muted },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: PAD,
    marginBottom: 24,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 14,
  },
  tab: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
  activeLabel: { color: '#FFFFFF' },
});
