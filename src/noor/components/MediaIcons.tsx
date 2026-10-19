import { StyleSheet, View } from 'react-native';

/** Crisp media-control icons drawn with views (no icon font or images). */

export function PlayIcon({
  size = 16,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <View
      style={[
        styles.triangle,
        {
          borderLeftWidth: size * 0.9,
          borderTopWidth: size / 2,
          borderBottomWidth: size / 2,
          borderLeftColor: color,
          marginLeft: size * 0.18,
        },
      ]}
    />
  );
}

export function PauseIcon({
  size = 16,
  color,
}: {
  size?: number;
  color: string;
}) {
  const bar = {
    width: size * 0.3,
    height: size,
    backgroundColor: color,
    borderRadius: 2,
  };
  return (
    <View style={[styles.row, { gap: size * 0.25 }]}>
      <View style={bar} />
      <View style={bar} />
    </View>
  );
}

export function SkipIcon({
  size = 14,
  color,
  direction,
}: {
  size?: number;
  color: string;
  direction: 'next' | 'prev';
}) {
  const triangle = (
    <View
      style={[
        styles.triangle,
        {
          borderTopWidth: size / 2,
          borderBottomWidth: size / 2,
          ...(direction === 'next'
            ? { borderLeftWidth: size * 0.8, borderLeftColor: color }
            : { borderRightWidth: size * 0.8, borderRightColor: color }),
        },
      ]}
    />
  );
  const bar = (
    <View
      style={{
        width: 2.5,
        height: size,
        backgroundColor: color,
        borderRadius: 1,
      }}
    />
  );
  return (
    <View style={styles.row}>
      {direction === 'next' ? triangle : bar}
      {direction === 'next' ? bar : triangle}
    </View>
  );
}

const styles = StyleSheet.create({
  triangle: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
