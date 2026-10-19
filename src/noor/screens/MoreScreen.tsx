import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SpinningStar } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { Route, useNav } from '../navigation/nav';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

const FEATURES: {
  route: Route;
  title: string;
  arabic: string;
  desc: string;
  icon: string;
}[] = [
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
    desc: 'Daily supplications',
    icon: '🤲',
  },
  {
    route: { name: 'qibla' },
    title: 'Qibla',
    arabic: 'القبلة',
    desc: 'Direction to the Kaaba',
    icon: '🧭',
  },
  {
    route: { name: 'settings' },
    title: 'Settings',
    arabic: 'الإعدادات',
    desc: 'City, method & display',
    icon: '⚙️',
  },
];

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
          subtitle="Everything else in Noor"
        >
          <View style={styles.stats}>
            {stats.map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value.toLocaleString()}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScreenHeader>

        <View style={[styles.grid, contentColumn]}>
          {FEATURES.map((f, i) => (
            <FadeIn
              key={f.title}
              delay={80 + i * 70}
              scaleFrom={0.9}
              style={[styles.cell, { width: isTablet ? '25%' : '50%' }]}
            >
              <PressableScale
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: theme.cardShadow,
                  },
                ]}
                onPress={() => nav.push(f.route)}
              >
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor:
                        i % 2 ? theme.goldSoft : theme.primarySoft,
                    },
                  ]}
                >
                  <Text style={styles.iconText}>{f.icon}</Text>
                </View>
                <Text style={[styles.arabic, { color: theme.gold }]}>
                  {f.arabic}
                </Text>
                <Text style={[styles.title, { color: theme.text }]}>
                  {f.title}
                </Text>
                <Text style={[styles.desc, { color: theme.muted }]}>
                  {f.desc}
                </Text>
              </PressableScale>
            </FadeIn>
          ))}
        </View>

        <FadeIn delay={420} style={contentColumn}>
          <View style={[styles.about, { backgroundImage: theme.hero }]}>
            <SpinningStar
              size={180}
              color="rgba(241,207,116,0.18)"
              style={styles.aboutStar}
            />
            <Text style={styles.aboutArabic}>نُور</Text>
            <Text style={styles.aboutTitle}>Noor · Quran & Prayer</Text>
            <Text style={styles.aboutText}>
              “Allah is the Light of the heavens and the earth.” — An-Nur 24:35
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
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: onHero.gold, fontSize: 22, fontWeight: '900' },
  statLabel: {
    color: onHero.soft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  cell: { padding: 6 },
  card: { borderRadius: 24, padding: 16, minHeight: 170 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  arabic: { fontSize: 15, marginTop: 14, textAlign: 'left' },
  title: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  desc: { fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  about: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  aboutStar: { right: -40, top: -40 },
  aboutArabic: { color: onHero.gold, fontSize: 40 },
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
