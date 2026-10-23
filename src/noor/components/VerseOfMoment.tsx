import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getSurah } from '../data/surahs';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useVerseOfMoment } from '../hooks/useVerseOfMoment';
import { useNav } from '../navigation/nav';
import type { MomentVerse } from '../services/verseOfMoment';
import { useStore } from '../store';
import { Theme, useTheme } from '../theme';
import { SpinningStar } from './Decor';
import { LiveDot } from './LiveDot';
import { PressableScale } from './PressableScale';
import { Star8 } from './Star8';

/** Header, Arabic, divider, English, Urdu — revealed one after another. */
const SECTIONS = 5;

const arabicDigits = (n: number) =>
  String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

const isLong = (v: MomentVerse) =>
  v.ar.length > 260 || (v.en?.length ?? 0) > 330;

/** Fade + rise for one revealed section. */
const rise = (v: Animated.Value, distance = 14) => ({
  opacity: v,
  transform: [
    {
      translateY: v.interpolate({
        inputRange: [0, 1],
        outputRange: [distance, 0],
      }),
    },
  ],
});

/** Placeholder lines that softly pulse while the first verse loads. */
function Skeleton({ theme }: { theme: Theme }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
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
  }, [t]);
  const bar = (
    width: `${number}%`,
    height = 14,
    alignSelf: 'center' | 'flex-start' = 'center',
  ) => (
    <View
      style={[
        styles.skelBar,
        { width, height, alignSelf, backgroundColor: theme.surfaceAlt },
      ]}
    />
  );
  return (
    <Animated.View
      accessibilityLabel="Loading verse"
      style={{
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
      }}
    >
      {bar('55%', 16, 'flex-start')}
      {bar('92%', 26)}
      {bar('70%', 26)}
      {bar('100%')}
      {bar('86%', 14, 'flex-start')}
      {bar('60%', 14, 'flex-start')}
    </Animated.View>
  );
}

