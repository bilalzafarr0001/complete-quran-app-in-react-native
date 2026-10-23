import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TrackPlayer, {
  Event,
  useActiveTrack,
  useIsPlaying,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { getReciter } from '../data/reciters';
import { getSurah } from '../data/surahs';
import {
  applyRepeat,
  parseTrackId,
  stopRecitation,
} from '../services/recitation';
import { RepeatSetting, useStore } from '../store';
import { onHero, useTheme } from '../theme';
import { PauseIcon, PlayIcon, SkipIcon } from './MediaIcons';
import { PressableScale } from './PressableScale';
import { Star8 } from './Star8';

const NEXT_REPEAT: Record<RepeatSetting, RepeatSetting> = {
  off: 'ayah',
  ayah: 'surah',
  surah: 'off',
};
const REPEAT_LABEL: Record<RepeatSetting, string> = {
  off: 'Repeat off',
  ayah: 'Repeat ayah',
  surah: 'Repeat surah',
};

type Props = {
  /** Compact mini-player (above the tab bar) vs full controls (in the reader). */
  variant: 'mini' | 'full';
  /** Mini player: open the reader at the ayah being recited. */
  onOpen?: (surah: number, ayah: number) => void;
  bottomInset?: number;
};

/** Now-reciting bar with live progress; hidden when nothing is queued. */
export function PlayerBar({ variant, onOpen, bottomInset = 0 }: Props) {
  const theme = useTheme();
  const { state, update } = useStore();
  const track = useActiveTrack();
  const { playing, bufferingDuringPlay } = useIsPlaying();
  const { position, duration } = useProgress(250);
  const [error, setError] = useState<string | null>(null);
  const enter = useRef(new Animated.Value(0)).current;

  useTrackPlayerEvents(
    [Event.PlaybackError, Event.PlaybackActiveTrackChanged],
    e => {
      if (e.type === Event.PlaybackError) {
        setError('Can’t stream — check your internet connection.');
      } else {
        setError(null);
      }
    },
  );

  const now = parseTrackId(track?.id as string | undefined);
  useEffect(() => {
    Animated.spring(enter, {
      toValue: now ? 1 : 0,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [now, enter]);

  if (!now) return null;
  const info = getSurah(now.surah);
  const reciter = getReciter(state.reciterId);
  const where =
    now.ayah === 0 ? 'Bismillah' : `Ayah ${now.ayah} of ${info.ayahs}`;
  const pct = duration > 0 ? Math.min(1, position / duration) : 0;
  const loading = !!bufferingDuringPlay;

  const toggle = () => (playing ? TrackPlayer.pause() : TrackPlayer.play());
  const next = () => TrackPlayer.skipToNext().catch(() => {});
  const prev = () =>
    // Like music players: restart the ayah if it's been playing a while.
    position > 3
      ? TrackPlayer.seekTo(0)
      : TrackPlayer.skipToPrevious().catch(() => {});
  const cycleRepeat = () => {
    const r = NEXT_REPEAT[state.repeat];
    update({ repeat: r });
    applyRepeat(r).catch(() => {});
  };

  const slide = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }),
      },
    ],
  };

  const playButton = (big: boolean) => (
    <PressableScale
      onPress={toggle}
      style={[
        big ? styles.playBig : styles.playSmall,
        { backgroundImage: theme.gold3 },
      ]}
      accessibilityLabel={playing ? 'Pause recitation' : 'Play recitation'}
    >
      {loading ? (
        <ActivityIndicator color="#3A1630" />
      ) : playing ? (
        <PauseIcon size={big ? 18 : 14} color="#3A1630" />
      ) : (
        <PlayIcon size={big ? 18 : 14} color="#3A1630" />
      )}
    </PressableScale>
  );

  const track_ = (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, backgroundImage: theme.gold3 },
        ]}
      />
    </View>
  );

  if (variant === 'mini') {
    return (
      <Animated.View
        style={[
          styles.mini,
          { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
          slide,
        ]}
      >
        {track_}
        <View style={styles.miniRow}>
          <Pressable
            style={styles.miniInfo}
            onPress={() => onOpen?.(now.surah, Math.max(1, now.ayah))}
            accessibilityRole="button"
            accessibilityLabel={`Open ${info.name}`}
          >
            <Star8 size={34} color={onHero.gold} outline>
              <Text maxFontSizeMultiplier={1} style={styles.miniNum}>
                {now.surah}
              </Text>
            </Star8>
            <View style={styles.flex}>
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                style={styles.title}
              >
                {info.name} · {where}
              </Text>
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                style={styles.sub}
              >
                {error ?? reciter.name}
              </Text>
            </View>
          </Pressable>
          {playButton(false)}
          <PressableScale
            onPress={next}
            style={styles.iconBtn}
            accessibilityLabel="Next ayah"
          >
            <SkipIcon direction="next" color="#FFFFFF" />
          </PressableScale>
          <PressableScale
            onPress={stopRecitation}
            style={styles.iconBtn}
            accessibilityLabel="Stop recitation"
          >
            <Text style={styles.close}>✕</Text>
          </PressableScale>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.full,
        {
          backgroundImage: theme.hero,
          boxShadow: theme.floatShadow,
          paddingBottom: 14 + bottomInset,
        },
        slide,
      ]}
    >
      <View style={styles.fullTop}>
        <View style={styles.flex}>
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={styles.title}
          >
            {where === 'Bismillah'
              ? `${info.name} · Bismillah`
              : `${info.name} · ${where}`}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={styles.sub}
          >
            {error ?? `${reciter.name} · ${REPEAT_LABEL[state.repeat]}`}
          </Text>
        </View>
        <PressableScale
          onPress={stopRecitation}
          style={styles.iconBtn}
          accessibilityLabel="Stop recitation"
        >
          <Text style={styles.close}>✕</Text>
        </PressableScale>
      </View>
      {track_}
      <View style={styles.controls}>
        <PressableScale
          onPress={cycleRepeat}
          style={[styles.iconBtn, state.repeat !== 'off' && styles.iconOn]}
          accessibilityLabel={`${REPEAT_LABEL[state.repeat]}. Tap to change`}
        >
          <Text
            style={[styles.repeat, state.repeat !== 'off' && styles.repeatOn]}
          >
            ↻
          </Text>
          {state.repeat === 'ayah' ? (
            <Text style={styles.repeatBadge}>1</Text>
          ) : null}
        </PressableScale>
        <PressableScale
          onPress={prev}
          style={styles.iconBtn}
          accessibilityLabel="Previous ayah"
        >
          <SkipIcon direction="prev" color="#FFFFFF" size={16} />
        </PressableScale>
        {playButton(true)}
        <PressableScale
          onPress={next}
          style={styles.iconBtn}
          accessibilityLabel="Next ayah"
        >
          <SkipIcon direction="next" color="#FFFFFF" size={16} />
        </PressableScale>
        <PressableScale
          onPress={() => update({ followAlong: !state.followAlong })}
          style={[styles.iconBtn, state.followAlong && styles.iconOn]}
          accessibilityLabel={
            state.followAlong
              ? 'Stop following the recitation'
              : 'Follow the recitation'
          }
        >
          <Text style={[styles.follow, state.followAlong && styles.repeatOn]}>
            ⇣
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mini: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  miniRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 },
  miniInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniNum: { color: onHero.gold, fontSize: 11, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  sub: { color: onHero.soft, fontSize: 12, marginTop: 2 },
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  fill: { height: '100%' },
  playSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBig: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: 'rgba(255,197,138,0.18)' },
  close: { color: onHero.soft, fontSize: 18, fontWeight: '700' },
  full: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 14,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  fullTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  repeat: { color: onHero.soft, fontSize: 22, fontWeight: '700' },
  repeatOn: { color: onHero.gold },
  repeatBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    color: onHero.gold,
    fontSize: 10,
    fontWeight: '900',
  },
  follow: { color: onHero.soft, fontSize: 22, fontWeight: '800' },
});
