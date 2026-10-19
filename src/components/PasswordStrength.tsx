import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';
import { passwordStrength } from '../utils/validation';

const LEVELS = [
  { label: '', color: 'transparent' },
  { label: 'Weak', color: '#EF4444' },
  { label: 'Fair', color: '#F59E0B' },
  { label: 'Good', color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

/** Animated bar that fills and changes color as the password gets stronger. */
export function PasswordStrength({ password }: { password: string }) {
  const colors = useColors();
  const score = passwordStrength(password);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: score,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score, progress]);

  if (!password) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: progress.interpolate({
                inputRange: [0, 4],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: progress.interpolate({
                inputRange: [1, 2, 3, 4],
                outputRange: LEVELS.slice(1).map(l => l.color),
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: LEVELS[score].color }]}>
        {LEVELS[score].label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -2,
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  label: { width: 56, textAlign: 'right', fontSize: 12, fontWeight: '700' },
});
