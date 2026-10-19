import { Ref, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
} from 'react-native';
import { useColors } from '../theme';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  error?: string;
  secure?: boolean;
  ref?: Ref<TextInputInstance>;
};

/** Text field with a floating label, animated focus border and error message. */
export function FormInput({
  label,
  error,
  secure,
  value,
  onFocus,
  onBlur,
  ref,
  ...rest
}: Props) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const float = useRef(new Animated.Value(value ? 1 : 0)).current;
  const focus = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(float, {
      toValue: focused || value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, value, float]);

  useEffect(() => {
    Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused, focus]);

  useEffect(() => {
    Animated.timing(errorAnim, {
      toValue: error ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [error, errorAnim]);

  const borderColor = error
    ? colors.error
    : focus.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.inputBorder, colors.accent],
      });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: colors.input,
            borderColor,
          },
        ]}
      >
        <View style={styles.inputArea}>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.label,
              {
                color: error
                  ? colors.error
                  : focused
                  ? colors.accent
                  : colors.muted,
                top: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 7],
                }),
                fontSize: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 12],
                }),
              },
            ]}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={ref}
            {...rest}
            value={value}
            secureTextEntry={secure && hidden}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
          />
        </View>
        {secure ? (
          <Pressable
            hitSlop={10}
            onPress={() => setHidden(h => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Text style={[styles.toggle, { color: colors.accent }]}>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
      <Animated.Text
        style={[
          styles.error,
          {
            color: colors.error,
            opacity: errorAnim,
            height: errorAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 20],
            }),
          },
        ]}
      >
        {error}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  inputArea: { flex: 1, height: '100%', justifyContent: 'center' },
  label: { position: 'absolute', left: 0 },
  input: {
    fontSize: 16,
    paddingTop: 18,
    paddingBottom: 4,
    paddingHorizontal: 0,
  },
  toggle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  error: { fontSize: 12, marginTop: 4, marginLeft: 6 },
});
