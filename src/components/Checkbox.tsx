import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: boolean;
};

/** Checkbox whose tick pops in with a spring. */
export function Checkbox({ checked, onChange, children, error }: Props) {
  const colors = useColors();
  const pop = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: checked ? 1 : 0,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [checked, pop]);

  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: error
              ? colors.error
              : checked
              ? colors.accent
              : colors.inputBorder,
            backgroundColor: colors.input,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundImage: colors.buttonGradient,
              opacity: pop,
              transform: [{ scale: pop }],
            },
          ]}
        >
          <Text style={styles.tick}>✓</Text>
        </Animated.View>
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: -1 },
  label: { flexShrink: 1, marginLeft: 10 },
});
