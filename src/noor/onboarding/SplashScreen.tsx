import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { StarField } from '../components/Decor';
import { Star8 } from '../components/Star8';
import { onHero, useTheme } from '../theme';

/** Animated launch screen: rosette spins in, "Noor" fades up, then everything fades away. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const star = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(star, {
          toValue: 1,
          friction: 6,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.timing(text, {
          toValue: 1,
          duration: 700,
          delay: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(650),
      Animated.timing(out, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && onDone());
  }, [star, text, out, onDone]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundImage: theme.hero, opacity: out },
      ]}
    >
      <StarField count={36} height={900} seed={11} />
      <Animated.View
        style={{
          opacity: star,
          transform: [
            {
              scale: star.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
            {
              rotate: star.interpolate({
                inputRange: [0, 1],
                outputRange: ['-135deg', '0deg'],
              }),
            },
          ],
        }}
      >
        <Star8
          size={150}
          color={onHero.gold}
          outline
          borderWidth={2.5}
          fill="rgba(241,207,116,0.08)"
        >
          <Star8
            size={104}
            color="rgba(241,207,116,0.6)"
            outline
            borderWidth={1}
            style={styles.inner}
          />
          <Text style={styles.noorArabic}>نُور</Text>
        </Star8>
      </Animated.View>
      <Animated.View
        style={[
          styles.textBox,
          {
            opacity: text,
            transform: [
              {
                translateY: text.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>Noor</Text>
        <Text style={styles.tagline}>QURAN · PRAYER · DHIKR</Text>
      </Animated.View>
      <Animated.Text style={[styles.bismillah, { opacity: text }]}>
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  inner: { position: 'absolute' },
  noorArabic: {
    color: onHero.gold,
    fontSize: 40,
    textShadowColor: 'rgba(241,207,116,0.6)',
    textShadowRadius: 16,
  },
  textBox: { alignItems: 'center', marginTop: 28 },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: onHero.soft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 6,
  },
  bismillah: {
    position: 'absolute',
    bottom: 70,
    color: onHero.gold,
    fontSize: 22,
  },
});
