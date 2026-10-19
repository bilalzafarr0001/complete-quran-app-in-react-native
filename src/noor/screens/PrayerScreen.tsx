import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Crescent } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { RollingCountdown } from '../components/RollingCountdown';
import { ScreenHeader } from '../components/ScreenHeader';
import { usePrayerData } from '../hooks/usePrayerData';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { dateKey, formatGregorian } from '../logic/dates';
import { formatHijri, toHijri } from '../logic/hijri';
import { offsetOn } from '../logic/timezone';
import {
  addDays,
  calculatePrayerTimes,
  formatTime,
  METHODS,
  PRAYER_KEYS,
  PRAYER_LABELS,
  PrayerKey,
  SALAH_KEYS,
} from '../logic/prayerTimes';
import { placeLabel } from '../data/places';
import {
  ALERT_ICON,
  ALERT_LABEL,
  useAdhanControls,
} from '../hooks/useAdhanControls';
import { useNav } from '../navigation/nav';
import { openNotificationSettings } from '../services/adhan';
import type { SalahKey } from '../store';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

const ICONS: Record<PrayerKey, string> = {
  fajr: '🌄',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌇',
  isha: '🌙',
};

/** Half-circle sky with the sun (day) or moon (night) placed by the current time. */
function SunArc({
  hours,
  sunrise,
  sunset,
  width: w,
}: {
  hours: number;
  sunrise: number;
  sunset: number;
  width: number;
}) {
  const r = w / 2;
  const isDay = hours >= sunrise && hours < sunset;
  const nightLength = 24 - sunset + sunrise;
  const p = isDay
    ? (hours - sunrise) / (sunset - sunrise)
    : (hours >= sunset ? hours - sunset : 24 - sunset + hours) / nightLength;
  const angle = Math.PI * (1 - p);
  const ORB = 26;
  const x = r + r * Math.cos(angle) - ORB / 2;
  const y = r - r * Math.sin(angle) - ORB / 2;

  const pulse = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, enter]);

  return (
    <View style={[styles.arcWrap, { width: w, height: r + 16 }]}>
      <View style={[styles.arcClip, { width: w, height: r }]}>
        <View style={[styles.arc, { width: w, height: w, borderRadius: r }]} />
      </View>
      <View style={[styles.horizon, { width: w + 30 }]} />
      <Animated.View
        style={[
          styles.orb,
          {
            left: x,
            top: y,
            opacity: enter,
            transform: [
              {
                translateX: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [r - x - ORB / 2, 0],
                }),
              },
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [r - y, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.halo,
            isDay ? styles.haloDay : styles.haloNight,
            {
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.7],
                  }),
                },
              ],
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 0],
              }),
            },
          ]}
        />
        {isDay ? (
          <View style={styles.sun} />
        ) : (
          <Crescent
            size={ORB}
            color="#F7E7B4"
            glow="0px 0px 14px rgba(247,231,180,0.6)"
          />
        )}
      </Animated.View>
    </View>
  );
}

/** Soft breathing gold outline used to highlight the upcoming prayer. */
function NextGlow() {
  const theme = useTheme();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
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
        StyleSheet.absoluteFill,
        styles.glow,
        {
          borderColor: theme.gold,
          opacity: t.interpolate({
            inputRange: [0, 1],
            outputRange: [0.25, 0.95],
          }),
        },
      ]}
    />
  );
}

/** One tracker segment that fills from the left when its prayer is done. */
function Segment({ done }: { done: boolean }) {
  const theme = useTheme();
  const t = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(t, {
      toValue: done ? 1 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [done, t]);
  return (
    <View style={[styles.segment, { backgroundColor: theme.surfaceAlt }]}>
      <Animated.View
        style={[
          styles.segmentFill,
          { backgroundImage: theme.gold3, transform: [{ scaleX: t }] },
        ]}
      />
    </View>
  );
}

/** Per-prayer alert toggle (🔊 adhan → 🔔 sound → 🔕 off). */
function AlertButton({
  icon,
  label,
  onPress,
  onDark,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  onDark?: boolean;
}) {
  const theme = useTheme();
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.setValue(0.6);
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [icon, pop]);
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={label}
      style={[
        styles.alertBtn,
        { backgroundColor: onDark ? onHero.faint : theme.surfaceAlt },
      ]}
    >
      <Animated.Text
        style={[styles.alertIcon, { transform: [{ scale: pop }] }]}
      >
        {icon}
      </Animated.Text>
    </PressableScale>
  );
}

