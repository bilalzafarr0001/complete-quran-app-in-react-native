import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { ScreenHeader } from '../components/ScreenHeader';
import { Star8 } from '../components/Star8';
import { placeLabel } from '../data/places';
import { usePlace } from '../hooks/usePrayerData';
import { compassPoint, distanceToKaaba, qiblaBearing } from '../logic/qibla';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../theme';

const TICKS = 72;
const LETTERS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

/** Slow ripple from the centre of the dial, like a radar sweep. */
function RadarRing({ size, color }: { size: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(t, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.radar,
        {
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: size * 0.45,
          borderColor: color,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export function QiblaScreen() {
  const theme = useTheme();
  const { contentWidth, height } = useResponsive();
  const { place } = usePlace();
  const bearing = qiblaBearing(place.lat, place.lng);
  const distance = distanceToKaaba(place.lat, place.lng);
  const inMakkah = distance < 5;

  // Fit the dial to both width and height (short phones, landscape, tablets).
  const size = Math.max(220, Math.min(contentWidth - 60, height * 0.42, 360));
  const r = size / 2;

  const spin = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(spin, {
      toValue: 1,
      duration: 1800,
      delay: 300,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, float]);

  const needleRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: [`${bearing - 360}deg`, `${bearing}deg`],
  });

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          back
          title="Qibla"
          arabic="القبلة"
          subtitle={`From ${placeLabel(place)}`}
        />

        <FadeIn delay={120}>
          <View
            style={[styles.dialWrap, { width: size + 40, height: size + 40 }]}
          >
            <View
              style={[
                styles.dial,
                {
                  width: size,
                  height: size,
                  borderRadius: r,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  boxShadow: theme.floatShadow,
                },
              ]}
            >
              {Array.from({ length: TICKS }, (_, i) => {
                const major = i % 18 === 0;
                const mid = i % 6 === 0;
                return (
                  <View
                    key={i}
                    style={[
                      styles.tickArm,
                      {
                        height: size,
                        transform: [{ rotate: `${(i * 360) / TICKS}deg` }],
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: major ? 3 : 1.5,
                        height: major ? 14 : mid ? 10 : 6,
                        borderRadius: 1,
                        backgroundColor: major ? theme.gold : theme.muted,
                        opacity: major ? 1 : 0.5,
                        marginTop: 6,
                      }}
                    />
                  </View>
                );
              })}
              {LETTERS.map(l => (
                <View
                  key={l.label}
                  style={[
                    styles.tickArm,
                    { height: size, transform: [{ rotate: `${l.deg}deg` }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.letter,
                      {
                        color: l.label === 'N' ? theme.danger : theme.text,
                        transform: [{ rotate: `${-l.deg}deg` }],
                      },
                    ]}
                  >
                    {l.label}
                  </Text>
                </View>
              ))}

              <Star8
                size={size * 0.42}
                color={theme.gold}
                outline
                borderWidth={1}
                style={styles.centerStar}
              />

              {/* Needle */}
              <Animated.View
                style={[
                  styles.tickArm,
                  { height: size, transform: [{ rotate: needleRotate }] },
                ]}
              >
                <Animated.View
                  style={[
                    styles.kaaba,
                    {
                      boxShadow: theme.goldGlow,
                      transform: [
                        {
                          translateY: float.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -4],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.kaabaEmoji}>🕋</Text>
                </Animated.View>
                <View
                  style={[
                    styles.needle,
                    {
                      // From just under the Kaaba badge to the edge of the hub.
                      height: Math.max(16, r - 107),
                      backgroundImage: theme.gold3,
                    },
                  ]}
                />
              </Animated.View>
              <RadarRing size={size} color={theme.gold} />
              <View
                style={[
                  styles.hub,
                  { backgroundImage: theme.hero, borderColor: theme.gold },
                ]}
              />
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={240} style={contentColumn}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            ]}
          >
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {Math.round(bearing)}°
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  from North ({compassPoint(bearing)})
                </Text>
              </View>
              <View style={[styles.vr, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {inMakkah
                    ? '—'
                    : `${Math.round(distance).toLocaleString()} km`}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  to the Kaaba
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: theme.goldSoft }]}>
            <Text style={[styles.tipTitle, { color: theme.text }]}>
              How to use
            </Text>
            <Text style={[styles.tip, { color: theme.text }]}>
              Hold your phone flat and point the top towards North (use your
              phone's compass app), then turn to face the 🕋 on the dial.
            </Text>
            <Text style={[styles.tipNote, { color: theme.muted }]}>
              A live, auto-rotating compass needs the device's magnetometer —
              add a sensors package to enable it.
            </Text>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  dialWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  dial: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tickArm: { position: 'absolute', width: 40, alignItems: 'center' },
  letter: { marginTop: 24, fontSize: 18, fontWeight: '900' },
  centerStar: { position: 'absolute', opacity: 0.35 },
  kaaba: {
    marginTop: 46,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1B1B',
  },
  kaabaEmoji: { fontSize: 24 },
  needle: { width: 5, borderRadius: 3, marginTop: 4 },
  radar: { position: 'absolute', borderWidth: 2 },
  hub: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 18 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 12.5, marginTop: 4, textAlign: 'center' },
  vr: { width: 1, height: 40 },
  tipTitle: { fontSize: 15, fontWeight: '800' },
  tip: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  tipNote: { fontSize: 12.5, lineHeight: 18, marginTop: 10 },
});
