import { ReactNode, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

type Props = {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  scaleTo?: number;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  hitSlop?: number;
};

// A single animated view, so layout styles (width %, flex, margins) apply to
// the element that actually sits in the parent's layout.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that springs down slightly while pressed. */
export function PressableScale({
  onPress,
  onLongPress,
  style,
  children,
  scaleTo = 0.96,
  disabled,
  accessibilityRole = 'button',
  accessibilityLabel,
  hitSlop,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 7,
      useNativeDriver: true,
    }).start();

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => springTo(scaleTo)}
      onPressOut={() => springTo(1)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