function CheckCircle({
  checked,
  onPress,
  onDark,
  disabled,
}: {
  checked: boolean;
  onPress: () => void;
  onDark?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const pop = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    Animated.spring(pop, {
      toValue: checked ? 1 : 0,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
    if (first.current) {
      first.current = false;
      return;
    }
    if (checked) {
      ring.setValue(0);
      Animated.timing(ring, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [checked, pop, ring]);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={checked ? 'Mark as not prayed' : 'Mark as prayed'}
      hitSlop={8}
      style={[
        styles.check,
        onDark ? styles.checkOnDark : { borderColor: theme.border },
        disabled && styles.checkDisabled,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.checkRing,
          {
            borderColor: theme.gold,
            opacity: ring.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 0],
            }),
            transform: [
              {
                scale: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.checkFill,
          {
            backgroundImage: theme.gold3,
            opacity: pop,
            transform: [{ scale: pop }],
          },
        ]}
      >
        <Text style={styles.checkMark}>✓</Text>
      </Animated.View>
    </PressableScale>
  );
}

export function PrayerScreen() {
  const theme = useTheme();
  const nav = useNav();
  const { contentWidth, height, fs } = useResponsive();
  const { state, togglePrayed } = useStore();
  const adhan = useAdhanControls();
  const { place, hijriAdjust, now, today, date, status, nextAt, refresh } =
    usePrayerData();
  const [offset, setOffset] = useState(0);

  const selected = useMemo(() => addDays(date, offset), [date, offset]);
  const times = useMemo(
    () =>
      offset === 0
        ? today
        : calculatePrayerTimes(
            selected,
            place,
            offsetOn(place, selected),
            state.method,
            state.madhab,
          ),
    [offset, today, selected, place, state.method, state.madhab],
  );
  const key = dateKey(selected);
  const prayed = state.prayed[key] ?? [];
  const doneCount = SALAH_KEYS.filter(k => prayed.includes(k)).length;
  // Keep the sky arc modest on short screens so the prayer list stays visible.
  const arcWidth = Math.min(
    contentWidth - 80,
    420,
    Math.max(200, height * 0.34),
  );

  const dayLabel =
    offset === 0
      ? 'Today'
      : offset === 1
      ? 'Tomorrow'
      : offset === -1
      ? 'Yesterday'
      : formatGregorian(selected, false);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Prayer Times"
          arabic="مواقيت الصلاة"
          subtitle={placeLabel(place)}
          right={
            <PressableScale
              style={styles.qiblaBtn}
              onPress={() => nav.push({ name: 'qibla' })}
              accessibilityLabel="Qibla direction"
            >
              <Text maxFontSizeMultiplier={1.2} style={styles.qiblaText}>
                🧭 Qibla
              </Text>
            </PressableScale>
          }
        >
          <View style={styles.arcBox}>
            <SunArc
              hours={now.hours}
              sunrise={today.sunrise}
              sunset={today.maghrib}
              width={arcWidth}
            />
            <View style={[styles.arcLabels, { width: arcWidth + 30 }]}>
              <Text maxFontSizeMultiplier={1.2} style={styles.arcLabel}>
                Sunrise {formatTime(today.sunrise)}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.arcLabel}>
                Sunset {formatTime(today.maghrib)}
              </Text>
            </View>
            <FadeIn key={status.next} distance={8}>
              <Text maxFontSizeMultiplier={1.3} style={styles.nextLabel}>
                {PRAYER_LABELS[status.next].en} in
              </Text>
            </FadeIn>
            <RollingCountdown
              target={nextAt}
              fontSize={fs(38)}
              style={styles.nextCountdown}
              onElapsed={refresh}
            />
          </View>
        </ScreenHeader>

        <View style={contentColumn}>
          {/* Date switcher */}
          <FadeIn delay={80}>
            <View
              style={[
                styles.dateBar,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              <PressableScale
                style={[
                  styles.dateArrow,
                  { backgroundColor: theme.surfaceAlt },
                ]}
                onPress={() => setOffset(o => o - 1)}
                accessibilityLabel="Previous day"
              >
                <Text style={[styles.dateArrowText, { color: theme.text }]}>
                  ‹
                </Text>
              </PressableScale>
              <PressableScale
                style={styles.dateCenter}
                onPress={() => setOffset(0)}
                scaleTo={0.98}
                accessibilityLabel="Back to today"
              >
                <FadeIn key={key} distance={6}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.dateTitle, { color: theme.text }]}
                  >
                    {dayLabel}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.dateSub, { color: theme.muted }]}
                  >
                    {formatGregorian(selected)}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.dateSub, { color: theme.gold }]}
                  >
                    {formatHijri(toHijri(selected, hijriAdjust))}
                  </Text>
                </FadeIn>
              </PressableScale>
              <PressableScale
                style={[
                  styles.dateArrow,
                  { backgroundColor: theme.surfaceAlt },
                ]}
                onPress={() => setOffset(o => o + 1)}
                accessibilityLabel="Next day"
              >
                <Text style={[styles.dateArrowText, { color: theme.text }]}>
                  ›
                </Text>
              </PressableScale>
            </View>
          </FadeIn>

          {!adhan.settings.enabled || adhan.blocked ? (
            <FadeIn delay={90}>
              <PressableScale
                onPress={
                  adhan.blocked ? openNotificationSettings : adhan.enable
                }
                scaleTo={0.98}
                style={[
                  styles.adhanBanner,
                  {
                    backgroundImage: theme.green3,
                    boxShadow: theme.floatShadow,
                  },
                ]}
                accessibilityLabel="Turn on adhan notifications"
              >
                <Text style={styles.adhanEmoji}>🕌</Text>
                <View style={styles.flex}>
                  <Text style={styles.adhanTitle}>
                    Hear the adhan at every prayer
                  </Text>
                  <Text style={styles.adhanBody}>
                    {adhan.error ??
                      'Full adhan (special Fajr adhan) on time, even when Noor is closed.'}
                  </Text>
                </View>
                <View style={styles.adhanBtn}>
                  <Text style={styles.adhanBtnText}>Turn on</Text>
                </View>
              </PressableScale>
            </FadeIn>
          ) : null}

          {/* Times */}
          <View style={styles.list}>
            {PRAYER_KEYS.map((k, i) => {
              const isNext = offset === 0 && k === status.next;
              const isPast =
                offset < 0 || (offset === 0 && times[k] <= now.hours);
              const isSalah = k !== 'sunrise';
              const done = prayed.includes(k);
              const faded = isPast && !isNext;
              return (
                <FadeIn key={`${key}-${k}`} delay={100 + i * 55}>
                  <View
                    style={[
                      styles.row,
                      {
                        backgroundColor: theme.surface,
                        boxShadow: theme.cardShadow,
                      },
                      isNext && {
                        backgroundImage: theme.green3,
                        boxShadow: theme.floatShadow,
                      },
                    ]}
                  >
                    {isNext ? <NextGlow /> : null}
                    <View
                      style={[
                        styles.rowIcon,
                        {
                          backgroundColor: isNext
                            ? onHero.faint
                            : theme.surfaceAlt,
                        },
                      ]}
                    >
                      <Text maxFontSizeMultiplier={1.2} style={styles.rowEmoji}>
                        {ICONS[k]}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={1}
                        style={[
                          styles.rowName,
                          { color: isNext ? onHero.text : theme.text },
                          faded && styles.past,
                        ]}
                      >
                        {PRAYER_LABELS[k].en}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={1}
                        style={[
                          styles.rowArabic,
                          { color: isNext ? onHero.gold : theme.muted },
                        ]}
                      >
                        {PRAYER_LABELS[k].ar}
                        {isNext ? '  ·  up next' : ''}
                      </Text>
                    </View>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={[
                        styles.rowTime,
                        { color: isNext ? onHero.text : theme.text },
                        faded && styles.past,
                      ]}
                    >
                      {formatTime(times[k])}
                    </Text>
                    <AlertButton
                      icon={
                        !adhan.settings.enabled
                          ? '🔕'
                          : isSalah
                          ? ALERT_ICON[adhan.settings.modes[k as SalahKey]]
                          : adhan.settings.sunrise
                          ? '🔔'
                          : '🔕'
                      }
                      label={
                        isSalah
                          ? `${PRAYER_LABELS[k].en} alert: ${
                              adhan.settings.enabled
                                ? ALERT_LABEL[
                                    adhan.settings.modes[k as SalahKey]
                                  ]
                                : 'Off'
                            }. Tap to change`
                          : `Sunrise alert: ${
                              adhan.settings.sunrise ? 'On' : 'Off'
                            }`
                      }
                      onDark={isNext}
                      onPress={() =>
                        isSalah
                          ? adhan.cycle(k as SalahKey)
                          : adhan.settings.enabled
                          ? adhan.updateNotifications({
                              sunrise: !adhan.settings.sunrise,
                            })
                          : adhan.enable()
                      }
                    />
                    {isSalah ? (
                      <CheckCircle
                        checked={done}
                        onDark={isNext}
                        onPress={() => togglePrayed(key, k)}
                        disabled={
                          offset > 0 || (offset === 0 && times[k] > now.hours)
                        }
                      />
                    ) : (
                      <View style={styles.checkSpacer} />
                    )}
                  </View>
                </FadeIn>
              );
            })}
          </View>

          {/* Progress */}
          <FadeIn delay={460}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Salah tracker
                </Text>
                <Text style={[styles.cardValue, { color: theme.primary }]}>
                  {doneCount}/5
                </Text>
              </View>
              <View style={styles.segments}>
                {SALAH_KEYS.map(k => (
                  <Segment key={k} done={prayed.includes(k)} />
                ))}
              </View>
              <Text style={[styles.cardNote, { color: theme.muted }]}>
                {doneCount === 5
                  ? 'MashaAllah! All five prayers completed.'
                  : 'Tap the circle next to a prayer once you have prayed it.'}
              </Text>
            </View>
          </FadeIn>

          <FadeIn delay={520}>
            <PressableScale
              style={[
                styles.card,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
              onPress={() => nav.push({ name: 'settings' })}
              scaleTo={0.98}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Calculation
                </Text>
                <Text style={[styles.change, { color: theme.primary }]}>
                  Change ›
                </Text>
              </View>
              <Text style={[styles.cardNote, { color: theme.muted }]}>
                {METHODS[state.method].name} · Asr{' '}
                {state.madhab === 'hanafi'
                  ? 'Hanafi'
                  : "Standard (Shafi'i, Maliki, Hanbali)"}
              </Text>
            </PressableScale>
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  qiblaBtn: {
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  qiblaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  arcBox: { alignItems: 'center', marginTop: 18 },
  arcWrap: { alignItems: 'center' },
  arcClip: { overflow: 'hidden' },
  arc: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(241,207,116,0.45)',
  },
  horizon: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  orb: {
    position: 'absolute',
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: 26, height: 26, borderRadius: 13 },
  haloDay: { backgroundColor: 'rgba(255,214,102,0.35)' },
  haloNight: { backgroundColor: 'rgba(255,255,255,0.18)' },
  sun: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD666',
    boxShadow: '0px 0px 18px rgba(255,214,102,0.9)',
  },
  arcLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  arcLabel: { color: onHero.soft, fontSize: 12, fontWeight: '600' },
  nextLabel: {
    color: onHero.soft,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  nextCountdown: { color: onHero.gold, fontWeight: '900', letterSpacing: 1 },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 8,
    gap: 6,
  },
  dateArrow: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: { fontSize: 26, fontWeight: '400', marginTop: -2 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  dateSub: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  list: { paddingHorizontal: 16, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  glow: { borderRadius: 20, borderWidth: 1.5 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 22 },
  rowName: { fontSize: 16, fontWeight: '800' },
  rowArabic: { fontSize: 13, marginTop: 2 },
  rowTime: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  past: { opacity: 0.55 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOnDark: { borderColor: 'rgba(255,255,255,0.6)' },
  checkDisabled: { opacity: 0.35 },
  checkRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  checkFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#2A1E00', fontWeight: '900', fontSize: 15 },
  checkSpacer: { width: 30 },
  alertBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: { fontSize: 16 },
  adhanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    padding: 14,
  },
  adhanEmoji: { fontSize: 28 },
  adhanTitle: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },
  adhanBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  adhanBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  adhanBtnText: { color: onHero.gold, fontWeight: '900', fontSize: 13 },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 22, padding: 18 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardValue: { fontSize: 18, fontWeight: '900' },
  change: { fontSize: 14, fontWeight: '800' },
  segments: { flexDirection: 'row', gap: 6, marginTop: 14 },
  segment: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  segmentFill: { flex: 1, borderRadius: 4, transformOrigin: 'left' },
  cardNote: { fontSize: 13, marginTop: 10, lineHeight: 19 },
});
