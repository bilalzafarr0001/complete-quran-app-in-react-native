import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, {
  useActiveTrack,
  useIsPlaying,
} from 'react-native-track-player';
import { BottomSheet } from '../components/BottomSheet';
import { SpinningStar, StarField } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { PauseIcon, PlayIcon } from '../components/MediaIcons';
import { PlayerBar } from '../components/PlayerBar';
import { ReciterList } from '../components/ReciterList';
import { headerStyles } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { Star8 } from '../components/Star8';
import { BISMILLAH } from '../data/quran';
import { getSurah } from '../data/surahs';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useSurah } from '../hooks/useSurah';
import { useNav } from '../navigation/nav';
import type { FullAyah } from '../services/quran';
import { parseTrackId, playSurah } from '../services/recitation';
import { Translation, useStore } from '../store';
import { onHero, useTheme } from '../theme';

type ItemProps = {
  ayah: FullAyah;
  number: number;
  surahName: string;
  bookmarked: boolean;
  highlighted: boolean;
  arabicSize: number;
  translation: Translation;
  onPress: (n: number) => void;
  onBookmark: (n: number) => void;
  /** This ayah is the one being recited. */
  active: boolean;
  /** …and audio is currently playing (not paused). */
  playing: boolean;
  onPlay: (n: number) => void;
};

