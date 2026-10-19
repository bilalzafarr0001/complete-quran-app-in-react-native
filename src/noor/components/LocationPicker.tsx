import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Place } from '../data/places';
import {
  detectPlace,
  LocationError,
  requestLocationPermission,
  resolvePlace,
  searchPlaces,
} from '../services/location';
import { onHero, useTheme } from '../theme';
import { FadeIn } from './FadeIn';
import { PressableScale } from './PressableScale';

export type DetectStatus = 'idle' | 'detecting' | 'error';

/** Ask for permission (if needed) and detect the user's place. */
export function useDetectPlace(onFound: (p: Place) => void) {
  const [status, setStatus] = useState<DetectStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const detect = useCallback(async () => {
    setStatus('detecting');
    setError(null);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new LocationError(
          'denied',
          'Location permission was denied. You can search for your city instead.',
        );
      }
      const place = await detectPlace();
      if (!alive.current) return;
      setStatus('idle');
      onFound(place);
    } catch (e) {
      if (!alive.current) return;
      setStatus('error');
      setError(
        e instanceof LocationError
          ? e.message
          : 'Could not detect your location. Please try again or search.',
      );
    }
  }, [onFound]);

  return { detect, status, error };
}

/** Pulsing location pin shown while detecting. */
function Radar({ color }: { color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={styles.radarBox}>
      <Animated.View
        style={[
          styles.radarRing,
          {
            borderColor: color,
            opacity: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 0],
            }),
            transform: [
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1.6],
                }),
              },
            ],
          },
        ]}
      />
      <Text style={styles.radarPin}>📍</Text>
    </View>
  );
}

type Props = {
  onPicked: (place: Place) => void;
  /** Colours for the green onboarding background. */
  onDark?: boolean;
};

/** "Use my current location" + worldwide city search. */
export function LocationPicker({ onPicked, onDark }: Props) {
  const theme = useTheme();
  const { detect, status, error } = useDetectPlace(onPicked);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // Debounced search; ignores out-of-order responses.
  const seq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const id = ++seq.current;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(q)
        .then(r => {
          if (id !== seq.current) return;
          setResults(r);
          setSearchError(null);
        })
        .catch(() => {
          if (id !== seq.current) return;
          setResults([]);
          setSearchError('Search needs an internet connection.');
        })
        .finally(() => id === seq.current && setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = async (p: Place) => {
    const key = `${p.lat},${p.lng}`;
    setResolving(key);
    const resolved = await resolvePlace(p);
    setResolving(null);
    onPicked(resolved);
  };

  const c = onDark
    ? {
        card: onHero.faint,
        border: onHero.border,
        text: '#FFFFFF',
        muted: onHero.soft,
        accent: onHero.gold,
        placeholder: 'rgba(255,255,255,0.5)',
      }
    : {
        card: theme.surfaceAlt,
        border: theme.border,
        text: theme.text,
        muted: theme.muted,
        accent: theme.primary,
        placeholder: theme.muted,
      };

  return (
    <View>
      <PressableScale
        onPress={detect}
        disabled={status === 'detecting'}
        style={[
          styles.detect,
          onDark
            ? { backgroundImage: theme.gold3 }
            : { backgroundImage: theme.green3 },
        ]}
        accessibilityLabel="Use my current location"
      >
        {status === 'detecting' ? (
          <Radar color={onDark ? '#2A1E00' : '#FFFFFF'} />
        ) : (
          <Text style={styles.detectIcon}>📍</Text>
        )}
        <View style={styles.flex}>
          <Text
            style={[
              styles.detectTitle,
              onDark ? styles.darkInk : styles.lightInk,
            ]}
          >
            {status === 'detecting'
              ? 'Finding your location…'
              : 'Use my current location'}
          </Text>
          <Text
            style={[
              styles.detectSub,
              onDark ? styles.darkInkSoft : styles.lightInkSoft,
            ]}
          >
            Most accurate prayer times and Qibla
          </Text>
        </View>
      </PressableScale>
      {error ? (
        <FadeIn distance={6}>
          <Text
            style={[styles.error, { color: onDark ? '#FFD7D7' : theme.danger }]}
          >
            {error}
          </Text>
        </FadeIn>
      ) : null}

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: c.border }]} />
        <Text style={[styles.orText, { color: c.muted }]}>
          or search any city
        </Text>
        <View style={[styles.orLine, { backgroundColor: c.border }]} />
      </View>

      <View
        style={[
          styles.search,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Text style={[styles.searchIcon, { color: c.muted }]}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Lahore, London, Jakarta"
          placeholderTextColor={c.placeholder}
          style={[styles.searchInput, { color: c.text }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search city"
        />
        {searching ? <ActivityIndicator color={c.accent} /> : null}
      </View>

      {searchError ? (
        <Text style={[styles.hint, { color: c.muted }]}>{searchError}</Text>
      ) : null}
      {!searching &&
      query.trim().length >= 2 &&
      !results.length &&
      !searchError ? (
        <Text style={[styles.hint, { color: c.muted }]}>
          No places found for “{query.trim()}”.
        </Text>
      ) : null}

      {results.map((p, i) => {
        const key = `${p.lat},${p.lng}`;
        return (
          <FadeIn key={`${key}-${i}`} delay={i * 35} distance={8}>
            <PressableScale
              onPress={() => pick(p)}
              scaleTo={0.98}
              style={[
                styles.result,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
              accessibilityLabel={`${p.name}, ${p.region ?? ''} ${p.country}`}
            >
              <View style={styles.flex}>
                <Text
                  numberOfLines={1}
                  style={[styles.resultName, { color: c.text }]}
                >
                  {p.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.resultSub, { color: c.muted }]}
                >
                  {[p.region, p.country].filter(Boolean).join(', ')}
                </Text>
              </View>
              {resolving === key ? (
                <ActivityIndicator color={c.accent} />
              ) : (
                <Text style={[styles.resultArrow, { color: c.accent }]}>›</Text>
              )}
            </PressableScale>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  detect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  detectIcon: { fontSize: 24, width: 34, textAlign: 'center' },
  detectTitle: { fontSize: 16, fontWeight: '800' },
  detectSub: { fontSize: 12.5, marginTop: 2 },
  darkInk: { color: '#2A1E00' },
  darkInkSoft: { color: 'rgba(42,30,0,0.7)' },
  lightInk: { color: '#FFFFFF' },
  lightInkSoft: { color: 'rgba(255,255,255,0.8)' },
  radarBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  radarPin: { fontSize: 20 },
  error: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12.5, fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { fontSize: 20 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  hint: { fontSize: 13, marginTop: 10 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 8,
    gap: 10,
  },
  resultName: { fontSize: 15, fontWeight: '700' },
  resultSub: { fontSize: 12.5, marginTop: 2 },
  resultArrow: { fontSize: 22, fontWeight: '600' },
});
