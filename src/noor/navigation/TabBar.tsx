import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import type { TabName } from './nav';

export const TABS: { key: TabName; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'quran', label: 'Quran', icon: '۞' },
  { key: 'prayer', label: 'Prayer', icon: '☾' },
  { key: 'tasbeeh', label: 'Tasbeeh', icon: '◎' },
  { key: 'more', label: 'More', icon: '☰' },
];

type Props = { tab: TabName; onChange: (tab: TabName) => void };

function TabItem({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const t = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [active, t]);

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.Text
        maxFontSizeMultiplier={1.2}
        style={[
          styles.icon,
          {
            color: active ? theme.primary : theme.muted,
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.18],
                }),
              },
            ],
          },
        ]}
      >
        {icon}
      </Animated.Text>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={[styles.label, { color: active ? theme.primary : theme.muted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Floating bottom tab bar with a sliding gold indicator. */
export function TabBar({ tab, onChange }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex(t => t.key === tab);
  const pos = useRef(new Animated.Value(index)).current;
  const itemWidth = width / TABS.length;
  const stretch = pos.interpolate({
    inputRange: TABS.flatMap((_, i) => (i ? [i - 0.5, i] : [i])),
    outputRange: TABS.flatMap((_, i) => (i ? [1.45, 1] : [1])),
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(pos, {
      toValue: index,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [index, pos]);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.tabBar,
          paddingBottom: Math.max(insets.bottom, 10),
          boxShadow: theme.isDark
            ? '0px -6px 24px rgba(0,0,0,0.5)'
            : '0px -6px 24px rgba(58,22,48,0.08)',
        },
      ]}
    >
      <View
        style={styles.row}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Animated.View
            style={[
              styles.indicatorWrap,
              {
                width: itemWidth,
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
          >
            <View
              style={[styles.indicator, { backgroundImage: theme.gold3 }]}
            />
            {/* The pill stretches mid-slide, like a droplet moving between tabs. */}
            <Animated.View
              style={[
                styles.pill,
                {
                  backgroundColor: theme.primarySoft,
                  transform: [{ scaleX: stretch }],
                },
              ]}
            />
          </Animated.View>
        )}
        {TABS.map(t => (
          <TabItem
            key={t.key}
            active={t.key === tab}
            label={t.label}
            icon={t.icon}
            onPress={() => onChange(t.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  indicatorWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  indicator: { width: 26, height: 3, borderRadius: 2, marginTop: -8 },
  pill: {
    position: 'absolute',
    top: 2,
    width: 54,
    height: 34,
    borderRadius: 17,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  icon: { fontSize: 21, height: 28, lineHeight: 28, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
