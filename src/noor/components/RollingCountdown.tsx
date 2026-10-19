import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNow } from '../hooks/useNow';
import { formatCountdown } from '../logic/prayerTimes';

const MAX_SCALE = 1.3;

/** One character that rolls up (old out, new in) whenever it changes. */
const RollingChar = memo(function RollingCharInner({
  char,
  textStyle,
  lineHeight,
}: {
  char: string;
  textStyle: StyleProp<TextStyle>;
  lineHeight: number;
}) {
  const prev = useRef(char);
  const [old, setOld] = useState<string | null>(null);
  const t = useRef(new Animated.Value(1)).current;

  // Layout effect: reset before paint so the new digit never flashes in place.
  useLayoutEffect(() => {
    if (prev.current === char) return;
    setOld(prev.current);
    prev.current = char;
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setOld(null));
  }, [char, t]);

  return (
    <View style={[styles.slot, { height: lineHeight }]}>
      <Animated.Text
        maxFontSizeMultiplier={MAX_SCALE}
        style={[
          textStyle,
          {
            lineHeight,
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [lineHeight * 0.8, 0],
                }),
              },
            ],
            opacity: t,
          },
        ]}
      >
        {char}
      </Animated.Text>
      {old !== null ? (
        <Animated.Text
          maxFontSizeMultiplier={MAX_SCALE}
          style={[
            textStyle,
            styles.old,
            {
              lineHeight,
              opacity: t.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  translateY: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -lineHeight * 0.8],
                  }),
                },
              ],
            },
          ]}
        >
          {old}
        </Animated.Text>
      ) : null}
    </View>
  );
});

type Props = {
  /** Absolute timestamp (ms) to count down to. */
  target: number;
  /** Font size of the digits. */
  fontSize: number;
  style?: StyleProp<TextStyle>;
  /** Called once when the countdown reaches zero. */
  onElapsed?: () => void;
};

/**
 * Live HH:MM:SS countdown with flip-clock style rolling digits.
 * It ticks on its own, so parents don't need to re-render every second.
 */
export function RollingCountdown({
  target,
  fontSize,
  style,
  onElapsed,
}: Props) {
  const [now] = useNow(1000);
  const { fontScale } = useWindowDimensions();
  const remainingHours = Math.max(0, (target - now) / 3600000);
  const text = formatCountdown(remainingHours);
  const lineHeight = Math.round(
    fontSize * Math.min(fontScale, MAX_SCALE) * 1.22,
  );

  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [target]);
  useEffect(() => {
    if (remainingHours <= 0 && !fired.current) {
      fired.current = true;
      onElapsed?.();
    }
  }, [remainingHours, onElapsed]);

  const textStyle = [
    style,
    { fontSize, fontVariant: ['tabular-nums' as const] },
  ];

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Starts in ${text}`}
    >
      {text.split('').map((c, i) => (
        <RollingChar
          key={i}
          char={c}
          textStyle={textStyle}
          lineHeight={lineHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  slot: { overflow: 'hidden' },
  old: { position: 'absolute', left: 0, right: 0 },
});
