import { StyleSheet, Text, View } from 'react-native';
import { useNav } from '../navigation/nav';
import { useTheme } from '../theme';
import { SpinningStar } from './Decor';
import { PressableScale } from './PressableScale';

/** Opens the AI chat support (used on Settings and More). */
export function ChatSupportCard() {
  const theme = useTheme();
  const nav = useNav();
  return (
    <PressableScale
      onPress={() => nav.push({ name: 'assistant' })}
      scaleTo={0.98}
      style={[
        styles.card,
        { backgroundImage: theme.hero, boxShadow: theme.floatShadow },
      ]}
      accessibilityLabel="Chat support"
    >
      <SpinningStar
        size={130}
        color="rgba(255,197,138,0.18)"
        style={styles.star}
        duration={40000}
      />
      <View style={styles.icon}>
        <Text style={styles.emoji}>💬</Text>
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            Chat support
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI</Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.sub}>
          Ask about the app or any Islamic question
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
  },
  star: { right: -30, top: -40 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji: { fontSize: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#FFC58A',
  },
  badgeText: { color: '#5A1F3A', fontSize: 11, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 3 },
  arrow: { color: '#FFC58A', fontSize: 28, fontWeight: '700' },
});
