import { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '../theme';

type Provider = 'google' | 'apple';

type Props = {
  onPress: (provider: Provider) => void;
};

function SocialButton({
  label,
  icon,
  iconStyle,
  onPress,
}: {
  label: string;
  icon: string;
  iconStyle?: object;
  onPress: () => void;
}) {
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
      style={styles.flex}
      onPress={onPress}
      onPressIn={() => springTo(0.95)}
      onPressOut={() => springTo(1)}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
    >
      <Animated.View
        style={[
          styles.button,
          {
            borderColor: colors.inputBorder,
            backgroundColor: colors.card,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.icon, { color: colors.text }, iconStyle]}>
          {icon}
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** "or continue with" divider plus Google / Apple buttons (Apple on iOS only). */
export function SocialButtons({ onPress }: Props) {
  const colors = useColors();
  return (
    <View>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.inputBorder }]} />
        <Text style={[styles.dividerText, { color: colors.muted }]}>
          or continue with
        </Text>
        <View style={[styles.line, { backgroundColor: colors.inputBorder }]} />
      </View>
      <View style={styles.row}>
        <SocialButton
          label="Google"
          icon="G"
          iconStyle={styles.google}
          onPress={() => onPress('google')}
        />
        {Platform.OS === 'ios' && (
          <>
            <View style={styles.gap} />
            <SocialButton
              label="Apple"
              icon={''}
              onPress={() => onPress('apple')}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row' },
  gap: { width: 12 },
  flex: { flex: 1 },
  button: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18, fontWeight: '800', marginRight: 8 },
  google: { color: '#4285F4' },
  label: { fontSize: 15, fontWeight: '600' },
});
