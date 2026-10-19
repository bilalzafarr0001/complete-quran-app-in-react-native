import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { useEntrance } from '../hooks/useEntrance';
import { useColors } from '../theme';

const features = [
  {
    icon: '⚡️',
    title: 'Fast Refresh',
    body: 'Save a file and see changes instantly.',
  },
  {
    icon: '📱',
    title: 'Cross-platform',
    body: 'One codebase for iOS and Android.',
  },
  {
    icon: '🎨',
    title: 'Dark mode ready',
    body: 'Colors follow your system theme.',
  },
];

type Props = {
  name: string;
  onLogout: () => void;
};

export function HomeScreen({ name, onLogout }: Props) {
  const colors = useColors();
  const enter = useEntrance(features.length + 2);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[styles.hero, { backgroundColor: colors.accent }, enter(0)]}
        >
          <Text style={styles.heroEmoji}>👋</Text>
          <Text style={styles.heroTitle}>Welcome, {name}!</Text>
          <Text style={styles.heroSubtitle}>You're signed in to MyApp.</Text>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          What you get
        </Text>

        {features.map((item, i) => (
          <Animated.View
            key={item.title}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              enter(i + 1),
            ]}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardBody, { color: colors.muted }]}>
                {item.body}
              </Text>
            </View>
          </Animated.View>
        ))}

        <Animated.View style={enter(features.length + 1)}>
          <PrimaryButton title="Log Out" onPress={onLogout} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  hero: {
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 22 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardBody: { fontSize: 14, lineHeight: 20 },
});
