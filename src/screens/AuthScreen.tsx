import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { LoginForm } from '../components/auth/LoginForm';
import { SignUpForm } from '../components/auth/SignUpForm';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { SuccessOverlay } from '../components/SuccessOverlay';
import { useColors } from '../theme';

export type AuthMode = 'login' | 'signup';

type Props = {
  initialMode?: AuthMode;
  onAuthenticated: (name: string) => void;
};

const COPY: Record<AuthMode, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome back 👋',
    subtitle: 'Log in to pick up right where you left off.',
  },
  signup: {
    title: 'Create account ✨',
    subtitle: 'Join MyApp in less than a minute.',
  },
};

const TABS: { key: AuthMode; label: string }[] = [
  { key: 'login', label: 'Log In' },
  { key: 'signup', label: 'Sign Up' },
];

function Logo() {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [pop]);

  const rotate = pop.interpolate({
    inputRange: [0, 1],
    outputRange: ['-120deg', '0deg'],
  });

  return (
    <Animated.View
      style={[styles.logo, { transform: [{ scale: pop }, { rotate }] }]}
    >
      <Text style={styles.logoText}>M</Text>
    </Animated.View>
  );
}

export function AuthScreen({ initialMode = 'login', onAuthenticated }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [successName, setSuccessName] = useState<string | null>(null);

  const sheet = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(sheet, {
      toValue: 1,
      friction: 9,
      tension: 45,
      delay: 150,
      useNativeDriver: true,
    }).start();
  }, [sheet]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) {
      return;
    }
    Animated.timing(content, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setMode(next);
      Animated.timing(content, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const finish = useCallback(() => {
    if (successName) {
      onAuthenticated(successName);
    }
  }, [successName, onAuthenticated]);

  const fadeSlide = {
    opacity: content,
    transform: [
      {
        translateY: content.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <View style={[styles.root, { backgroundImage: colors.heroGradient }]}>
      <AnimatedBackground />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
            <Logo />
            <Animated.View style={[styles.heroText, fadeSlide]}>
              <Text style={styles.title}>{COPY[mode].title}</Text>
              <Text style={styles.subtitle}>{COPY[mode].subtitle}</Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                boxShadow: colors.sheetShadow,
                paddingBottom: insets.bottom + 24,
                opacity: sheet,
                transform: [
                  {
                    translateY: sheet.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[styles.handle, { backgroundColor: colors.inputBorder }]}
            />
            <SegmentedTabs tabs={TABS} value={mode} onChange={switchMode} />

            <Animated.View style={fadeSlide}>
              {mode === 'login' ? (
                <LoginForm onSuccess={setSuccessName} />
              ) : (
                <SignUpForm onSuccess={setSuccessName} />
              )}
            </Animated.View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.muted }]}>
                {mode === 'login'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </Text>
              <Pressable
                hitSlop={8}
                accessibilityRole="link"
                onPress={() =>
                  switchMode(mode === 'login' ? 'signup' : 'login')
                }
              >
                <Text style={[styles.footerLink, { color: colors.accent }]}>
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {successName !== null && (
        <SuccessOverlay
          message={
            mode === 'login'
              ? `Welcome back, ${successName}!`
              : `Welcome, ${successName}!`
          }
          onDone={finish}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 28, paddingBottom: 36 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 22,
  },
  logoText: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  heroText: { alignItems: 'center' },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },
  sheet: {
    flexGrow: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '700' },
});
