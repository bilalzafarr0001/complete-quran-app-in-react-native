import { useMemo, useRef } from 'react';
import {
  ScrollView,
  ScrollViewInstance,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { headerStyles, ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { Star8 } from '../components/Star8';
import { useAdhanControls } from '../hooks/useAdhanControls';
import { usePrayerData } from '../hooks/usePrayerData';
import { contentColumn } from '../hooks/useResponsive';
import { dateKey, MONTHS, WEEKDAYS, weekdayOf } from '../logic/dates';
import { calculatePrayerTimes, formatTime, YMD } from '../logic/prayerTimes';
import {
  oddNightAfter,
  ordinal,
  ramadanFor,
  SEHRI_OPTIONS,
} from '../logic/ramadan';
import { offsetOn } from '../logic/timezone';
import { useStore } from '../store';
import { useTheme } from '../theme';

const shortDate = (d: YMD) =>
  `${WEEKDAYS[weekdayOf(d)].slice(0, 3)}, ${d.d} ${MONTHS[d.m - 1].slice(
    0,
    3,
  )}`;

/** Sehri (ends at Fajr) and Iftar (Maghrib) for every day of Ramadan. */
export function RamadanScreen() {
  const theme = useTheme();
  const { state } = useStore();
  const { place, date, hijriAdjust } = usePrayerData();
  const adhan = useAdhanControls();
  const scroll = useRef<ScrollViewInstance>(null);
  const todayKey = dateKey(date);

  const info = useMemo(
    () => ramadanFor(date, hijriAdjust),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey, hijriAdjust],
  );
  const rows = useMemo(
    () =>
      info.days.map(({ date: d, day }) => {
        const t = calculatePrayerTimes(
          d,
          place,
          offsetOn(place, d),
          state.method,
          state.madhab,
        );
        return {
          date: d,
          day,
          key: dateKey(d),
          sehri: t.fajr,
          iftar: t.maghrib,
        };
      }),
    [info, place, state.method, state.madhab],
  );

  const share = () => {
    const lines = rows.map(
      r =>
        `${r.day}. ${shortDate(r.date)} · Sehri ${formatTime(
          r.sehri,
        )} · Iftar ${formatTime(r.iftar)}`,
    );
    Share.share({
      message: `Ramadan ${info.year}: Sehri & Iftar timetable\n${
        place.name
      }\n\n${lines.join('\n')}\n\nShared from Noor`,
    });
  };

  const setSehri = async (v: (typeof SEHRI_OPTIONS)[number]['value']) => {
    if (v > 0 && !adhan.settings.enabled && !(await adhan.enable())) return;
    adhan.updateNotifications({ sehriMinutes: v });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          back
          title={`Ramadan ${info.year}`}
          arabic="رَمَضَان"
          subtitle={
            info.today
              ? `Day ${info.today} of ${rows.length} · ${place.name}`
              : `Begins in ${info.daysUntil} ${
                  info.daysUntil === 1 ? 'day' : 'days'
                } · ${place.name}`
          }
          right={
            <PressableScale
              onPress={share}
              style={headerStyles.iconButton}
              accessibilityLabel="Share timetable"
            >
              <Text style={headerStyles.iconText}>⇪</Text>
            </PressableScale>
          }
        />

        <View style={contentColumn}>
          <FadeIn delay={60}>
            <View
              style={[
                styles.reminder,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              <Text style={[styles.reminderTitle, { color: theme.text }]}>
                Sehri reminder
              </Text>
              <Text style={[styles.reminderHint, { color: theme.muted }]}>
                A notification before Sehri ends, on every day of Ramadan.
              </Text>
              <View style={styles.reminderControl}>
                <Segmented
                  value={
                    adhan.settings.enabled ? adhan.settings.sehriMinutes : 0
                  }
                  onChange={setSehri}
                  options={SEHRI_OPTIONS}
                />
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={120}>
            <View
              style={[
                styles.table,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              <View style={[styles.row, styles.headRow]}>
                <Text
                  style={[
                    styles.headCell,
                    styles.dayCol,
                    { color: theme.muted },
                  ]}
                >
                  DAY
                </Text>
                <Text
                  style={[styles.headCell, styles.flex, { color: theme.muted }]}
                >
                  DATE
                </Text>
                <Text
                  style={[
                    styles.headCell,
                    styles.timeCol,
                    { color: theme.muted },
                  ]}
                >
                  SEHRI ENDS
                </Text>
                <Text
                  style={[
                    styles.headCell,
                    styles.timeCol,
                    { color: theme.muted },
                  ]}
                >
                  IFTAR
                </Text>
              </View>
              {rows.map(r => {
                const isToday = r.key === todayKey;
                const past = info.today !== null && r.day < info.today;
                const night = oddNightAfter(r.day);
                return (
                  <View
                    key={r.key}
                    onLayout={
                      isToday
                        ? e =>
                            scroll.current?.scrollTo({
                              y: Math.max(0, e.nativeEvent.layout.y + 120),
                              animated: true,
                            })
                        : undefined
                    }
                    style={[
                      styles.row,
                      { borderTopColor: theme.border },
                      isToday && {
                        backgroundColor: theme.primarySoft,
                        borderColor: theme.gold,
                      },
                      isToday && styles.todayRow,
                      past && styles.past,
                    ]}
                  >
                    <View style={styles.dayCol}>
                      <Star8
                        size={34}
                        color={theme.gold}
                        outline={!isToday}
                        borderWidth={1.2}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            isToday
                              ? styles.dayNumToday
                              : { color: theme.primary },
                          ]}
                        >
                          {r.day}
                        </Text>
                      </Star8>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.date, { color: theme.text }]}>
                        {isToday ? 'Today' : shortDate(r.date)}
                      </Text>
                      {night ? (
                        <Text style={[styles.night, { color: theme.gold }]}>
                          ✦ {ordinal(night)} night begins at Iftar
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.time,
                        styles.timeCol,
                        { color: theme.text },
                      ]}
                    >
                      {formatTime(r.sehri)}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        styles.timeCol,
                        { color: theme.text },
                      ]}
                    >
                      {formatTime(r.iftar)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </FadeIn>

          <Text style={[styles.note, { color: theme.muted }]}>
            Sehri ends at Fajr; many people stop eating a few minutes earlier as
            a precaution. Dates follow the app's Hijri calendar and may move by
            a day with local moon sighting (adjust it in Settings).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 40 },
  reminder: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
  },
  reminderTitle: { fontSize: 16, fontWeight: '800' },
  reminderHint: { fontSize: 12.5, marginTop: 2 },
  reminderControl: { marginTop: 12 },
  table: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 22,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  headRow: { borderTopWidth: 0, paddingVertical: 8 },
  todayRow: { borderWidth: 1.5, borderRadius: 16, marginHorizontal: 4 },
  past: { opacity: 0.45 },
  headCell: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  dayCol: { width: 46 },
  timeCol: { width: 78, textAlign: 'right' },
  dayNum: { fontSize: 12, fontWeight: '900' },
  dayNumToday: { color: '#2A1E00' },
  date: { fontSize: 14.5, fontWeight: '700' },
  night: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  time: { fontSize: 14.5, fontWeight: '800' },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 24,
    marginTop: 16,
  },
});
