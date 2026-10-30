import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onHero, useTheme } from '../theme';
import type { TabName } from './nav';

/** `icon: null` = drawn (the Qibla compass has no fitting text glyph). */
export const TABS: { key: TabName; label: string; icon: string | null }[] = [
  { key: 'home', label: 'Today', icon: '☀︎' },
  { key: 'quran', label: 'Quran', icon: '۞' },
  { key: 'qibla', label: 'Qibla', icon: null },
  { key: 'tasbeeh', label: 'Tasbeeh', icon: '◎' },
  { key: 'more', label: 'More', icon: '☰' },
];

const IDLE = 'rgba(255,255,255,0.72)';

type Props = { tab: TabName; onChange: (tab: TabName) => void };

/**
 * A small compass: ring, hub and an arrowhead pointing out from the centre
 * (a full line across the ring would read as a "no entry" sign).
 */
function QiblaGlyph({ color }: { color: string }) {
  return (
    <View style={[styles.qiblaRing, { borderColor: color }]}>
      <View style={styles.qiblaNeedle}>
        <View style={[styles.qiblaTip, { borderBottomColor: color }]} />
      </View>
      <View style={[styles.qiblaHub, { backgroundColor: color }]} />
    </View>
  );
}

function TabItem({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: string | null;
  onPress: () => void;
}) {
  const t = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [active, t]);

  const iconColor = active ? onHero.gold : IDLE;

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.iconBox,
          {
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -1],
                }),
              },
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
                }),
              },
            ],
          },
        ]}
      >
        {icon === null ? (
          <QiblaGlyph color={iconColor} />
        ) : (
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.icon, { color: iconColor }]}
          >
            {icon}
          </Text>
        )}
      </Animated.View>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={[styles.label, active ? styles.labelActive : styles.labelIdle]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Floating dock at the bottom of the app (Today, Quran, Qibla, Tasbeeh, More)
 * with a highlight that glides to the selected tool.
 */
export function TabBar({ tab, onChange }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex(t => t.key === tab);
  const pos = useRef(new Animated.Value(index)).current;
  const itemWidth = width / TABS.length;
  const stretch = pos.interpolate({
    inputRange: TABS.flatMap((_, i) => (i ? [i - 0.5, i] : [i])),
    outputRange: TABS.flatMap((_, i) => (i ? [1.25, 1] : [1])),
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
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={[
          styles.dock,
          theme.isDark ? styles.dockShadowDark : styles.dockShadow,
          { backgroundColor: theme.dock, borderColor: theme.dockBorder },
        ]}
      >
        <View
          style={styles.row}
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.highlightWrap,
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
              {/* Stretches mid-slide, like a droplet moving between tools. */}
              <Animated.View
                style={[styles.highlight, { transform: [{ scaleX: stretch }] }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6 },
  dock: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 32,
    borderWidth: 1,
    padding: 5,
  },
  dockShadow: { boxShadow: '0px 12px 28px rgba(42,21,32,0.28)' },
  dockShadowDark: { boxShadow: '0px 10px 28px rgba(0,0,0,0.55)' },
  row: { flexDirection: 'row' },
  highlightWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    width: '88%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  iconBox: { height: 24, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 19, lineHeight: 24, textAlign: 'center' },
  label: { fontSize: 11, marginTop: 2 },
  labelActive: { color: '#FFFFFF', fontWeight: '800' },
  labelIdle: { color: IDLE, fontWeight: '700' },
  qiblaRing: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Twice the tip's height, so rotating it pivots on the ring's centre.
  qiblaNeedle: {
    position: 'absolute',
    width: 8,
    height: 14,
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  qiblaTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  qiblaHub: { width: 4, height: 4, borderRadius: 2 },
});
