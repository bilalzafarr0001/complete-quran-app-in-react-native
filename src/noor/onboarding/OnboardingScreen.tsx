import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpinningStar, StarField } from '../components/Decor';
import { PressableScale } from '../components/PressableScale';
import { Segmented } from '../components/Segmented';
import { LocationPicker } from '../components/LocationPicker';
import { defaultsForCountry, Place } from '../data/places';
import { formatOffset, offsetAt } from '../logic/timezone';
import type { Madhab } from '../logic/prayerTimes';
import { FadeIn } from '../components/FadeIn';
import { useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';
import { CrescentArt, DhikrArt, PrayerArt, QuranArt } from './Art';

const SLIDES = [
  {
    key: 'welcome',
    arabic: 'السَّلَامُ عَلَيْكُمْ',
    title: 'Welcome to Falaq',
    body: 'Your daily companion for the Quran, prayer and the remembrance of Allah.',
    Art: CrescentArt,
  },
  {
    key: 'quran',
    arabic: 'القرآن الكريم',
    title: 'The Noble Quran',
    body: 'Read with beautiful Arabic and clear English meaning. Bookmark ayat and continue right where you left off.',
    Art: QuranArt,
  },
  {
    key: 'prayer',
    arabic: 'الصلاة',
    title: 'Never miss a prayer',
    body: 'Accurate times for your city, a live countdown to the next salah and a tracker for your five daily prayers.',
    Art: PrayerArt,
  },
  {
    key: 'dhikr',
    arabic: 'الذِّكْر',
    title: 'Remember Allah often',
    body: 'A digital tasbeeh, the 99 Beautiful Names, Qibla direction and authentic daily duas.',
    Art: DhikrArt,
  },
] as const;

const PAGES = SLIDES.length + 1; // + setup page

export function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, fs, compactHeight } = useResponsive();
  // Shrink the illustrations on short screens so text and buttons never collide.
  const artScale = compactHeight ? Math.max(0.66, (height - 360) / 440) : 1;
  const { finishOnboarding } = useStore();
  const listRef = useRef<FlatList<number>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const [page, setPage] = useState(0);
  // Source of truth for paging, so rapid taps on "Next" never get lost.
  const pageRef = useRef(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const controlsFade = useRef(new Animated.Value(1)).current;

  // Hide the floating buttons while typing so they never cover the form.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    Animated.timing(controlsFade, {
      toValue: keyboardOpen ? 0 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [keyboardOpen, controlsFade]);

  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [madhab, setMadhab] = useState<Madhab>('standard');

  const onPicked = (p: Place) => {
    setPlace(p);
    if (p.countryCode) setMadhab(defaultsForCountry(p.countryCode).madhab);
  };

  const isLast = page === PAGES - 1;

  const goTo = (i: number) => {
    const target = Math.max(0, Math.min(PAGES - 1, i));
    pageRef.current = target;
    setPage(target);
    listRef.current?.scrollToOffset({ offset: target * width, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    pageRef.current = p;
    setPage(p);
  };

  const finish = () => {
    Animated.timing(exit, {
      toValue: 0,
      duration: 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => finishOnboarding(name, place, madhab));
  };

  const renderSlide = ({ index }: { index: number }) => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    const artStyle = {
      opacity: scrollX.interpolate({
        inputRange: input,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateX: scrollX.interpolate({
            inputRange: input,
            outputRange: [width * 0.4, 0, -width * 0.4],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollX.interpolate({
            inputRange: input,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
    const textStyle = {
      opacity: scrollX.interpolate({
        inputRange: input,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: scrollX.interpolate({
            inputRange: input,
            outputRange: [40, 0, 40],
            extrapolate: 'clamp',
          }),
        },
      ],
    };

    if (index === SLIDES.length) {
      return (
        <View style={{ width }}>
          <ScrollView
            contentContainerStyle={[
              styles.setup,
              { paddingTop: insets.top + (compactHeight ? 40 : 60) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={textStyle}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.arabic, { fontSize: fs(26) }]}
              >
                بِسْمِ اللَّهِ
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.title, { fontSize: fs(30) }]}
              >
                Let's set up Falaq
              </Text>
              <Text maxFontSizeMultiplier={1.4} style={styles.body}>
                So we can greet you and calculate prayer times exactly where you
                are.
              </Text>

              <Text style={styles.label}>YOUR NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Bilal"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <Text style={styles.label}>YOUR LOCATION</Text>
              {place ? (
                <FadeIn key={`${place.lat},${place.lng}`} scaleFrom={0.95}>
                  <View style={styles.placeCard}>
                    <Text style={styles.placePin}>📍</Text>
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.placeName}>
                        {place.name}
                      </Text>
                      <Text numberOfLines={2} style={styles.placeSub}>
                        {[place.region, place.country]
                          .filter(Boolean)
                          .join(', ')}
                        {' · '}
                        {formatOffset(offsetAt(place, Date.now()))}
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() => setPlace(null)}
                      style={styles.change}
                      accessibilityLabel="Change location"
                    >
                      <Text style={styles.changeText}>Change</Text>
                    </PressableScale>
                  </View>
                </FadeIn>
              ) : (
                <LocationPicker onDark onPicked={onPicked} />
              )}

              <Text style={styles.label}>ASR CALCULATION</Text>
              <Segmented
                onDark
                value={madhab}
                onChange={setMadhab}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'hanafi', label: 'Hanafi' },
                ]}
              />
              <Text style={styles.hint}>
                {madhab === 'hanafi'
                  ? 'Hanafi: Asr starts later (shadow twice an object’s length).'
                  : "Standard: used by the Shafi'i, Maliki and Hanbali schools."}
                {place?.countryCode ? ` Suggested for ${place.country}.` : ''}
              </Text>
            </Animated.View>
          </ScrollView>
        </View>
      );
    }

    const slide = SLIDES[index];
    return (
      <View
        style={[
          styles.slide,
          { width, paddingTop: insets.top + (compactHeight ? 24 : 50) },
        ]}
      >
        <Animated.View
          style={[styles.art, { height: 320 * artScale }, artStyle]}
        >
          <View style={{ transform: [{ scale: artScale }] }}>
            <slide.Art />
          </View>
        </Animated.View>
        <Animated.View style={[styles.text, textStyle]}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.arabic, { fontSize: fs(26) }]}
          >
            {slide.arabic}
          </Text>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.title, { fontSize: fs(30) }]}
          >
            {slide.title}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.body}>
            {slide.body}
          </Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundImage: theme.hero,
          opacity: exit,
          transform: [
            {
              scale: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [1.08, 1],
              }),
            },
          ],
        },
      ]}
    >
      <StarField count={40} height={900} seed={3} />
      <SpinningStar
        size={420}
        color="rgba(255,197,138,0.08)"
        style={styles.bgStar}
        duration={90000}
      />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.FlatList
          ref={listRef}
          data={Array.from({ length: PAGES }, (_, i) => i)}
          keyExtractor={i => String(i)}
          renderItem={renderSlide}
          extraData={{ name, place, madhab }}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onMomentumEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: true,
            },
          )}
          scrollEventThrottle={16}
        />

        {/* Bottom controls */}
        <Animated.View
          pointerEvents={keyboardOpen ? 'none' : 'box-none'}
          style={[
            styles.controls,
            { paddingBottom: insets.bottom + 20, opacity: controlsFade },
          ]}
        >
          <View style={styles.dots}>
            {Array.from({ length: PAGES }, (_, i) => {
              const input = [(i - 1) * width, i * width, (i + 1) * width];
              return (
                <Pressable
                  key={i}
                  onPress={() => goTo(i)}
                  hitSlop={6}
                  accessibilityLabel={`Go to page ${i + 1}`}
                >
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        opacity: scrollX.interpolate({
                          inputRange: input,
                          outputRange: [0.35, 1, 0.35],
                          extrapolate: 'clamp',
                        }),
                        transform: [
                          {
                            scaleX: scrollX.interpolate({
                              inputRange: input,
                              outputRange: [1, 2.6, 1],
                              extrapolate: 'clamp',
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <PressableScale
            onPress={isLast ? finish : () => goTo(pageRef.current + 1)}
            style={[
              styles.next,
              isLast && styles.nextWide,
              { backgroundImage: theme.gold3, boxShadow: theme.goldGlow },
            ]}
            accessibilityLabel={isLast ? 'Get started' : 'Next'}
          >
            <FadeIn key={String(isLast)} distance={0} scaleFrom={0.6}>
              <Text maxFontSizeMultiplier={1.2} style={styles.nextText}>
                {isLast ? 'Bismillah, begin' : '→'}
              </Text>
            </FadeIn>
          </PressableScale>
        </Animated.View>
      </KeyboardAvoidingView>

      {!isLast ? (
        <PressableScale
          onPress={() => goTo(PAGES - 1)}
          style={[styles.skip, { top: insets.top + 10 }]}
          accessibilityLabel="Skip to setup"
        >
          <Text style={styles.skipText}>Skip</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgStar: { bottom: -160, left: -120 },
  slide: { flex: 1, alignItems: 'center' },
  art: { height: 320, alignItems: 'center', justifyContent: 'center' },
  text: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  arabic: { color: onHero.gold, fontSize: 26, textAlign: 'center' },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
  },
  body: {
    color: onHero.soft,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
  },
  setup: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  label: {
    color: onHero.soft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: onHero.border,
    backgroundColor: onHero.faint,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flex: { flex: 1 },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: 'rgba(255,197,138,0.55)',
  },
  placePin: { fontSize: 24 },
  placeName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  placeSub: { color: onHero.soft, fontSize: 12.5, marginTop: 2 },
  change: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  changeText: { color: onHero.gold, fontWeight: '800', fontSize: 13 },
  hint: { color: onHero.soft, fontSize: 12, marginTop: 8 },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  dots: { flexDirection: 'row', gap: 14, paddingLeft: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: onHero.gold },
  next: {
    height: 60,
    minWidth: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  nextWide: { paddingHorizontal: 26 },
  nextText: { color: '#3A1630', fontSize: 18, fontWeight: '900' },
  skip: {
    position: 'absolute',
    right: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  skipText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
