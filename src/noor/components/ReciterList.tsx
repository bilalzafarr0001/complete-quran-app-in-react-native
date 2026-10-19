import { StyleSheet, Text, View } from 'react-native';
import { RECITERS } from '../data/reciters';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { PressableScale } from './PressableScale';

/** Pick the Quran reciter (applies to the next recitation started). */
export function ReciterList({ onPicked }: { onPicked?: () => void }) {
  const theme = useTheme();
  const { state, update } = useStore();
  return (
    <View>
      {RECITERS.map(r => {
        const selected = r.id === state.reciterId;
        return (
          <PressableScale
            key={r.id}
            scaleTo={0.98}
            onPress={() => {
              update({ reciterId: r.id });
              onPicked?.();
            }}
            accessibilityLabel={`Reciter ${r.name}`}
            style={[
              styles.option,
              {
                backgroundColor: selected
                  ? theme.primarySoft
                  : theme.surfaceAlt,
                borderColor: selected ? theme.primary : theme.surfaceAlt,
              },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[styles.name, { color: theme.text }]}>{r.name}</Text>
              <Text style={[styles.arabic, { color: theme.muted }]}>
                {r.arabic} · {r.style}
              </Text>
            </View>
            {selected ? (
              <Text style={[styles.check, { color: theme.primary }]}>✓</Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: '700' },
  arabic: { fontSize: 13, marginTop: 2 },
  check: { fontSize: 18, fontWeight: '900' },
});