const AyahItem = memo(function AyahItemInner({
  ayah,
  number,
  surahName,
  bookmarked,
  highlighted,
  arabicSize,
  translation,
  onPress,
  onBookmark,
  active,
  playing,
  onPlay,
}: ItemProps) {
  const theme = useTheme();
  const pop = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const showEn = (translation === 'en' || translation === 'both') && !!ayah.en;
  const showUr = (translation === 'ur' || translation === 'both') && !!ayah.ur;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.setValue(0.5);
    Animated.spring(pop, {
      toValue: 1,
      friction: 3,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [bookmarked, pop]);

  useEffect(() => {
    if (highlighted) {
      flash.setValue(1);
      Animated.timing(flash, {
        toValue: 0,
        duration: 2200,
        delay: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [highlighted, flash]);

  const share = () =>
    Share.share({
      message: [
        ayah.ar,
        showEn ? ayah.en : null,
        showUr ? ayah.ur : null,
        `— ${surahName} ${number}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

  return (
    // The first ayat cascade in when the surah opens.
    <FadeIn
      animate={number <= 8}
      delay={120 + number * 70}
      style={styles.column}
    >
      <Pressable
        onPress={() => onPress(number)}
        accessibilityHint="Saves this ayah as your reading position"
      >
        <View
          style={[
            styles.ayah,
            { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            active && { borderColor: theme.gold },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.flash,
              {
                backgroundColor: theme.goldSoft,
                borderColor: theme.gold,
                opacity: flash,
              },
            ]}
          />
          <View style={styles.ayahTop}>
            <Star8 size={36} color={theme.gold} outline fill={theme.goldSoft}>
              <Text
                maxFontSizeMultiplier={1}
                style={[styles.ayahNum, { color: theme.text }]}
              >
                {number}
              </Text>
            </Star8>
            {active ? (
              <View
                style={[styles.reciting, { backgroundColor: theme.goldSoft }]}
              >
                <Text style={[styles.recitingText, { color: theme.gold }]}>
                  {playing ? '● Reciting' : '❚❚ Paused'}
                </Text>
              </View>
            ) : null}
            <View style={styles.flex} />
            <PressableScale
              style={[
                styles.action,
                { backgroundColor: active ? theme.goldSoft : theme.surfaceAlt },
              ]}
              onPress={() => onPlay(number)}
              accessibilityLabel={
                active && playing ? 'Pause recitation' : 'Recite from this ayah'
              }
            >
              {active && playing ? (
                <PauseIcon size={12} color={theme.gold} />
              ) : (
                <PlayIcon size={12} color={active ? theme.gold : theme.muted} />
              )}
            </PressableScale>
            <PressableScale
              style={[styles.action, { backgroundColor: theme.surfaceAlt }]}
              onPress={share}
              accessibilityLabel="Share ayah"
            >
              <Text style={[styles.actionText, { color: theme.muted }]}>↗</Text>
            </PressableScale>
            <PressableScale
              style={[
                styles.action,
                {
                  backgroundColor: bookmarked
                    ? theme.goldSoft
                    : theme.surfaceAlt,
                },
              ]}
              onPress={() => onBookmark(number)}
              accessibilityLabel={
                bookmarked ? 'Remove bookmark' : 'Bookmark ayah'
              }
            >
              <Animated.Text
                style={[
                  styles.actionText,
                  {
                    color: bookmarked ? theme.gold : theme.muted,
                    transform: [{ scale: pop }],
                  },
                ]}
              >
                {bookmarked ? '★' : '☆'}
              </Animated.Text>
            </PressableScale>
          </View>
          <Text
            style={[
              styles.arabic,
              {
                color: theme.arabic,
                fontSize: arabicSize,
                lineHeight: arabicSize * 2,
              },
            ]}
          >
            {ayah.ar}
          </Text>
          {showUr ? (
            <Text style={[styles.urdu, { color: theme.text }]}>{ayah.ur}</Text>
          ) : null}
          {showEn ? (
            <Text style={[styles.translation, { color: theme.muted }]}>
              <Text style={[styles.translationNum, { color: theme.primary }]}>
                {number}.{' '}
              </Text>
              {ayah.en}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </FadeIn>
  );
});

/** Shimmering placeholder cards while a surah downloads. */
function Skeleton() {
  const theme = useTheme();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  return (
    <View style={styles.column} accessibilityLabel="Loading surah">
      <Text style={[styles.loadingText, { color: theme.muted }]}>
        Loading the surah…
      </Text>
      {[0, 1, 2, 3].map(i => (
        <Animated.View
          key={i}
          style={[styles.ayah, { backgroundColor: theme.surface, opacity }]}
        >
          <View
            style={[styles.skelBadge, { backgroundColor: theme.surfaceAlt }]}
          />
          <View
            style={[
              styles.skelLine,
              { width: '92%', backgroundColor: theme.surfaceAlt },
            ]}
          />
          <View
            style={[
              styles.skelLine,
              { width: '70%', backgroundColor: theme.surfaceAlt },
            ]}
          />
          <View
            style={[
              styles.skelLineThin,
              { width: '85%', backgroundColor: theme.surfaceAlt },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export function SurahScreen({
  surah,
  ayah: initialAyah,
}: {
  surah: number;
  ayah?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { fs } = useResponsive();
  const { state, toggleBookmark, setLastRead, update } = useStore();
  const info = getSurah(surah);
  const data = useSurah(surah);
  const ayat = data.status === 'ready' ? data.ayat : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | undefined>(initialAyah);
  const listRef = useRef<FlatList<FullAyah>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // ---- Recitation ----
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const nowPlaying = parseTrackId(track?.id as string | undefined);
  /** Ayah of this surah being recited (0 = the opening Bismillah). */
  const activeAyah = nowPlaying?.surah === surah ? nowPlaying.ayah : null;
  const [playError, setPlayError] = useState<string | null>(null);

  const startAt = (n: number) => {
    setPlayError(null);
    playSurah(state.reciterId, surah, n, state.repeat).catch(() =>
      setPlayError('Could not start the recitation. Please try again.'),
    );
  };
  const togglePause = () =>
    (playing ? TrackPlayer.pause() : TrackPlayer.play()).catch(() => {});
  const onPlay = (n: number) => {
    if (activeAyah === n) return togglePause();
    setLastRead(surah, n);
    startAt(n);
  };
  const onPlaySurah = () => (activeAyah !== null ? togglePause() : startAt(1));

  // Follow along: keep the recited ayah in view and remember the position.
  useEffect(() => {
    if (!ayat || activeAyah === null || activeAyah < 1) return;
    setLastRead(surah, activeAyah);
    if (!state.followAlong) return;
    listRef.current?.scrollToIndex({
      index: activeAyah - 1,
      viewPosition: 0.2,
      animated: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAyah, ayat]);

  useEffect(() => {
    if (!initialAyah || !ayat) return;
    const id = setTimeout(
      () =>
        listRef.current?.scrollToIndex({
          index: Math.min(initialAyah, ayat.length) - 1,
          viewOffset: 90,
          animated: true,
        }),
      450,
    );
    return () => clearTimeout(id);
  }, [initialAyah, ayat]);

  const onPress = (n: number) => {
    setLastRead(surah, n);
    setHighlight(n);
  };
  const onBookmark = (n: number) => toggleBookmark(surah, n);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );
  const barOpacity = scrollY.interpolate({
    inputRange: [100, 170],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const bannerScale = scrollY.interpolate({
    inputRange: [-120, 0],
    outputRange: [1.25, 1],
    extrapolate: 'clamp',
  });

  const sourceLabel =
    data.status !== 'ready'
      ? null
      : data.source === 'bundled'
      ? 'Offline sample · English only'
      : '✓ Saved for offline reading';

  const header = (
    <View>
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundImage: theme.hero,
            paddingTop: insets.top + 64,
            transform: [{ scale: bannerScale }],
          },
        ]}
      >
        <StarField count={16} height={260} seed={surah} />
        <SpinningStar
          size={260}
          color="rgba(255,197,138,0.15)"
          style={styles.bannerStar}
        />
        <Star8 size={64} color={onHero.gold} outline borderWidth={2}>
          <Text maxFontSizeMultiplier={1} style={styles.bannerNum}>
            {surah}
          </Text>
        </Star8>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.bannerArabic, { fontSize: fs(38) }]}
        >
          {info.arabic}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.bannerName, { fontSize: fs(26) }]}
        >
          {info.name}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.bannerMeta}>
          {info.meaning} · {info.revelation} · {info.ayahs} ayat
        </Text>
        {sourceLabel ? (
          <FadeIn distance={6}>
            <View style={styles.sourcePill}>
              <Text style={styles.sourceText}>{sourceLabel}</Text>
            </View>
          </FadeIn>
        ) : null}
        {ayat ? (
          <FadeIn delay={80} distance={6}>
            <PressableScale
              onPress={onPlaySurah}
              style={[styles.playPill, { backgroundImage: theme.gold3 }]}
              accessibilityLabel={
                activeAyah === null
                  ? 'Play surah'
                  : playing
                  ? 'Pause recitation'
                  : 'Resume recitation'
              }
            >
              {activeAyah !== null && playing ? (
                <PauseIcon size={12} color="#3A1630" />
              ) : (
                <PlayIcon size={12} color="#3A1630" />
              )}
              <Text style={styles.playPillText}>
                {activeAyah === null
                  ? 'Play surah'
                  : playing
                  ? 'Pause'
                  : 'Resume'}
              </Text>
            </PressableScale>
          </FadeIn>
        ) : null}
        {playError ? <Text style={styles.playError}>{playError}</Text> : null}
      </Animated.View>
      {surah !== 1 && surah !== 9 && data.status !== 'error' ? (
        <FadeIn delay={120} style={styles.column}>
          <View
            style={[
              styles.bismillah,
              { backgroundColor: theme.surface, borderColor: theme.gold },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.bismillahText, { color: theme.arabic }]}
            >
              {BISMILLAH}
            </Text>
          </View>
        </FadeIn>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      {ayat ? (
        <Animated.FlatList
          ref={listRef}
          data={ayat}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={header}
          contentContainerStyle={[
            styles.listContent,
            // Leave room for the player bar.
            nowPlaying && { paddingBottom: 200 + insets.bottom },
          ]}
          extraData={activeAyah}
          initialNumToRender={8}
          windowSize={11}
          renderItem={({ item, index }) => (
            <AyahItem
              ayah={item}
              number={index + 1}
              surahName={info.name}
              bookmarked={state.bookmarks.includes(`${surah}:${index + 1}`)}
              highlighted={highlight === index + 1}
              arabicSize={state.arabicSize}
              translation={state.translation}
              onPress={onPress}
              onBookmark={onBookmark}
              active={activeAyah === index + 1}
              playing={activeAyah === index + 1 && !!playing}
              onPlay={onPlay}
            />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollToIndexFailed={e => {
            listRef.current?.scrollToOffset({
              offset: e.averageItemLength * e.index,
              animated: true,
            });
            setTimeout(
              () =>
                listRef.current?.scrollToIndex({
                  index: e.index,
                  viewOffset: 90,
                  animated: true,
                }),
              400,
            );
          }}
          ListFooterComponent={
            <Text style={[styles.footer, { color: theme.muted }]}>
              صَدَقَ اللَّهُ الْعَظِيمُ
            </Text>
          }
        />
      ) : (
        <Animated.ScrollView
          contentContainerStyle={styles.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {header}
          {data.status === 'error' ? (
            <FadeIn style={styles.column}>
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: theme.cardShadow,
                  },
                ]}
              >
                <Text style={styles.errorEmoji}>📡</Text>
                <Text style={[styles.errorTitle, { color: theme.text }]}>
                  You're offline
                </Text>
                <Text style={[styles.errorBody, { color: theme.muted }]}>
                  {data.message}
                </Text>
                <PressableScale
                  style={[styles.retry, { backgroundImage: theme.primary3 }]}
                  onPress={data.retry}
                  accessibilityLabel="Try again"
                >
                  <Text style={styles.retryText}>Try again</Text>
                </PressableScale>
              </View>
            </FadeIn>
          ) : (
            <Skeleton />
          )}
        </Animated.ScrollView>
      )}

      {/* Floating top bar */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundImage: theme.hero, opacity: barOpacity },
          ]}
        />
        <PressableScale
          style={headerStyles.iconButton}
          onPress={nav.pop}
          accessibilityLabel="Go back"
        >
          <Text style={styles.back}>‹</Text>
        </PressableScale>
        <Animated.View style={[styles.topTitleWrap, { opacity: barOpacity }]}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={styles.topTitle}
            numberOfLines={1}
          >
            {info.name}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.topSub}>
            {info.arabic}
          </Text>
        </Animated.View>
        <PressableScale
          style={headerStyles.iconButton}
          onPress={() => setSettingsOpen(true)}
          accessibilityLabel="Reading settings"
        >
          <Text maxFontSizeMultiplier={1.2} style={headerStyles.iconText}>
            Aa
          </Text>
        </PressableScale>
      </View>

      <PlayerBar variant="full" bottomInset={insets.bottom} />

      <BottomSheet
        visible={settingsOpen}
        title="Reading settings"
        onClose={() => setSettingsOpen(false)}
      >
        <Text style={[styles.sheetLabel, { color: theme.muted }]}>
          ARABIC TEXT SIZE
        </Text>
        <View style={styles.sizeRow}>
          <PressableScale
            style={[styles.sizeBtn, { backgroundColor: theme.surfaceAlt }]}
            onPress={() =>
              update({ arabicSize: Math.max(20, state.arabicSize - 2) })
            }
            accessibilityLabel="Smaller text"
          >
            <Text style={[styles.sizeBtnText, { color: theme.text }]}>A−</Text>
          </PressableScale>
          <Text
            style={[
              styles.sizePreview,
              { color: theme.arabic, fontSize: state.arabicSize },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            بِسْمِ اللَّهِ
          </Text>
          <PressableScale
            style={[styles.sizeBtn, { backgroundColor: theme.surfaceAlt }]}
            onPress={() =>
              update({ arabicSize: Math.min(44, state.arabicSize + 2) })
            }
            accessibilityLabel="Larger text"
          >
            <Text style={[styles.sizeBtnText, { color: theme.text }]}>A+</Text>
          </PressableScale>
        </View>
        <Text
          style={[styles.sheetLabel, styles.sheetGap, { color: theme.muted }]}
        >
          TRANSLATION
        </Text>
        <Segmented<Translation>
          value={state.translation}
          onChange={v => update({ translation: v })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'Urdu' },
            { value: 'both', label: 'Both' },
            { value: 'off', label: 'Off' },
          ]}
        />
        <Text style={[styles.sheetNote, { color: theme.muted }]}>
          English: Saheeh International · Urdu: Fateh Muhammad Jalandhry
        </Text>
        <Text
          style={[styles.sheetLabel, styles.sheetGap, { color: theme.muted }]}
        >
          RECITER
        </Text>
        <ReciterList />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingBottom: 40 },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  playPillText: { color: '#3A1630', fontWeight: '900', fontSize: 14 },
  playError: { color: '#FFD7D7', fontSize: 12.5, marginTop: 8 },
  reciting: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  recitingText: { fontSize: 11, fontWeight: '900' },
  banner: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  bannerStar: { left: -60, bottom: -110 },
  bannerNum: { color: onHero.gold, fontSize: 20, fontWeight: '900' },
  bannerArabic: { color: onHero.gold, marginTop: 12 },
  bannerName: { color: '#FFFFFF', fontWeight: '900', marginTop: 2 },
  bannerMeta: {
    color: onHero.soft,
    fontSize: 13.5,
    marginTop: 6,
    textAlign: 'center',
  },
  sourcePill: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: onHero.border,
  },
  sourceText: { color: onHero.gold, fontSize: 12, fontWeight: '700' },
  column: { ...contentColumn, paddingHorizontal: 16 },
  bismillah: {
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bismillahText: { fontSize: 26, writingDirection: 'rtl' },
  ayah: {
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    // Constant border so highlighting the recited ayah doesn't shift layout.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flash: { borderRadius: 22, borderWidth: 1.5 },
  ayahTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ayahNum: { fontSize: 12, fontWeight: '800' },
  action: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 18, fontWeight: '700' },
  arabic: { textAlign: 'right', writingDirection: 'rtl', marginTop: 10 },
  urdu: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 18,
    lineHeight: 34,
    marginTop: 8,
  },
  translation: { fontSize: 15, lineHeight: 23, marginTop: 8 },
  translationNum: { fontWeight: '800' },
  footer: { textAlign: 'center', fontSize: 20, marginTop: 26 },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  skelBadge: { width: 36, height: 36, borderRadius: 10 },
  skelLine: {
    height: 18,
    borderRadius: 9,
    marginTop: 14,
    alignSelf: 'flex-end',
  },
  skelLineThin: { height: 12, borderRadius: 6, marginTop: 14 },
  errorCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  errorEmoji: { fontSize: 34 },
  errorTitle: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  errorBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: 'center',
  },
  retry: {
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  back: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
    fontWeight: '300',
  },
  topTitleWrap: { flex: 1, alignItems: 'center' },
  topTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  topSub: { color: onHero.gold, fontSize: 13 },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  sheetGap: { marginTop: 22, marginBottom: 10 },
  sheetNote: { fontSize: 12, marginTop: 10, lineHeight: 17 },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  sizeBtn: {
    width: 52,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnText: { fontSize: 16, fontWeight: '800' },
  sizePreview: { flex: 1, textAlign: 'center' },
});