/** Home card: a random ayah from the whole Quran with English and Urdu meaning. */
export function VerseOfMoment() {
  const theme = useTheme();
  const nav = useNav();
  const { state } = useStore();
  const { verse } = useVerseOfMoment();
  const reduceMotion = useReduceMotion();

  const [shown, setShown] = useState<MomentVerse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);

  const reveal = useRef(
    Array.from({ length: SECTIONS }, () => new Animated.Value(0)),
  ).current;
  const leave = useRef(new Animated.Value(1)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  // Swap verses: slide the old one away, then reveal the new one section by section.
  useEffect(() => {
    if (!verse || verse === shown) return;
    const enter = () => {
      if (shown && !reduceMotion) {
        // Glide the card to the new verse's height instead of jumping.
        LayoutAnimation.configureNext(
          LayoutAnimation.create(320, 'easeInEaseOut', 'opacity'),
        );
      }
      setShown(verse);
      setExpanded(false);
      leave.setValue(1);
      if (reduceMotion) {
        reveal.forEach(v => v.setValue(1));
        return;
      }
      reveal.forEach(v => v.setValue(0));
      sweep.setValue(0);
      Animated.parallel([
        Animated.stagger(
          120,
          reveal.map(v =>
            Animated.timing(v, {
              toValue: 1,
              duration: 640,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1400,
          delay: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    };
    if (!shown || reduceMotion) {
      enter();
      return;
    }
    Animated.timing(leave, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(enter);
    // Only react to a new verse arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verse]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, 'easeInEaseOut', 'opacity'),
    );
    setExpanded(e => !e);
  };

  const arabicRise = rise(reveal[1], 18);
  const arabicIn = {
    opacity: arabicRise.opacity,
    transform: [
      ...arabicRise.transform,
      {
        scale: reveal[1].interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  const surah = shown ? getSurah(shown.surah) : null;
  const collapsed = !!shown && isLong(shown) && !expanded;
  const gold = theme.isDark ? 'rgba(244,162,107,' : 'rgba(196,96,47,';

  const share = () => {
    if (!shown || !surah) return;
    const parts = [shown.ar, shown.en, shown.ur].filter(Boolean);
    Share.share({
      message: `${parts.join('\n\n')}\n\n— ${surah.name} ${shown.surah}:${
        shown.ayah
      }`,
    });
  };

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>
          Verse of the Moment
        </Text>
        <LiveDot color={theme.gold} animate={!reduceMotion} />
      </View>

      <View
        style={[
          styles.frame,
          { backgroundImage: theme.gold3, boxShadow: theme.floatShadow },
        ]}
      >
        <View
          style={[styles.card, { backgroundColor: theme.surface }]}
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
        >
          {reduceMotion ? null : (
            <SpinningStar
              size={200}
              color={`${gold}0.10)`}
              duration={50000}
              style={styles.watermark}
            />
          )}

          {/* Gold light sweeping across when a new verse appears. */}
          {width > 0 && !reduceMotion ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sweep,
                {
                  backgroundImage: `linear-gradient(90deg, ${gold}0) 0%, ${gold}${
                    theme.isDark ? 0.14 : 0.2
                  }) 50%, ${gold}0) 100%)`,
                  opacity: sweep.interpolate({
                    inputRange: [0, 0.1, 0.9, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: sweep.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-140, width + 140],
                      }),
                    },
                    { rotate: '18deg' },
                  ],
                },
              ]}
            />
          ) : null}

          {!shown || !surah ? (
            <Skeleton theme={theme} />
          ) : (
            <Animated.View
              style={{
                opacity: leave,
                transform: [
                  {
                    translateX: leave.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-28, 0],
                    }),
                  },
                ],
              }}
            >
              {/* Surah */}
              <Animated.View style={[styles.surahRow, rise(reveal[0], 8)]}>
                <Star8 size={40} color={theme.gold} outline borderWidth={1.2}>
                  <Text style={[styles.surahNum, { color: theme.primary }]}>
                    {shown.surah}
                  </Text>
                </Star8>
                <View style={styles.flex}>
                  <Text
                    numberOfLines={1}
                    style={[styles.surahName, { color: theme.text }]}
                  >
                    {surah.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.surahMeta, { color: theme.muted }]}
                  >
                    {surah.meaning} · Ayah {shown.ayah}
                  </Text>
                </View>
                <Text style={[styles.surahArabic, { color: theme.gold }]}>
                  {surah.arabic}
                </Text>
              </Animated.View>

              {/* Arabic */}
              <Animated.View style={arabicIn}>
                <Text
                  numberOfLines={collapsed ? 5 : undefined}
                  style={[
                    styles.arabic,
                    {
                      color: theme.arabic,
                      fontSize: state.arabicSize,
                      lineHeight: state.arabicSize * 1.95,
                    },
                  ]}
                >
                  {shown.ar}
                  <Text style={{ color: theme.gold }}>
                    {' '}
                    ﴿{arabicDigits(shown.ayah)}﴾
                  </Text>
                </Text>
              </Animated.View>

              {/* Ornament */}
              <Animated.View
                style={[
                  styles.divider,
                  {
                    opacity: reveal[2],
                    transform: [{ scaleX: reveal[2] }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.dividerLine,
                    {
                      backgroundImage: `linear-gradient(90deg, ${gold}0) 0%, ${gold}0.7) 100%)`,
                    },
                  ]}
                />
                <Star8 size={14} color={theme.gold} />
                <View
                  style={[
                    styles.dividerLine,
                    {
                      backgroundImage: `linear-gradient(90deg, ${gold}0.7) 0%, ${gold}0) 100%)`,
                    },
                  ]}
                />
              </Animated.View>

              {/* English */}
              {shown.en ? (
                <Animated.View style={rise(reveal[3])}>
                  <Text style={[styles.label, { color: theme.primary }]}>
                    ENGLISH
                  </Text>
                  <Text
                    numberOfLines={collapsed ? 5 : undefined}
                    style={[styles.english, { color: theme.text }]}
                  >
                    {shown.en}
                  </Text>
                </Animated.View>
              ) : null}

              {/* Urdu */}
              <Animated.View style={rise(reveal[4])}>
                {shown.ur ? (
                  <View
                    style={[styles.urduBlock, { borderTopColor: theme.border }]}
                  >
                    <Text style={[styles.urduLabel, { color: theme.primary }]}>
                      اردو ترجمہ
                    </Text>
                    <Text
                      numberOfLines={collapsed ? 4 : undefined}
                      style={[styles.urdu, { color: theme.text }]}
                    >
                      {shown.ur}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.offline, { color: theme.muted }]}>
                    Urdu meaning appears when you are online.
                  </Text>
                )}
                {isLong(shown) ? (
                  <PressableScale
                    onPress={toggleExpanded}
                    style={styles.moreBtn}
                    accessibilityLabel={
                      expanded ? 'Show less' : 'Show full verse'
                    }
                  >
                    <Text style={[styles.moreText, { color: theme.primary }]}>
                      {expanded ? 'Show less  ⌃' : 'Show full verse  ⌄'}
                    </Text>
                  </PressableScale>
                ) : null}
              </Animated.View>
            </Animated.View>
          )}

          {/* Actions */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <PressableScale
              onPress={share}
              disabled={!shown}
              accessibilityLabel="Share verse"
              style={[styles.btn, { backgroundColor: theme.primarySoft }]}
            >
              <Text style={[styles.btnText, { color: theme.primary }]}>
                Share
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() =>
                shown &&
                nav.push({
                  name: 'surah',
                  surah: shown.surah,
                  ayah: shown.ayah,
                })
              }
              disabled={!shown}
              accessibilityLabel="Read in Quran"
              style={[styles.btn, { backgroundImage: theme.primary3 }]}
            >
              <Text style={[styles.btnText, styles.btnTextOnGreen]}>
                Read in Quran ›
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 6,
  },
  title: { fontSize: 19, fontWeight: '800' },
  frame: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 28,
    padding: 1.5,
  },
  card: {
    borderRadius: 26.5,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  watermark: { right: -70, top: -70 },
  sweep: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    left: 0,
    width: 110,
  },
  skelBar: { borderRadius: 8, marginTop: 14 },
  surahRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  surahNum: { fontSize: 12, fontWeight: '900' },
  surahName: { fontSize: 16, fontWeight: '800' },
  surahMeta: { fontSize: 12.5, marginTop: 1 },
  surahArabic: { fontSize: 22, fontWeight: '600' },
  arabic: {
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1.5, borderRadius: 1 },
  label: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginTop: 12,
  },
  english: { fontSize: 15.5, lineHeight: 24, marginTop: 6 },
  urduBlock: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  urduLabel: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  urdu: {
    fontSize: 18,
    lineHeight: 34,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  offline: { fontSize: 12.5, marginTop: 14, fontStyle: 'italic' },
  moreBtn: { alignSelf: 'center', marginTop: 10, padding: 6 },
  moreText: { fontSize: 13, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  btnText: { fontSize: 13.5, fontWeight: '800' },
  btnTextOnGreen: { color: '#FFFFFF' },
});
