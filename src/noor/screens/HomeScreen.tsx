import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crescent, SpinningStar } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { LiveDot } from '../components/LiveDot';
import { PressableScale } from '../components/PressableScale';
import { RamadanCard } from '../components/RamadanCard';
import { RollingCountdown } from '../components/RollingCountdown';
import { headerStyles } from '../components/ScreenHeader';
import { SkyBand, SkyScene } from '../components/SkyScene';
import { Star8 } from '../components/Star8';
import { VerseOfMoment } from '../components/VerseOfMoment';
import { NAMES_OF_ALLAH } from '../data/names';
import { getSurah } from '../data/surahs';
import {
  ALERT_ICON,
  ALERT_LABEL,
  useAdhanControls,
} from '../hooks/useAdhanControls';
import { usePrayerData } from '../hooks/usePrayerData';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { dateKey, dayIndex, formatGregorian } from '../logic/dates';
import { isFriday, prayerLabel } from '../logic/friday';
import { formatHijri } from '../logic/hijri';
import {
  formatTime,
  PRAYER_LABELS,
  PrayerTimes,
  sunProgress,
} from '../logic/prayerTimes';
import { isRamadan } from '../logic/ramadan';
import {
  openingPage,
  PRAYER_PHASE,
  PrayerPage,
  prayerPages,
  Salah,
} from '../logic/skies';
import { Route, useNav } from '../navigation/nav';
import { openNotificationSettings } from '../services/adhan';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

/** Something that belongs to a prayer's time of day (shown on its page). */
type Companion = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  open: { route: Route } | { tab: 'tasbeeh' };
};

function companionsFor(
  key: Salah,
  ramadan: boolean,
  friday: boolean,
): Companion[] {
  const list: Companion[] = [];
  if (key === 'fajr') {
    list.push({
      id: 'morning',
      icon: '🌅',
      title: 'Morning dua',
      sub: 'Upon entering the morning',
      open: {
        route: { name: 'duas', category: 'Morning & Evening', dua: 'morning' },
      },
    });
  }
  if (key === 'dhuhr' && friday) {
    list.push(
      {
        id: 'durood',
        icon: '🤲',
        title: 'Durood on the Prophet ﷺ',
        sub: 'Send it abundantly on Friday',
        open: {
          route: { name: 'duas', category: 'Friday', dua: 'durood-ibrahimi' },
        },
      },
      {
        id: 'kahf',
        icon: '📖',
        title: 'Surah Al-Kahf',
        sub: 'A light between the two Fridays',
        open: { route: { name: 'surah', surah: 18 } },
      },
    );
  }
  if (key === 'asr') {
    list.push({
      id: 'evening',
      icon: '🌇',
      title: 'Evening dua',
      sub: 'Upon entering the evening',
      open: {
        route: { name: 'duas', category: 'Morning & Evening', dua: 'evening' },
      },
    });
  }
  if (key === 'maghrib' && ramadan) {
    list.push({
      id: 'iftar',
      icon: '🌙',
      title: 'Dua at Iftar',
      sub: 'When you break your fast',
      open: { route: { name: 'duas', category: 'Ramadan', dua: 'iftar' } },
    });
  }
  if (key === 'isha') {
    list.push(
      {
        id: 'mulk',
        icon: '📖',
        title: 'Surah Al-Mulk',
        sub: 'Read each night before sleeping',
        open: { route: { name: 'surah', surah: 67 } },
      },
      {
        id: 'sleep',
        icon: '🌙',
        title: 'Duas before sleep',
        sub: 'Before sleeping · upon waking',
        open: {
          route: { name: 'duas', category: 'Sleep', dua: 'before-sleep' },
        },
      },
    );
  }
  list.push({
    id: 'tasbeeh',
    icon: '📿',
    title: 'Tasbeeh after salah',
    sub: 'SubhanAllah · Alhamdulillah · Allahu Akbar',
    open: { tab: 'tasbeeh' },
  });
  return list;
}

function pageLabel(page: PrayerPage, placeName: string) {
  switch (page.state) {
    case 'now':
      return `NOW · ${placeName.toUpperCase()}`;
    case 'next':
      return page.dayOffset === 1
        ? 'NEXT · TOMORROW'
        : `NEXT · ${placeName.toUpperCase()}`;
    case 'past':
      return 'EARLIER TODAY';
    case 'later':
      return 'LATER TODAY';
  }
}

