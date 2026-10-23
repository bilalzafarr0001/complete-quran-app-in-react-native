import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { DuasScreen } from '../screens/DuasScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { NamesScreen } from '../screens/NamesScreen';
import { RamadanScreen } from '../screens/RamadanScreen';
import { PrayerScreen } from '../screens/PrayerScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { QuranScreen } from '../screens/QuranScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SurahScreen } from '../screens/SurahScreen';
import { TasbeehScreen } from '../screens/TasbeehScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerBar } from '../components/PlayerBar';
import { useTheme } from '../theme';
import { Nav, NavContext, Route, TabName } from './nav';
import { TabBar, TABS } from './TabBar';

type Entry = {
  key: string;
  route: Route;
  leaving: boolean;
  /** 0 = off-screen right, 1 = fully shown. */
  t: Animated.Value;
};

/** How far (fraction of width) the screen underneath shifts left. */
const PARALLAX = 0.28;
/** Width of the left-edge zone that starts a swipe-back. */
const EDGE = 28;

const TAB_INDEX = Object.fromEntries(TABS.map((t, i) => [t.key, i])) as Record<
  TabName,
  number
>;

function renderRoute(route: Route) {
  switch (route.name) {
    case 'surah':
      return <SurahScreen surah={route.surah} ayah={route.ayah} />;
    case 'names':
      return <NamesScreen />;
    case 'duas':
      return <DuasScreen />;
    case 'ramadan':
      return <RamadanScreen />;
    case 'qibla':
      return <QiblaScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

function renderTab(tab: TabName) {
  switch (tab) {
    case 'home':
      return <HomeScreen />;
    case 'quran':
      return <QuranScreen />;
    case 'prayer':
      return <PrayerScreen />;
    case 'tasbeeh':
      return <TasbeehScreen />;
    case 'more':
      return <MoreScreen />;
  }
}

/**
 * Solid strip behind the status bar so its light icons stay readable when
 * content scrolls underneath (matches the top of every screen's header).
 */
function StatusScrim() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height: insets.top, backgroundColor: theme.heroTop },
      ]}
    />
  );
}

/** Shift applied to a layer while the screen above it slides in. */
function parallax(above: Animated.Value | undefined, width: number) {
  return above
    ? above.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width * PARALLAX],
      })
    : 0;
}

/**
 * A pushed screen: slides in from the right, out again on pop, and can be
 * dragged back from the left edge like on iOS.
 */
function StackCard({
  t,
  above,
  leaving,
  onExited,
  onSwipeBack,
  children,
}: {
  t: Animated.Value;
  above?: Animated.Value;
  leaving: boolean;
  onExited: () => void;
  onSwipeBack: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Keep the latest callback without restarting the animation on every render.
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  useEffect(() => {
    Animated.timing(t, {
      toValue: leaving ? 0 : 1,
      duration: leaving ? 260 : 380,
      easing: leaving ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && leaving && exitedRef.current());
  }, [leaving, t]);

  const pan = useMemo(() => {
    const settle = () =>
      Animated.spring(t, {
        toValue: 1,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !leaving &&
        g.x0 <= EDGE &&
        g.dx > 6 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) =>
        t.setValue(Math.min(1, Math.max(0, 1 - g.dx / width))),
      onPanResponderRelease: (_, g) => {
        if (g.dx > width * 0.33 || g.vx > 0.5) onSwipeBack();
        else settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [t, width, leaving, onSwipeBack]);

  const enter = t.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });
  const shift = parallax(above, width);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dim,
          {
            opacity: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
          },
        ]}
      />
      <Animated.View
        {...pan.panHandlers}
        style={[
          StyleSheet.absoluteFill,
          styles.card,
          {
            backgroundColor: theme.bg,
            transform: [
              { translateX: above ? Animated.add(enter, shift) : enter },
            ],
          },
        ]}
      >
        {children}
        <StatusScrim />
      </Animated.View>
    </>
  );
}

/** Slides the new tab in from the side you're moving towards. */
function TabContent({ tab, dir }: { tab: TabName; dir: number }) {
  const t = useRef(new Animated.Value(1)).current;

  // Layout effect: reset before paint so the new tab never flashes in place.
  useLayoutEffect(() => {
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tab, t]);

  return (
    <Animated.View
      style={[
        styles.flex,
        {
          opacity: t,
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 1],
                outputRange: [dir * 40, 0],
              }),
            },
          ],
        },
      ]}
    >
      {renderTab(tab)}
    </Animated.View>
  );
}

export function Shell() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [{ tab, dir }, setTabState] = useState<{ tab: TabName; dir: number }>({
    tab: 'home',
    dir: 1,
  });
  const [stack, setStack] = useState<Entry[]>([]);
  const seq = useRef(0);

  const push = useCallback((route: Route) => {
    seq.current += 1;
    const key = `r${seq.current}`;
    setStack(s => [
      ...s,
      { key, route, leaving: false, t: new Animated.Value(0) },
    ]);
  }, []);

  const pop = useCallback(() => {
    setStack(s => {
      const idx = s.map(e => e.leaving).lastIndexOf(false);
      if (idx < 0) return s;
      return s.map((e, i) => (i === idx ? { ...e, leaving: true } : e));
    });
  }, []);

  const remove = useCallback((key: string) => {
    setStack(s => s.filter(e => e.key !== key));
  }, []);

  const switchTab = useCallback((next: TabName) => {
    setStack(s => s.map(e => ({ ...e, leaving: true })));
    setTabState(prev =>
      prev.tab === next
        ? prev
        : { tab: next, dir: TAB_INDEX[next] > TAB_INDEX[prev.tab] ? 1 : -1 },
    );
  }, []);

  const hasOpen = stack.some(e => !e.leaving);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasOpen) {
        pop();
        return true;
      }
      if (tab !== 'home') {
        switchTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasOpen, pop, tab, switchTab]);

  const nav = useMemo<Nav>(
    () => ({ tab, setTab: switchTab, push, pop }),
    [tab, switchTab, push, pop],
  );

  return (
    <NavContext.Provider value={nav}>
      <View style={[styles.flex, { backgroundColor: theme.bg }]}>
        <Animated.View
          style={[
            styles.flex,
            { transform: [{ translateX: parallax(stack[0]?.t, width) }] },
          ]}
        >
          <View style={styles.flex}>
            <TabContent tab={tab} dir={dir} />
            <StatusScrim />
          </View>
          {/* Now-reciting mini player, like a music app. */}
          <PlayerBar
            variant="mini"
            onOpen={(surah, ayah) => push({ name: 'surah', surah, ayah })}
          />
          <TabBar tab={tab} onChange={switchTab} />
        </Animated.View>
        {stack.map((entry, i) => (
          <StackCard
            key={entry.key}
            t={entry.t}
            above={stack[i + 1]?.t}
            leaving={entry.leaving}
            onExited={() => remove(entry.key)}
            onSwipeBack={pop}
          >
            {renderRoute(entry.route)}
          </StackCard>
        ))}
      </View>
    </NavContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: { boxShadow: '-10px 0px 30px rgba(0,0,0,0.25)' },
});
