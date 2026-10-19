import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crescent, SpinningStar, StarField } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { RollingCountdown } from '../components/RollingCountdown';
import { headerStyles } from '../components/ScreenHeader';
import { Star8 } from '../components/Star8';
import { NAMES_OF_ALLAH } from '../data/names';
import { DAILY_VERSES } from '../data/quran';
import { getSurah } from '../data/surahs';
import { usePrayerData } from '../hooks/usePrayerData';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { dayIndex, formatGregorian, greetingFor } from '../logic/dates';
import { formatHijri } from '../logic/hijri';
import { formatTime, PRAYER_LABELS, SALAH_KEYS } from '../logic/prayerTimes';
import { useNav } from '../navigation/nav';
import { useStore } from '../store';
import { onHero, Theme, useTheme } from '../theme';

const QUICK: {
  key: string;
  label: string;
  icon: string;
  tint: (t: Theme) => string;
}[] = [
  { key: 'quran', label: 'Quran', icon: '📖', tint: t => t.primarySoft },
  { key: 'prayer', label: 'Prayer', icon: '🕌', tint: t => t.goldSoft },
  { key: 'qibla', label: 'Qibla', icon: '🧭', tint: t => t.primarySoft },
  { key: 'tasbeeh', label: 'Tasbeeh', icon: '📿', tint: t => t.goldSoft },
  { key: 'names', label: '99 Names', icon: '✨', tint: t => t.primarySoft },
  { key: 'duas', label: 'Duas', icon: '🤲', tint: t => t.goldSoft },
];

