import { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { FadeIn } from './components/FadeIn';
import { useAdhanScheduler } from './hooks/useAdhanScheduler';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { Shell } from './navigation/Shell';
import { OnboardingScreen } from './onboarding/OnboardingScreen';
import { SplashScreen } from './onboarding/SplashScreen';
import { StoreProvider, useStore } from './store';
import { useTheme } from './theme';

function Root() {
  const theme = useTheme();
  const { state, hydrated } = useStore();
  const [splashDone, setSplashDone] = useState(false);
  const hideSplash = useCallback(() => setSplashDone(true), []);
  useBackgroundSync();
  useAdhanScheduler();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />
      {/* Wait for saved data so returning users skip onboarding. */}
      {hydrated ? (
        state.onboarded ? (
          <FadeIn style={styles.root} distance={0}>
            <Shell />
          </FadeIn>
        ) : (
          <OnboardingScreen />
        )
      ) : null}
      {!splashDone || !hydrated ? <SplashScreen onDone={hideSplash} /> : null}
    </View>
  );
}

export function NoorApp() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
