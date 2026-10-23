import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatGregorian } from '../logic/dates';
import { addDays, formatTime, PrayerTimes, YMD } from '../logic/prayerTimes';
import { isRamadan, nextFastEvent, ramadanFor } from '../logic/ramadan';
import { useNav } from '../navigation/nav';
import { onHero, useTheme } from '../theme';
import { Crescent, SpinningStar, StarField } from './Decor';
import { PressableScale } from './PressableScale';
import { RollingCountdown } from './RollingCountdown';

type Props = {
  date: YMD;
  hijriAdjust: number;
  /** Local hours now at the user's place. */
  hours: number;
  nowMs: number;
  today: PrayerTimes;
  tomorrow: PrayerTimes;
  onElapsed: () => void;
};

/**
 * Home card: during Ramadan, today's Sehri / Iftar times with a countdown to
 * the next one; the rest of the year, a countdown to the start of Ramadan.
 */
export function RamadanCard({
  date,
  hijriAdjust,
  hours,
  nowMs,
  today,
  tomorrow,
  onElapsed,
}: Props) {
  const theme = useTheme();
  const nav = useNav();
  const info = useMemo(
    () => ramadanFor(date, hijriAdjust),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date.y, date.m, date.d, hijriAdjust],
  );
  const open = () => nav.push({ name: 'ramadan' });

  if (info.today === null) {
    const start = info.days[0]?.date;
    return (
      <PressableScale
        onPress={open}
        scaleTo={0.98}
        accessibilityLabel="Ramadan timetable"
        style={[
          styles.slim,
          { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
        ]}
      >
        <View style={[styles.slimMoon, { backgroundColor: theme.primarySoft }]}>
          <Crescent size={20} color={theme.gold} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.slimTitle, { color: theme.text }]}>
            Ramadan {info.year}
            {info.daysUntil === 1 ? ' begins tomorrow' : ''}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.slimSub, { color: theme.muted }]}
          >
            {info.daysUntil === 1
              ? `First Sehri ends at ${formatTime(tomorrow.fajr)}`
              : start
              ? `Expected ${formatGregorian(start)}`
              : ''}
          </Text>
          <Text style={[styles.slimLink, { color: theme.primary }]}>
            Sehri & Iftar timetable ›
          </Text>
        </View>
        {info.daysUntil > 1 ? (
          <View style={styles.slimCount}>
            <Text style={[styles.slimDays, { color: theme.gold }]}>
              {info.daysUntil}
            </Text>
            <Text style={[styles.slimDaysLabel, { color: theme.muted }]}>
              days
            </Text>
          </View>
        ) : null}
      </PressableScale>
    );
  }

  const next = nextFastEvent(
    hours,
    today,
    tomorrow,
    isRamadan(addDays(date, 1), hijriAdjust),
  );
  const nextAt = next ? nowMs + (next.at - hours) * 3600000 : 0;
  // Before Fajr it's today's Sehri; after Maghrib, tomorrow's.
  const sehriTime =
    next?.kind === 'sehri' && next.at > 24 ? tomorrow.fajr : today.fajr;

  const tile = (kind: 'sehri' | 'iftar', label: string, time: number) => {
    const isNext = next?.kind === kind;
    return (
      <View style={[styles.tile, isNext && styles.tileNext]}>
        <Text style={[styles.tileLabel, isNext && styles.gold]}>{label}</Text>
        <Text style={styles.tileTime}>{formatTime(time)}</Text>
      </View>
    );
  };

  return (
    <PressableScale
      onPress={open}
      scaleTo={0.98}
      accessibilityLabel="Ramadan timetable"
      style={[
        styles.card,
        { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
      ]}
    >
      <StarField count={12} height={170} seed={9} />
      <SpinningStar
        size={170}
        color="rgba(241,207,116,0.14)"
        style={styles.watermark}
      />
      <View style={styles.head}>
        <Crescent size={18} color={onHero.gold} />
        <Text style={styles.headText}>
          RAMADAN {info.year} · DAY {info.today}
        </Text>
        <Text style={styles.headLink}>Timetable ›</Text>
      </View>
      <View style={styles.tiles}>
        {tile('sehri', 'SEHRI ENDS', sehriTime)}
        {tile('iftar', 'IFTAR', today.maghrib)}
      </View>
      {next ? (
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>
            {next.kind === 'iftar' ? 'Iftar in' : 'Sehri ends in'}
          </Text>
          <RollingCountdown
            target={nextAt}
            fontSize={20}
            style={styles.countValue}
            onElapsed={onElapsed}
          />
        </View>
      ) : (
        <Text style={styles.eid}>
          Ramadan is complete · Eid Mubarak! عيد مبارك
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gold: { color: onHero.gold },
  slim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
  },
  slimMoon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimTitle: { fontSize: 16, fontWeight: '800' },
  slimSub: { fontSize: 12.5, marginTop: 2 },
  slimLink: { fontSize: 12.5, fontWeight: '800', marginTop: 6 },
  slimCount: { alignItems: 'center', minWidth: 48 },
  slimDays: { fontSize: 26, fontWeight: '900' },
  slimDaysLabel: { fontSize: 11, fontWeight: '700', marginTop: -2 },
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
  },
  watermark: { right: -50, top: -50 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: {
    flex: 1,
    color: onHero.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headLink: { color: onHero.soft, fontSize: 12.5, fontWeight: '800' },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 14 },
  tile: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: onHero.border,
  },
  tileNext: {
    borderColor: 'rgba(241,207,116,0.75)',
    backgroundColor: 'rgba(241,207,116,0.12)',
  },
  tileLabel: {
    color: onHero.soft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tileTime: {
    color: onHero.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  countLabel: { color: onHero.soft, fontSize: 14, fontWeight: '700' },
  countValue: { color: onHero.gold, fontWeight: '800' },
  eid: {
    color: onHero.gold,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 14,
  },
});
