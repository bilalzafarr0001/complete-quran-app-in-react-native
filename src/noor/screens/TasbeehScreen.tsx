import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { DHIKR, TASBEEH_TARGETS } from '../data/dhikr';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

const BEADS = 33;
const PARTICLES = 14;

const Bead = memo(function BeadInner({
  lit,
  x,
  y,
  size,
  litColor,
  idleColor,
}: {
  lit: boolean;
  x: number;
  y: number;
  size: number;
  litColor: string;
  idleColor: string;
}) {
  const s = useRef(new Animated.Value(lit ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(s, {
      toValue: lit ? 1 : 0,
      friction: 4,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [lit, s]);

  return (
    <View
      style={[
        styles.beadSlot,
        { left: x - size / 2, top: y - size / 2, width: size, height: size },
      ]}
    >
      <View
        style={[
          styles.bead,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: idleColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bead,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundImage: litColor,
            opacity: s,
            transform: [
              {
                scale: s.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
});

function Burst({ trigger, radius }: { trigger: number; radius: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, t]);

  return (
    <View pointerEvents="none" style={styles.burst}>
      {Array.from({ length: PARTICLES }, (_, i) => {
        const a = (i / PARTICLES) * Math.PI * 2;
        const dist = radius * (0.9 + (i % 3) * 0.15);
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                backgroundColor: i % 2 ? '#FFC58A' : '#EE8FAA',
                opacity: t.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: t.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(a) * dist],
                    }),
                  },
                  {
                    translateY: t.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin(a) * dist],
                    }),
                  },
                  {
                    scale: t.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.4, 0.4],
                    }),
                  },
                  { rotate: `${i * 40}deg` },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function TasbeehScreen() {
  const theme = useTheme();
  const { contentWidth, height } = useResponsive();
  const { state, tasbeehTap, tasbeehReset, tasbeehConfig, update } = useStore();
  const { count, target, dhikrId, total } = state.tasbeeh;
  const dhikr = DHIKR.find(d => d.id === dhikrId) ?? DHIKR[0];

  // Fit the counter to both width and height (short phones, landscape, tablets).
  const box = Math.max(240, Math.min(contentWidth - 40, height * 0.46, 380));
  const ringR = box / 2 - 14;
  const core = box * 0.6;

  const within = count % target;
  const complete = count > 0 && within === 0;
  const lit = complete ? BEADS : Math.round((within / target) * BEADS);
  const rounds = Math.floor(count / target);

  const press = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const countPop = useRef(new Animated.Value(1)).current;
  const [burst, setBurst] = useState(0);
  const breath = useRef(new Animated.Value(0)).current;

  // Keep the chosen dhikr's chip in view, e.g. when Durood is picked from
  // Today (its chip is at the end of the row).
  const chipScroll = useRef<ScrollViewInstance>(null);
  const chipAt = useRef<Record<string, { x: number; width: number }>>({});
  const chipView = useRef({ x: 0, width: 0 });
  const chosen = useRef(dhikrId);
  chosen.current = dhikrId;
  const revealChip = useCallback((animated: boolean) => {
    const chip = chipAt.current[chosen.current];
    const view = chipView.current;
    if (!chip || !view.width) return;
    const pad = 20;
    let x: number | null = null;
    if (chip.x - pad < view.x) x = Math.max(0, chip.x - pad);
    else if (chip.x + chip.width + pad > view.x + view.width) {
      x = chip.x + chip.width + pad - view.width;
    }
    if (x !== null) {
      chipView.current.x = x;
      chipScroll.current?.scrollTo({ x, animated });
    }
  }, []);
  useEffect(() => revealChip(true), [dhikrId, revealChip]);

  // Idle "breathing" glow around the counter.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const onTap = () => {
    tasbeehTap();
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    countPop.setValue(1.25);
    Animated.spring(countPop, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
    if ((count + 1) % target === 0) {
      setBurst(b => b + 1);
      if (state.vibrate) Vibration.vibrate(350);
    }
  };

  const pressTo = (v: number) =>
    Animated.spring(press, {
      toValue: v,
      speed: 50,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Tasbeeh"
          arabic="التسبيح"
          subtitle={`Lifetime dhikr: ${total.toLocaleString()}`}
        >
          <ScrollView
            ref={chipScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroll}
            onLayout={e => {
              chipView.current.width = e.nativeEvent.layout.width;
              revealChip(false);
            }}
            onScroll={e => {
              chipView.current.x = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={32}
          >
            {DHIKR.map(d => {
              const active = d.id === dhikrId;
              return (
                <PressableScale
                  key={d.id}
                  onLayout={e => {
                    const { x, width } = e.nativeEvent.layout;
                    chipAt.current[d.id] = { x, width };
                    if (active) revealChip(false);
                  }}
                  onPress={() => tasbeehConfig({ dhikrId: d.id })}
                  style={[
                    styles.chip,
                    active
                      ? {
                          backgroundImage: theme.gold3,
                          borderColor: 'transparent',
                        }
                      : null,
                  ]}
                >
                  <Text
                    style={[styles.chipArabic, active && styles.chipActiveText]}
                  >
                    {d.arabic}
                  </Text>
                  <Text
                    style={[styles.chipLatin, active && styles.chipActiveText]}
                  >
                    {d.transliteration}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </ScreenHeader>

        <FadeIn delay={100}>
          <View style={[styles.counter, { width: box, height: box }]}>
            {Array.from({ length: BEADS }, (_, i) => {
              const a = -Math.PI / 2 + (i / BEADS) * Math.PI * 2;
              return (
                <Bead
                  key={i}
                  lit={i < lit}
                  x={box / 2 + Math.cos(a) * ringR}
                  y={box / 2 + Math.sin(a) * ringR}
                  size={14}
                  litColor={theme.gold3}
                  idleColor={theme.border}
                />
              );
            })}

            <Animated.View
              pointerEvents="none"
              style={[
                styles.ripple,
                {
                  width: core,
                  height: core,
                  borderRadius: core / 2,
                  borderColor: theme.gold,
                  opacity: ripple.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 0],
                  }),
                  transform: [
                    {
                      scale: ripple.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.45],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Burst trigger={burst} radius={box / 2} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.breath,
                {
                  width: core,
                  height: core,
                  borderRadius: core / 2,
                  boxShadow: theme.goldGlow,
                  opacity: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 0.8],
                  }),
                  transform: [
                    {
                      scale: breath.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.07],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Pressable
              onPress={onTap}
              onPressIn={() => pressTo(1)}
              onPressOut={() => pressTo(0)}
              accessibilityRole="button"
              accessibilityLabel={`Count ${dhikr.transliteration}. Current count ${within} of ${target}`}
            >
              <Animated.View
                style={[
                  styles.core,
                  {
                    width: core,
                    height: core,
                    borderRadius: core / 2,
                    backgroundImage: theme.hero,
                    boxShadow: `${theme.floatShadow}, inset 0px 0px 0px 3px rgba(255,197,138,0.45)`,
                    transform: [
                      {
                        scale: press.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.94],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <FadeIn key={dhikrId} distance={8}>
                  <Text
                    maxFontSizeMultiplier={1}
                    style={[styles.coreArabic, { fontSize: core * 0.12 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {dhikr.arabic}
                  </Text>
                </FadeIn>
                <Animated.Text
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.coreCount,
                    { fontSize: core * 0.28, transform: [{ scale: countPop }] },
                  ]}
                >
                  {complete ? target : within}
                </Animated.Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.coreTarget}>
                  of {target}
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        </FadeIn>

        <FadeIn delay={180} style={contentColumn}>
          <Text style={[styles.meaning, { color: theme.text }]}>
            “{dhikr.meaning}”
          </Text>
          <Text
            style={[
              styles.status,
              { color: complete ? theme.primary : theme.muted },
            ]}
          >
            {complete
              ? `MashaAllah! Round ${rounds} complete — keep going.`
              : rounds > 0
              ? `${rounds} round${
                  rounds > 1 ? 's' : ''
                } completed · tap to continue`
              : 'Tap the circle to count'}
          </Text>
        </FadeIn>

        <FadeIn delay={240} style={contentColumn}>
          <View
            style={[
              styles.panel,
              { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            ]}
          >
            <Text style={[styles.panelLabel, { color: theme.muted }]}>
              TARGET
            </Text>
            <Segmented
              value={target}
              onChange={v => tasbeehConfig({ target: v })}
              options={TASBEEH_TARGETS.map(t => ({
                value: t,
                label: String(t),
              }))}
            />
            <View style={[styles.panelRow, { borderColor: theme.border }]}>
              <Text style={[styles.panelText, { color: theme.text }]}>
                Vibrate on completion
              </Text>
              <Switch
                value={state.vibrate}
                onValueChange={v => update({ vibrate: v })}
                trackColor={{ true: theme.primary, false: theme.border }}
                thumbColor="#FFFFFF"
              />
            </View>
            <PressableScale
              style={[styles.reset, { backgroundColor: theme.surfaceAlt }]}
              onPress={tasbeehReset}
            >
              <Text style={[styles.resetText, { color: theme.danger }]}>
                ↺ Reset counter
              </Text>
            </PressableScale>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30, alignItems: 'stretch' },
  chipScroll: { marginTop: 16, marginHorizontal: -20 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
    alignItems: 'center',
  },
  chipArabic: { color: onHero.gold, fontSize: 17 },
  chipLatin: {
    color: onHero.soft,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  chipActiveText: { color: '#3A1630' },
  counter: {
    alignSelf: 'center',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadSlot: { position: 'absolute' },
  bead: { position: 'absolute' },
  ripple: { position: 'absolute', borderWidth: 3 },
  burst: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: { position: 'absolute', width: 10, height: 10, borderRadius: 3 },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  coreArabic: { color: onHero.gold },
  breath: { position: 'absolute' },
  coreCount: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  coreTarget: { color: onHero.soft, fontSize: 13, fontWeight: '700' },
  meaning: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 16,
    paddingHorizontal: 30,
  },
  status: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  panel: { marginHorizontal: 16, marginTop: 22, borderRadius: 22, padding: 18 },
  panelLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  panelText: { fontSize: 15, fontWeight: '600' },
  reset: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '800' },
});