/** Progress bar that glides to its new value instead of jumping. */
function GlideBar({ progress, fill }: { progress: number; fill: string }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: progress,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundImage: fill,
            width: value.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

/** Gently pulses its children while `active` (used when a prayer is near). */
function Pulse({ active, children }: { active: boolean; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, t]);

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: t.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.06],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { fs, isTablet } = useResponsive();
  const { state } = useStore();
  const {
    place,
    isDefaultPlace,
    now,
    today,
    date,
    hijri,
    status,
    nextAt,
    refresh,
  } = usePrayerData();
  const scrollY = useRef(new Animated.Value(0)).current;

  const idx = dayIndex(date);
  const verse = DAILY_VERSES[idx % DAILY_VERSES.length];
  const name = NAMES_OF_ALLAH[idx % NAMES_OF_ALLAH.length];
  const lastRead = state.lastRead;
  const columns = isTablet ? 6 : 3;

  const openQuick = (key: string) => {
    if (key === 'quran' || key === 'prayer' || key === 'tasbeeh')
      nav.setTab(key);
    else if (key === 'qibla' || key === 'names' || key === 'duas')
      nav.push({ name: key });
  };

  // Hero content drifts down and fades as you scroll (parallax).
  const heroParallax = {
    opacity: scrollY.interpolate({
      inputRange: [0, 260],
      outputRange: [1, 0.2],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 320],
          outputRange: [0, 120],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
  const starParallax = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 320],
          outputRange: [0, 170],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  return (
    <Animated.ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
      scrollEventThrottle={16}
    >
      {/* ---------- Hero ---------- */}
      <View
        style={[
          styles.hero,
          {
            backgroundImage: theme.hero,
            paddingTop: insets.top + 12,
            paddingHorizontal: isTablet ? 0 : 20,
          },
        ]}
      >
        <StarField count={22} height={330} />
        <Animated.View style={[styles.watermark, starParallax]}>
          <SpinningStar size={240} color="rgba(241,207,116,0.16)" />
        </Animated.View>

        <Animated.View
          style={[contentColumn, isTablet && styles.tabletInset, heroParallax]}
        >
          <View style={styles.topRow}>
            <View style={styles.flex}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.salam, { fontSize: fs(20) }]}
              >
                السَّلَامُ عَلَيْكُمْ
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.greeting, { fontSize: fs(25) }]}
              >
                {greetingFor(now.hours)}
                {state.name ? `, ${state.name}` : ''}
              </Text>
            </View>
            <PressableScale
              style={headerStyles.iconButton}
              onPress={() => nav.push({ name: 'settings' })}
              accessibilityLabel="Settings"
            >
              <Text style={headerStyles.iconText}>{'⚙︎'}</Text>
            </PressableScale>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateChip}>
              <Crescent size={14} color={onHero.gold} />
              <Text maxFontSizeMultiplier={1.3} style={styles.dateText}>
                {formatHijri(hijri)}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.gregorian}>
              {formatGregorian(date)}
            </Text>
          </View>

          {/* Next prayer glass card */}
          <FadeIn delay={120}>
            <PressableScale
              style={styles.glass}
              onPress={() => nav.setTab('prayer')}
              scaleTo={0.98}
            >
              <View style={styles.glassTop}>
                <View style={styles.shrink}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.glassLabel}>
                    NEXT PRAYER · {place.name.toUpperCase()}
                  </Text>
                  {/* Re-keyed so the name animates in when the prayer changes. */}
                  <FadeIn key={status.next} distance={10}>
                    <View style={styles.nextRow}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={[styles.nextName, { fontSize: fs(34) }]}
                      >
                        {PRAYER_LABELS[status.next].en}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={[styles.nextArabic, { fontSize: fs(20) }]}
                      >
                        {PRAYER_LABELS[status.next].ar}
                      </Text>
                    </View>
                  </FadeIn>
                  <Text maxFontSizeMultiplier={1.3} style={styles.nextTime}>
                    {formatTime(status.nextTime)}
                  </Text>
                </View>
                <Pulse active={status.remaining < 0.25}>
                  <View style={styles.countdown}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.countdownLabel}
                    >
                      starts in
                    </Text>
                    <RollingCountdown
                      target={nextAt}
                      fontSize={fs(20)}
                      style={styles.countdownValue}
                      onElapsed={refresh}
                    />
                  </View>
                </Pulse>
              </View>
              <GlideBar progress={status.progress} fill={theme.gold3} />
              <View style={styles.miniRow}>
                {SALAH_KEYS.map(k => {
                  const active = k === status.next;
                  return (
                    <View
                      key={k}
                      style={[styles.mini, active && styles.miniActive]}
                    >
                      <Text
                        maxFontSizeMultiplier={1.2}
                        numberOfLines={1}
                        style={[
                          styles.miniName,
                          active && styles.miniNameActive,
                        ]}
                      >
                        {PRAYER_LABELS[k].en}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.2}
                        style={[
                          styles.miniTime,
                          active && styles.miniNameActive,
                        ]}
                      >
                        {formatTime(today[k], false)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </PressableScale>
          </FadeIn>
        </Animated.View>
      </View>

      <View style={contentColumn}>
        {isDefaultPlace ? (
          <FadeIn delay={160}>
            <PressableScale
              style={[
                styles.locationBanner,
                { backgroundColor: theme.goldSoft, borderColor: theme.gold },
              ]}
              onPress={() => nav.push({ name: 'settings' })}
              scaleTo={0.98}
              accessibilityLabel="Set your location"
            >
              <Text style={styles.bannerEmoji}>📍</Text>
              <View style={styles.flex}>
                <Text style={[styles.bannerTitle, { color: theme.text }]}>
                  Set your location
                </Text>
                <Text style={[styles.bannerBody, { color: theme.muted }]}>
                  Showing Makkah times. Tap to detect where you are.
                </Text>
              </View>
              <Text style={[styles.bannerArrow, { color: theme.gold }]}>›</Text>
            </PressableScale>
          </FadeIn>
        ) : null}

        {/* ---------- Quick access ---------- */}
        <FadeIn delay={200}>
          <Text style={[styles.section, { color: theme.text }]}>Explore</Text>
        </FadeIn>
        <View style={styles.grid}>
          {QUICK.map((q, i) => (
            <FadeIn
              key={q.key}
              delay={240 + i * 60}
              scaleFrom={0.85}
              style={[styles.tileCell, { width: `${100 / columns}%` }]}
            >
              <PressableScale
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: theme.cardShadow,
                  },
                ]}
                onPress={() => openQuick(q.key)}
                accessibilityLabel={q.label}
              >
                <View
                  style={[styles.tileIcon, { backgroundColor: q.tint(theme) }]}
                >
                  <Text maxFontSizeMultiplier={1.2} style={styles.tileEmoji}>
                    {q.icon}
                  </Text>
                </View>
                <Text
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={1}
                  style={[styles.tileLabel, { color: theme.text }]}
                >
                  {q.label}
                </Text>
              </PressableScale>
            </FadeIn>
          ))}
        </View>

        {/* ---------- Continue reading ---------- */}
        {lastRead ? (
          <FadeIn delay={600}>
            <PressableScale
              style={[
                styles.continue,
                {
                  backgroundImage: theme.green3,
                  boxShadow: theme.floatShadow,
                },
              ]}
              onPress={() =>
                nav.push({
                  name: 'surah',
                  surah: lastRead.surah,
                  ayah: lastRead.ayah,
                })
              }
            >
              <Star8 size={50} color="rgba(255,255,255,0.18)">
                <Text style={styles.continueNum}>{lastRead.surah}</Text>
              </Star8>
              <View style={styles.continueText}>
                <Text style={styles.continueLabel}>CONTINUE READING</Text>
                <Text numberOfLines={1} style={styles.continueTitle}>
                  {getSurah(lastRead.surah).name}
                </Text>
                <Text style={styles.continueSub}>
                  Ayah {lastRead.ayah} of {getSurah(lastRead.surah).ayahs}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.continueArabic, { fontSize: fs(24) }]}
              >
                {getSurah(lastRead.surah).arabic}
              </Text>
            </PressableScale>
          </FadeIn>
        ) : null}

        {/* ---------- Verse of the day ---------- */}
        <FadeIn delay={640}>
          <Text style={[styles.section, { color: theme.text }]}>
            Verse of the Day
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            ]}
          >
            <View style={[styles.cardBand, { backgroundImage: theme.gold3 }]} />
            <Star8
              size={34}
              color={theme.gold}
              outline
              style={styles.cardStar}
            />
            <Text
              style={[
                styles.verseArabic,
                {
                  color: theme.arabic,
                  fontSize: state.arabicSize - 2,
                  lineHeight: (state.arabicSize - 2) * 1.9,
                },
              ]}
            >
              {verse.ar}
            </Text>
            <Text style={[styles.verseEn, { color: theme.text }]}>
              “{verse.en}”
            </Text>
            <View style={styles.verseFooter}>
              <Text style={[styles.verseRef, { color: theme.primary }]}>
                {verse.ref}
              </Text>
              <PressableScale
                style={[
                  styles.shareBtn,
                  { backgroundColor: theme.primarySoft },
                ]}
                onPress={() =>
                  Share.share({
                    message: `${verse.ar}\n\n“${verse.en}”\n— ${verse.ref}`,
                  })
                }
              >
                <Text style={[styles.shareText, { color: theme.primary }]}>
                  Share
                </Text>
              </PressableScale>
            </View>
          </View>
        </FadeIn>

        {/* ---------- Name of the day ---------- */}
        <FadeIn delay={700}>
          <Text style={[styles.section, { color: theme.text }]}>
            Name of Allah
          </Text>
          <PressableScale
            style={[
              styles.nameCard,
              { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
            ]}
            onPress={() => nav.push({ name: 'names' })}
          >
            <SpinningStar
              size={160}
              color="rgba(241,207,116,0.18)"
              style={styles.nameStar}
              duration={40000}
            />
            <View style={styles.flex}>
              <Text style={styles.nameNumber}>#{name.number} of 99</Text>
              <Text style={styles.nameTranslit}>{name.transliteration}</Text>
              <Text style={styles.nameMeaning}>{name.meaning}</Text>
              <Text style={styles.nameLink}>See all names ›</Text>
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.nameArabic, { fontSize: fs(40) }]}
            >
              {name.arabic}
            </Text>
          </PressableScale>
        </FadeIn>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  tabletInset: { paddingHorizontal: 20 },
  hero: {
    paddingBottom: 22,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -70, top: -40 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  salam: { color: onHero.gold, textAlign: 'left' },
  greeting: { color: onHero.text, fontWeight: '800', marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: onHero.faint,
    borderColor: onHero.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateText: { color: onHero.text, fontSize: 13, fontWeight: '700' },
  gregorian: { color: onHero.soft, fontSize: 13 },
  glass: {
    marginTop: 18,
    borderRadius: 26,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: onHero.border,
  },
  glassTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  glassLabel: {
    color: onHero.soft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 10,
    marginTop: 4,
  },
  nextName: { color: onHero.text, fontWeight: '900' },
  nextArabic: { color: onHero.gold },
  nextTime: {
    color: onHero.soft,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  countdown: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countdownLabel: { color: onHero.soft, fontSize: 11, fontWeight: '700' },
  countdownValue: { color: onHero.gold, fontWeight: '800', marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  mini: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 12,
  },
  miniActive: { backgroundColor: 'rgba(241,207,116,0.18)' },
  miniName: { color: onHero.soft, fontSize: 11, fontWeight: '700' },
  miniNameActive: { color: onHero.gold },
  miniTime: {
    color: onHero.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  bannerEmoji: { fontSize: 22 },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerBody: { fontSize: 12.5, marginTop: 2 },
  bannerArrow: { fontSize: 24, fontWeight: '700' },
  section: {
    fontSize: 19,
    fontWeight: '800',
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
  tileCell: { padding: 6 },
  tile: { borderRadius: 22, paddingVertical: 16, alignItems: 'center' },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 26 },
  tileLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  continue: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueNum: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  continueText: { flex: 1, marginLeft: 14 },
  continueLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  continueSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  continueArabic: { color: onHero.gold, marginLeft: 8, maxWidth: '35%' },
  card: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 26,
    padding: 20,
    paddingTop: 28,
    overflow: 'hidden',
  },
  cardBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  cardStar: { position: 'absolute', top: 14, left: 16, opacity: 0.6 },
  verseArabic: { textAlign: 'center', writingDirection: 'rtl', marginTop: 8 },
  verseEn: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  verseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  verseRef: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  shareBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  shareText: { fontSize: 13, fontWeight: '800' },
  nameCard: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nameStar: { right: -30, top: -30 },
  nameNumber: {
    color: onHero.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nameTranslit: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  nameMeaning: { color: onHero.soft, fontSize: 14, marginTop: 2 },
  nameLink: {
    color: onHero.gold,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  nameArabic: { color: onHero.gold, marginLeft: 10, maxWidth: '45%' },
});
