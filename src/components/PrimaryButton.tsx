import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useColors } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
};

/** Gradient button with a springy press-in effect and loading state. */
export function PrimaryButton({ title, onPress, loading }: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      onPressIn={() => springTo(0.96)}
      onPressOut={() => springTo(1)}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
    >
      <Animated.View
        style={[
          styles.button,
          loading && styles.loading,
          {
            backgroundImage: colors.buttonGradient,
            boxShadow: colors.buttonShadow,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loading: { opacity: 0.85 },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
