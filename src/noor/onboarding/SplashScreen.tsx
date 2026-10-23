import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { StarField } from '../components/Decor';
import { FalaqMark } from '../components/FalaqMark';
import { onHero, useTheme } from '../theme';

/**
 * Animated launch screen: the arch appears, the sun rises behind its horizon
 * ("Falaq" is daybreak), the name fades up, then everything fades away.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const mark = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(mark, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(rise, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(text, {
          toValue: 1,
          duration: 700,
          delay: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(550),
      Animated.timing(out, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && onDone());
  }, [mark, rise, text, out, onDone]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundImage: theme.hero, opacity: out },
      ]}
    >
      <StarField count={30} height={520} seed={11} />
      <Animated.View
        style={{
          opacity: mark,
          transform: [
            {
              scale: mark.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
          ],
        }}
      >
        <View style={styles.glow} />
        <FalaqMark size={170} rise={rise} />
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
        <Text style={styles.title}>Falaq</Text>
        <Text style={styles.arabic}>الْفَلَق</Text>
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
  glow: {
    position: 'absolute',
    left: -40,
    top: -10,
    width: 250,
    height: 250,
    backgroundImage:
      'radial-gradient(circle, rgba(255,197,138,0.35) 0%, rgba(255,197,138,0) 65%)',
  },
  textBox: { alignItems: 'center', marginTop: 18 },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
  },
  arabic: { color: onHero.gold, fontSize: 24, marginTop: 2 },
  tagline: {
    color: onHero.soft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 8,
  },
  bismillah: {
    position: 'absolute',
    bottom: 70,
    color: onHero.gold,
    fontSize: 22,
  },
});
