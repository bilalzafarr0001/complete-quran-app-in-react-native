import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChatSupportCard } from '../components/ChatSupportCard';
import { SpinningStar } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { FalaqMark } from '../components/FalaqMark';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { Route, useNav } from '../navigation/nav';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

type Feature = {
  route: Route;
  title: string;
  arabic: string;
  desc: string;
  icon: string;
};

const FEATURES: Feature[] = [
  {
    route: { name: 'prayer' },
    title: 'Prayer Times',
    arabic: 'مواقيت الصلاة',
    desc: 'Any day, alerts & salah tracker',
    icon: '🕌',
  },
  {
    route: { name: 'ramadan' },
    title: 'Ramadan',
    arabic: 'رمضان',
    desc: 'Sehri & Iftar timetable',
    icon: '🌙',
  },
  {
    route: { name: 'names' },
    title: '99 Names',
    arabic: 'الأسماء الحسنى',
    desc: 'Al-Asma ul-Husna with meanings',
    icon: '✨',
  },
  {
    route: { name: 'duas' },
    title: 'Duas',
    arabic: 'الأدعية',
    desc: 'Daily, Friday, Ramadan & more',
    icon: '🤲',
  },
];

/** Splits a list into rows of `n` (so cards in a row share one height). */
function rows<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

function FeatureCard({ f, tint }: { f: Feature; tint: string }) {
  const theme = useTheme();
  const nav = useNav();
  return (
    <PressableScale
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
      ]}
      onPress={() => nav.push(f.route)}
      scaleTo={0.97}
      accessibilityLabel={f.title}
    >
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <Text style={styles.iconText}>{f.icon}</Text>
        </View>
        <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
      </View>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={[styles.title, { color: theme.text }]}
      >
        {f.title}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={[styles.arabic, { color: theme.gold }]}
      >
        {f.arabic}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        style={[styles.desc, { color: theme.muted }]}
      >
        {f.desc}
      </Text>
    </PressableScale>
  );
}

export function MoreScreen() {
  const theme = useTheme();
  const nav = useNav();
  const { state } = useStore();
  const { isTablet } = useResponsive();

  const prayedTotal = Object.values(state.prayed).reduce(
    (n, list) => n + list.length,
    0,
  );
  const stats = [
    { label: 'Dhikr', value: state.tasbeeh.total },
    { label: 'Bookmarks', value: state.bookmarks.length },
    { label: 'Prayers logged', value: prayedTotal },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="More"
          arabic="المزيد"
          subtitle="Everything else in Falaq"
        >
          <View style={styles.stats}>
            {stats.map((s, i) => (
              <View
                key={s.label}
                style={[styles.stat, i > 0 && styles.statDivider]}
              >
                <Text maxFontSizeMultiplier={1.2} style={styles.statValue}>
                  {s.value.toLocaleString()}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={1}
                  style={styles.statLabel}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </ScreenHeader>

        <FadeIn delay={60} style={contentColumn}>
          <ChatSupportCard />
        </FadeIn>

        <FadeIn delay={120} style={contentColumn}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.sectionTitle, { color: theme.muted }]}
          >
            EXPLORE
          </Text>
          <View style={styles.grid}>
            {rows(FEATURES, isTablet ? 4 : 2).map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((f, i) => (
                  <FeatureCard
                    key={f.title}
                    f={f}
                    tint={(r + i) % 2 ? theme.goldSoft : theme.primarySoft}
                  />
                ))}
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={180} style={contentColumn}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={[styles.sectionTitle, { color: theme.muted }]}
          >
            APP
          </Text>
          <PressableScale
            style={[
              styles.listRow,
              { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
            ]}
            onPress={() => nav.push({ name: 'settings' })}
            scaleTo={0.98}
            accessibilityLabel="Settings"
          >
            <View
              style={[styles.rowIcon, { backgroundColor: theme.primarySoft }]}
            >
              <Text style={styles.rowEmoji}>⚙️</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>
                Settings
              </Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>
                Location, adhan, Quran audio & display
              </Text>
            </View>
            <Text style={[styles.rowArrow, { color: theme.primary }]}>›</Text>
          </PressableScale>
        </FadeIn>

        <FadeIn delay={240} style={contentColumn}>
          <View style={[styles.about, { backgroundImage: theme.hero }]}>
            <SpinningStar
              size={180}
              color="rgba(255,197,138,0.18)"
              style={styles.aboutStar}
            />
            <FalaqMark size={64} />
            <Text style={styles.aboutArabic}>الْفَلَق</Text>
            <Text style={styles.aboutTitle}>Falaq · Quran & Prayer</Text>
            <Text style={styles.aboutText}>
              “Say, I seek refuge in the Lord of daybreak.” — Al-Falaq 113:1
            </Text>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 30 },
  stats: {
    flexDirection: 'row',
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: onHero.border },
  statValue: { color: onHero.gold, fontSize: 22, fontWeight: '900' },
  statLabel: {
    color: onHero.soft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  grid: { gap: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, borderRadius: 22, padding: 16, minHeight: 168 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 23 },
  chevron: { fontSize: 24, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '800' },
  arabic: { fontSize: 14, marginTop: 2, textAlign: 'left' },
  desc: { fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 14,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 22 },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  rowArrow: { fontSize: 26, fontWeight: '700' },
  about: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  aboutStar: { right: -40, top: -40 },
  aboutArabic: { color: onHero.gold, fontSize: 26, marginTop: 4 },
  aboutTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  aboutText: {
    color: onHero.soft,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
});