/** Progress bar that glides to its new value instead of jumping. */
function GlideBar({ progress, fill }: { progress: number; fill: string }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: progress,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundImage: fill,
            width: value.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

type AlertInfo = {
  icon: string;
  text: string;
  label: string;
  onPress: () => void;
};

/** One prayer's page: its sky, its time, and what belongs to it. */
function PrayerSky({
  page,
  width,
  minHeight,
  padTop,
  active,
  placeName,
  today,
  hours,
  nowMs,
  nextAt,
  nextTime,
  nextName,
  prayed,
  alert,
  alertError,
  ramadan,
  prev,
  next,
  onTogglePrayed,
  onOpen,
  onPrev,
  onNext,
  onElapsed,
}: {
  page: PrayerPage;
  width: number;
  minHeight: number;
  padTop: number;
  active: boolean;
  placeName: string;
  today: PrayerTimes;
  hours: number;
  nowMs: number;
  /** When the next prayer starts: as a timestamp, and in today's hours. */
  nextAt: number;
  nextTime: number;
  nextName: string;
  prayed: boolean;
  alert: AlertInfo;
  alertError: string | null;
  ramadan: boolean;
  prev?: string;
  next?: string;
  onTogglePrayed: () => void;
  onOpen: (c: Companion) => void;
  onPrev: () => void;
  onNext: () => void;
  onElapsed: () => void;
}) {
  const theme = useTheme();
  const { fs, compactHeight } = useResponsive();
  const [band, setBand] = useState<SkyBand | null>(null);
  const { key, state } = page;
  const label = prayerLabel(key, page.day);
  const en = label.en;
  const isFajr = key === 'fajr';
  const canMark = state === 'now' || state === 'past';

  // While its time is running: how long until it ends (sunrise for Fajr).
  const endTime = isFajr ? today.sunrise : nextTime;
  const endAt = isFajr ? nowMs + (today.sunrise - hours) * 3600000 : nextAt;
  const span = endTime - page.time;
  const progress =
    span > 0 ? Math.min(1, Math.max(0, (hours - page.time) / span)) : 0;

  const note =
    state === 'now'
      ? isFajr
        ? `Ends at sunrise · ${formatTime(today.sunrise)}`
        : `Started ${formatTime(page.time)}`
      : state === 'past'
      ? isFajr
        ? `Ended at sunrise · ${formatTime(today.sunrise)}`
        : `Began at ${formatTime(page.time)}`
      : `Begins at ${formatTime(page.time)}${
          page.dayOffset === 1 ? ' tomorrow' : ''
        }`;

  return (
    <View
      style={[
        styles.page,
        { width, minHeight, paddingTop: padTop, backgroundImage: theme.hero },
      ]}
    >
      <SkyScene
        phase={PRAYER_PHASE[key]}
        sun={sunProgress(state === 'now' ? hours : page.time, today)}
        band={band}
        still={!active}
      />

      {/* Open sky where the sun, moon and birds go (no text over it). */}
      <View
        style={compactHeight ? styles.skyCompact : styles.sky}
        onLayout={e => {
          const { y, height } = e.nativeEvent.layout;
          setBand(b =>
            b && b.top === y && b.height === height ? b : { top: y, height },
          );
        }}
      />

      <View style={[contentColumn, styles.pageBody]}>
        <View style={styles.labelRow}>
          {state === 'now' ? (
            <LiveDot color={onHero.gold} animate={active} />
          ) : null}
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            style={[styles.pageLabel, state === 'now' && styles.goldText]}
          >
            {pageLabel(page, placeName)}
          </Text>
        </View>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.pageArabic, { fontSize: fs(26) }]}
        >
          {label.ar}
        </Text>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.pageName, { fontSize: fs(compactHeight ? 50 : 62) }]}
        >
          {en}
        </Text>

        {state === 'next' ? (
          <View style={styles.countRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.inWord}>
              in
            </Text>
            <RollingCountdown
              target={nextAt}
              fontSize={fs(30)}
              style={styles.countBig}
              onElapsed={onElapsed}
            />
          </View>
        ) : null}

        <Text maxFontSizeMultiplier={1.3} style={styles.note}>
          {note}
        </Text>

        {state === 'now' ? (
          <View style={styles.nowBox}>
            <View style={styles.countRow}>
              <Text maxFontSizeMultiplier={1.3} style={styles.leftLabel}>
                {isFajr ? 'Sunrise' : nextName} in
              </Text>
              <RollingCountdown
                target={endAt}
                fontSize={fs(19)}
                style={styles.countSmall}
                onElapsed={onElapsed}
              />
            </View>
            <GlideBar progress={progress} fill={theme.gold3} />
          </View>
        ) : null}

        <View style={styles.actions}>
          {canMark ? (
            <>
              <PressableScale
                style={[styles.primaryBtn, prayed && styles.primaryDone]}
                onPress={onTogglePrayed}
                accessibilityLabel={
                  prayed ? `${en} prayed. Tap to undo` : `Mark ${en} as prayed`
                }
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={[styles.primaryText, prayed && styles.whiteText]}
                >
                  {prayed ? `✓  ${en} prayed` : `Mark ${en} as prayed`}
                </Text>
              </PressableScale>
              <PressableScale
                style={styles.roundBtn}
                onPress={alert.onPress}
                accessibilityLabel={alert.label}
              >
                <Text maxFontSizeMultiplier={1.2} style={styles.roundIcon}>
                  {alert.icon}
                </Text>
              </PressableScale>
            </>
          ) : (
            <PressableScale
              style={styles.primaryBtn}
              onPress={alert.onPress}
              accessibilityLabel={alert.label}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={styles.primaryText}
              >
                {`${alert.icon}  ${alert.text}`}
              </Text>
            </PressableScale>
          )}
        </View>
        {active && alertError ? (
          <Text maxFontSizeMultiplier={1.3} style={styles.alertError}>
            {alertError}
          </Text>
        ) : null}

        <Text maxFontSizeMultiplier={1.2} style={styles.withLabel}>
          WITH {en.toUpperCase()}
        </Text>
        {companionsFor(key, ramadan, isFriday(page.day)).map(c => (
          <PressableScale
            key={c.id}
            style={styles.withRow}
            onPress={() => onOpen(c)}
            scaleTo={0.98}
            accessibilityLabel={`${c.title}. ${c.sub}`}
          >
            <View style={styles.withIcon}>
              <Text maxFontSizeMultiplier={1.2} style={styles.withEmoji}>
                {c.icon}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={styles.withTitle}
              >
                {c.title}
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={styles.withSub}
              >
                {c.sub}
              </Text>
            </View>
            <Text style={styles.withArrow}>›</Text>
          </PressableScale>
        ))}
      </View>

      {/* Swipe hint, and buttons for anyone who doesn't swipe. */}
      <View style={[contentColumn, styles.pageNav]}>
        {prev ? (
          <Pressable
            style={styles.pageNavBtn}
            onPress={onPrev}
            accessibilityRole="button"
            accessibilityLabel={`Previous prayer: ${prev}`}
            hitSlop={6}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.pageNavText}>
              {`‹  ${prev}`}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        {next ? (
          <Pressable
            style={styles.pageNavBtn}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={`Next prayer: ${next}`}
            hitSlop={6}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.pageNavText}>
              {`${next}  ›`}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
}

/**
 * Today ("Five Skies"): one page per prayer, each with the sky of its time of
 * day. It opens on the prayer whose time it is (or the next one) and you
 * swipe sideways for the others. Everything else for the day sits below.
 */
export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { fs, width: windowWidth, height } = useResponsive();
  const { state, togglePrayed, tasbeehConfig } = useStore();
  const adhan = useAdhanControls();
  const {
    place,
    isDefaultPlace,
    now,
    today,
    tomorrow,
    date,
    hijri,
    hijriAdjust,
    status,
    nextAt,
    nowMs,
    refresh,
  } = usePrayerData();

  const pages = prayerPages(date, now.hours, today, status);
  const isPrayed = useCallback(
    (p: PrayerPage) => (state.prayed[dateKey(p.day)] ?? []).includes(p.key),
    [state.prayed],
  );
  const anchor = openingPage(pages, isPrayed);
  const ramadan = isRamadan(date, hijriAdjust);
  const friday = isFriday(date);
  const todayKey = dateKey(date);
  /** A page's prayer name (Dhuhr is Jumu'ah on Fridays). */
  const nameOf = (p: PrayerPage) => prayerLabel(p.key, p.day).en;
  const nextPage = pages.find(p => p.state === 'next');
  const prayedToday = (state.prayed[todayKey] ?? []).length;

  const [pagerW, setPagerW] = useState(windowWidth);
  const [headerH, setHeaderH] = useState(insets.top + 110);
  const [tabsW, setTabsW] = useState(0);
  const [page, setPage] = useState(anchor);
  const pageRef = useRef(anchor);
  const pagerRef = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(new Animated.Value(anchor * windowWidth)).current;
  // Only the first value counts; later moves go through goTo (a changing
  // contentOffset prop would make iOS jump pages on its own).
  const startOffset = useRef({ x: anchor * windowWidth, y: 0 }).current;
  const positionedFor = useRef(0);

  const goTo = useCallback(
    (i: number, animated = true) => {
      const target = Math.max(0, Math.min(pages.length - 1, i));
      pageRef.current = target;
      setPage(target);
      pagerRef.current?.scrollTo({ x: target * pagerW, animated });
    },
    [pagerW, pages.length],
  );

  // Put the pager on the right page once its size is known (and again if the
  // width changes, e.g. on rotation).
  const onPagerContent = useCallback(() => {
    if (!pagerW || positionedFor.current === pagerW) return;
    positionedFor.current = pagerW;
    pagerRef.current?.scrollTo({
      x: pageRef.current * pagerW,
      animated: false,
    });
    scrollX.setValue(pageRef.current * pagerW);
  }, [pagerW, scrollX]);

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pagerW) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / pagerW);
    const target = Math.max(0, Math.min(pages.length - 1, i));
    if (target !== pageRef.current) {
      pageRef.current = target;
      setPage(target);
    }
  };

  // When a new prayer time begins, move to its page, unless the reader has
  // swiped somewhere else on purpose.
  const statusKey = `${todayKey}|${status.current}|${status.next}`;
  const follow = useRef({ key: statusKey, page: anchor });
  useEffect(() => {
    if (follow.current.key === statusKey) return;
    const wasFollowing = pageRef.current === follow.current.page;
    follow.current = { key: statusKey, page: anchor };
    if (wasFollowing && anchor !== pageRef.current) goTo(anchor);
  }, [statusKey, anchor, goTo]);

  const alertFor = (p: PrayerPage): AlertInfo => {
    const en = nameOf(p);
    if (adhan.blocked) {
      return {
        icon: '🔕',
        text: 'Allow notifications',
        label: `${en} alert: blocked in system settings. Tap to open settings`,
        onPress: () => {
          openNotificationSettings();
        },
      };
    }
    if (!adhan.settings.enabled) {
      return {
        icon: '🔕',
        text: 'Turn on prayer alerts',
        label: `${en} alert: Off. Tap to change`,
        onPress: () => {
          adhan.cycle(p.key);
        },
      };
    }
    const mode = adhan.settings.modes[p.key];
    return {
      icon: ALERT_ICON[mode],
      text:
        mode === 'off'
          ? 'No alert'
          : `${ALERT_LABEL[mode]} at ${formatTime(p.time)}`,
      label: `${en} alert: ${ALERT_LABEL[mode]}. Tap to change`,
      onPress: () => {
        adhan.cycle(p.key);
      },
    };
  };

  const openCompanion = (c: Companion) => {
    if ('tab' in c.open) nav.setTab(c.open.tab);
    else nav.push(c.open.route);
  };

  const countDurood = () => {
    // Choosing a dhikr resets the count, so keep a Durood count in progress.
    if (state.tasbeeh.dhikrId !== 'durood') {
      tasbeehConfig({ dhikrId: 'durood' });
    }
    nav.setTab('tasbeeh');
  };

  const idx = dayIndex(date);
  const name = NAMES_OF_ALLAH[idx % NAMES_OF_ALLAH.length];
  const lastRead = state.lastRead;
  const cell = tabsW / pages.length;
  const pageMinHeight = Math.max(480, Math.round(height * 0.72));

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ---------- Five skies ---------- */}
      <View
        style={[styles.hero, { backgroundImage: theme.hero }]}
        onLayout={e => {
          // Exact (not rounded) so paging lines up on fractional-width screens.
          const w = e.nativeEvent.layout.width;
          if (w && Math.abs(w - pagerW) > 0.5) setPagerW(w);
        }}
      >
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentOffset={startOffset}
          onContentSizeChange={onPagerContent}
          onMomentumScrollEnd={onSettle}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
        >
          {pages.map((p, i) => (
            <PrayerSky
              key={p.key}
              page={p}
              width={pagerW}
              minHeight={pageMinHeight}
              padTop={headerH}
              active={i === page}
              placeName={place.name}
              today={today}
              hours={now.hours}
              nowMs={nowMs}
              nextAt={nextAt}
              nextTime={status.nextTime}
              nextName={
                nextPage ? nameOf(nextPage) : PRAYER_LABELS[status.next].en
              }
              prayed={isPrayed(p)}
              alert={alertFor(p)}
              alertError={adhan.error}
              ramadan={ramadan}
              prev={i > 0 ? nameOf(pages[i - 1]) : undefined}
              next={i < pages.length - 1 ? nameOf(pages[i + 1]) : undefined}
              onTogglePrayed={() => togglePrayed(dateKey(p.day), p.key)}
              onOpen={openCompanion}
              onPrev={() => goTo(i - 1)}
              onNext={() => goTo(i + 1)}
              onElapsed={refresh}
            />
          ))}
        </Animated.ScrollView>

        {/* Dates, settings and the five prayers, over every page. */}
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { paddingTop: insets.top + 12 }]}
          onLayout={e => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h && h !== headerH) setHeaderH(h);
          }}
        >
          <View pointerEvents="box-none" style={contentColumn}>
            <View pointerEvents="box-none" style={styles.topRow}>
              <View pointerEvents="none" style={styles.dates}>
                <View style={styles.dateChip}>
                  <Crescent size={14} color={onHero.gold} />
                  <Text
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                    style={styles.dateText}
                  >
                    {formatHijri(hijri)}
                  </Text>
                </View>
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={styles.gregorian}
                >
                  {friday ? (
                    <Text style={styles.mubarak}>Jumu'ah Mubarak · </Text>
                  ) : null}
                  {formatGregorian(date, !friday)}
                </Text>
              </View>
              <PressableScale
                style={headerStyles.iconButton}
                onPress={() => nav.push({ name: 'settings' })}
                accessibilityLabel="Settings"
              >
                <Text style={headerStyles.iconText}>{'⚙︎'}</Text>
              </PressableScale>
            </View>

            <View
              style={styles.tabs}
              onLayout={e => setTabsW(e.nativeEvent.layout.width)}
            >
              {tabsW > 0 && pagerW > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.underlineWrap,
                    {
                      width: cell,
                      transform: [
                        {
                          translateX: scrollX.interpolate({
                            inputRange: [0, pagerW],
                            outputRange: [0, cell],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.underline} />
                </Animated.View>
              ) : null}
              {pages.map((p, i) => {
                const en = nameOf(p);
                const done = isPrayed(p);
                return (
                  <Pressable
                    key={p.key}
                    style={styles.tab}
                    onPress={() => goTo(i)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: i === page }}
                    accessibilityLabel={done ? `${en}, prayed` : en}
                  >
                    <Text
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={1}
                      style={[
                        styles.tabText,
                        i === page && styles.tabTextActive,
                      ]}
                    >
                      {en}
                    </Text>
                    {done ? (
                      <Text maxFontSizeMultiplier={1.2} style={styles.tabCheck}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* ---------- The rest of the day ---------- */}
      <View style={contentColumn}>
        {isDefaultPlace ? (
          <FadeIn delay={120}>
            <PressableScale
              style={[
                styles.locationBanner,
                { backgroundColor: theme.goldSoft, borderColor: theme.gold },
              ]}
              onPress={() => nav.push({ name: 'settings' })}
              scaleTo={0.98}
              accessibilityLabel="Set your location"
            >
              <Text style={styles.bannerEmoji}>📍</Text>
              <View style={styles.flex}>
                <Text style={[styles.bannerTitle, { color: theme.text }]}>
                  Set your location
                </Text>
                <Text style={[styles.bannerBody, { color: theme.muted }]}>
                  Showing Makkah times. Tap to detect where you are.
                </Text>
              </View>
              <Text style={[styles.bannerArrow, { color: theme.gold }]}>›</Text>
            </PressableScale>
          </FadeIn>
        ) : null}

        {/* ---------- Friday ---------- */}
        {friday ? (
          <FadeIn delay={140}>
            <View
              style={[
                styles.friday,
                { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
              ]}
            >
              <SpinningStar
                size={150}
                color="rgba(255,197,138,0.16)"
                style={styles.fridayStar}
                duration={40000}
              />
              <View style={styles.fridayHead}>
                <Text
                  maxFontSizeMultiplier={1.3}
                  accessibilityRole="header"
                  style={styles.fridayTitle}
                >
                  Jumu'ah Mubarak
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={[styles.fridayArabic, { fontSize: fs(22) }]}
                >
                  جمعة مباركة
                </Text>
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.fridayBody}>
                The Prophet ﷺ asked us to send abundant Durood upon him on
                Fridays, for it is presented to him.
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.fridayRef}>
                Sunan Abi Dawud 1047
              </Text>
              <View style={styles.fridayActions}>
                <PressableScale
                  style={styles.fridayBtn}
                  onPress={countDurood}
                  accessibilityLabel="Count Durood"
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                    style={styles.primaryText}
                  >
                    📿 Count Durood
                  </Text>
                </PressableScale>
                <PressableScale
                  style={[styles.fridayBtn, styles.fridayBtnGhost]}
                  onPress={() =>
                    nav.push({
                      name: 'duas',
                      category: 'Friday',
                      dua: 'durood-ibrahimi',
                    })
                  }
                  accessibilityLabel="Read Durood Ibrahimi"
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                    style={[styles.primaryText, styles.whiteText]}
                  >
                    Read Durood
                  </Text>
                </PressableScale>
              </View>
            </View>
          </FadeIn>
        ) : null}

        <FadeIn delay={160}>
          <PressableScale
            style={[
              styles.timesCard,
              { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            ]}
            onPress={() => nav.push({ name: 'prayer' })}
            scaleTo={0.98}
            accessibilityLabel="All prayer times"
          >
            <View
              style={[styles.timesIcon, { backgroundColor: theme.goldSoft }]}
            >
              <Text maxFontSizeMultiplier={1.2} style={styles.timesEmoji}>
                🕌
              </Text>
            </View>
            <View style={styles.flex}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.timesTitle, { color: theme.text }]}
              >
                All prayer times
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={2}
                style={[styles.timesSub, { color: theme.muted }]}
              >
                Any day · salah tracker · {prayedToday}/5 prayed today
              </Text>
            </View>
            <Text style={[styles.bannerArrow, { color: theme.primary }]}>
              ›
            </Text>
          </PressableScale>
        </FadeIn>

        {/* ---------- Ramadan (Sehri / Iftar, or countdown to it) ---------- */}
        <FadeIn delay={200}>
          <RamadanCard
            date={date}
            hijriAdjust={hijriAdjust}
            hours={now.hours}
            nowMs={nowMs}
            today={today}
            tomorrow={tomorrow}
            onElapsed={refresh}
          />
        </FadeIn>

        {/* ---------- Continue reading ---------- */}
        {lastRead ? (
          <FadeIn delay={240}>
            <PressableScale
              style={[
                styles.continue,
                {
                  backgroundImage: theme.primary3,
                  boxShadow: theme.floatShadow,
                },
              ]}
              onPress={() =>
                nav.push({
                  name: 'surah',
                  surah: lastRead.surah,
                  ayah: lastRead.ayah,
                })
              }
            >
              <Star8 size={50} color="rgba(255,255,255,0.18)">
                <Text style={styles.continueNum}>{lastRead.surah}</Text>
              </Star8>
              <View style={styles.continueText}>
                <Text style={styles.continueLabel}>CONTINUE READING</Text>
                <Text numberOfLines={1} style={styles.continueTitle}>
                  {getSurah(lastRead.surah).name}
                </Text>
                <Text style={styles.continueSub}>
                  Ayah {lastRead.ayah} of {getSurah(lastRead.surah).ayahs}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.continueArabic, { fontSize: fs(24) }]}
              >
                {getSurah(lastRead.surah).arabic}
              </Text>
            </PressableScale>
          </FadeIn>
        ) : null}

        {/* ---------- Verse of the moment ---------- */}
        <FadeIn delay={280}>
          <VerseOfMoment />
        </FadeIn>

        {/* ---------- Name of the day ---------- */}
        <FadeIn delay={320}>
          <Text style={[styles.section, { color: theme.text }]}>
            Name of Allah
          </Text>
          <PressableScale
            style={[
              styles.nameCard,
              { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
            ]}
            onPress={() => nav.push({ name: 'names' })}
          >
            <SpinningStar
              size={160}
              color="rgba(255,197,138,0.18)"
              style={styles.nameStar}
              duration={40000}
            />
            <View style={styles.flex}>
              <Text style={styles.nameNumber}>#{name.number} of 99</Text>
              <Text style={styles.nameTranslit}>{name.transliteration}</Text>
              <Text style={styles.nameMeaning}>{name.meaning}</Text>
              <Text style={styles.nameLink}>See all names ›</Text>
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.nameArabic, { fontSize: fs(40) }]}
            >
              {name.arabic}
            </Text>
          </PressableScale>
        </FadeIn>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  flex: { flex: 1 },
  goldText: { color: onHero.gold },
  whiteText: { color: '#FFFFFF' },

  // Pager and pages
  hero: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  page: { overflow: 'hidden', paddingBottom: 14 },
  sky: { height: 56 },
  skyCompact: { height: 26 },
  pageBody: { paddingHorizontal: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pageLabel: {
    flexShrink: 1,
    color: onHero.soft,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageArabic: { color: onHero.gold, marginTop: 8, textAlign: 'left' },
  pageName: {
    color: onHero.text,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  inWord: { color: onHero.text, fontSize: 22, fontWeight: '700' },
  countBig: { color: onHero.text, fontWeight: '800' },
  note: {
    color: onHero.soft,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  nowBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,197,138,0.28)',
  },
  leftLabel: { color: onHero.soft, fontSize: 14, fontWeight: '700' },
  countSmall: { color: onHero.gold, fontWeight: '800' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    flexShrink: 1,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryDone: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryText: { color: '#5A1F3A', fontSize: 15, fontWeight: '800' },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  roundIcon: { fontSize: 19 },
  alertError: {
    color: onHero.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  withLabel: {
    color: onHero.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 22,
    marginBottom: 8,
  },
  withRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  withIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  withEmoji: { fontSize: 19 },
  withTitle: { color: onHero.text, fontSize: 15, fontWeight: '800' },
  withSub: {
    color: onHero.soft,
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  withArrow: { color: onHero.soft, fontSize: 22, fontWeight: '700' },
  pageNav: {
    marginTop: 'auto',
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageNavBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageNavText: { color: onHero.soft, fontSize: 13.5, fontWeight: '700' },

  // Header over the pages
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dates: { flex: 1, alignItems: 'flex-start', gap: 6 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: onHero.faint,
    borderColor: onHero.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateText: { color: onHero.text, fontSize: 13, fontWeight: '700' },
  gregorian: {
    color: onHero.soft,
    fontSize: 13,
    marginLeft: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  mubarak: { color: onHero.gold, fontWeight: '800' },
  tabs: { flexDirection: 'row', marginTop: 10 },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // A soft shadow keeps the names readable over drifting clouds.
  tabText: {
    color: onHero.soft,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tabTextActive: { color: onHero.text, fontWeight: '900' },
  tabCheck: { color: onHero.gold, fontSize: 12, fontWeight: '900' },
  underlineWrap: {
    position: 'absolute',
    left: 0,
    bottom: 3,
    alignItems: 'center',
  },
  underline: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: onHero.gold,
  },

  // Below the pages
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  bannerEmoji: { fontSize: 22 },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerBody: { fontSize: 12.5, marginTop: 2 },
  bannerArrow: { fontSize: 24, fontWeight: '700' },
  friday: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
  },
  fridayStar: { right: -36, top: -40 },
  fridayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: 10,
  },
  fridayTitle: { color: onHero.text, fontSize: 22, fontWeight: '900' },
  fridayArabic: { color: onHero.gold },
  fridayBody: {
    color: onHero.soft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  fridayRef: {
    color: onHero.gold,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 6,
  },
  fridayActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  fridayBtn: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  fridayBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  timesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 22,
    padding: 14,
  },
  timesIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timesEmoji: { fontSize: 22 },
  timesTitle: { fontSize: 16, fontWeight: '800' },
  timesSub: { fontSize: 12.5, marginTop: 2 },
  section: {
    fontSize: 19,
    fontWeight: '800',
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 6,
  },
  continue: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueNum: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  continueText: { flex: 1, marginLeft: 14 },
  continueLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  continueSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  continueArabic: { color: onHero.gold, marginLeft: 8, maxWidth: '35%' },
  nameCard: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nameStar: { right: -30, top: -30 },
  nameNumber: {
    color: onHero.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nameTranslit: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  nameMeaning: { color: onHero.soft, fontSize: 14, marginTop: 2 },
  nameLink: {
    color: onHero.gold,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  nameArabic: { color: onHero.gold, marginLeft: 10, maxWidth: '45%' },
});
