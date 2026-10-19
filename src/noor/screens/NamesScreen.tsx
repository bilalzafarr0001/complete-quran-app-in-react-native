import { memo, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { ScreenHeader } from '../components/ScreenHeader';
import { Star8 } from '../components/Star8';
import { AllahName, NAMES_OF_ALLAH } from '../data/names';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { onHero, useTheme } from '../theme';

/** Card that flips (rotateY) between the Arabic name and its meaning. */
const FlipCard = memo(function FlipCardInner({
  item,
  index,
  columns,
}: {
  item: AllahName;
  index: number;
  columns: number;
}) {
  const theme = useTheme();
  const flip = useRef(new Animated.Value(0)).current;
  const flipped = useRef(false);

  const toggle = () => {
    flipped.current = !flipped.current;
    Animated.spring(flip, {
      toValue: flipped.current ? 180 : 0,
      friction: 8,
      tension: 18,
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flip.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });
  // The card lifts towards you mid-flip, then settles.
  const lift = flip.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [1, 1.08, 1],
  });

  return (
    <FadeIn
      animate={index < columns * 4}
      delay={index * 45}
      scaleFrom={0.92}
      style={[styles.cell, { width: `${100 / columns}%` }]}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${item.transliteration}, ${item.meaning}`}
        accessibilityHint="Flips the card"
      >
        <Animated.View style={{ transform: [{ scale: lift }] }}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                boxShadow: theme.cardShadow,
                opacity: frontOpacity,
                transform: [{ perspective: 800 }, { rotateY: frontRotate }],
              },
            ]}
          >
            <Star8
              size={30}
              color={theme.gold}
              outline
              fill={theme.goldSoft}
              style={styles.num}
            >
              <Text
                maxFontSizeMultiplier={1}
                style={[styles.numText, { color: theme.text }]}
              >
                {item.number}
              </Text>
            </Star8>
            <Text
              style={[styles.arabic, { color: theme.arabic }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.arabic}
            </Text>
            <Text
              style={[styles.translit, { color: theme.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.transliteration}
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.card,
              styles.back,
              {
                backgroundImage: theme.hero,
                boxShadow: theme.floatShadow,
                opacity: backOpacity,
                transform: [{ perspective: 800 }, { rotateY: backRotate }],
              },
            ]}
          >
            <Text
              style={styles.backTranslit}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.transliteration}
            </Text>
            <View style={styles.divider} />
            <Text
              style={styles.backMeaning}
              numberOfLines={4}
              adjustsFontSizeToFit
            >
              {item.meaning}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </FadeIn>
  );
});

export function NamesScreen() {
  const theme = useTheme();
  const { contentWidth } = useResponsive();
  const [query, setQuery] = useState('');
  const { header, headerHeight, onScroll } = useCollapsibleHeader();
  const columns = contentWidth >= 600 ? 3 : 2;

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAMES_OF_ALLAH;
    return NAMES_OF_ALLAH.filter(
      n =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        String(n.number) === q,
    );
  }, [query]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <Animated.FlatList
        key={columns}
        data={data}
        numColumns={columns}
        keyExtractor={n => String(n.number)}
        renderItem={({ item, index }) => (
          <FlipCard item={item} index={index} columns={columns} />
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ opacity: headerHeight ? 1 : 0 }}
        contentContainerStyle={[
          styles.list,
          contentColumn,
          { paddingTop: headerHeight + 8 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>
            No names match “{query}”.
          </Text>
        }
      />
      <ScreenHeader
        back
        collapsible={header}
        title="99 Names of Allah"
        arabic="الأسماء الحسنى"
        subtitle="Tap a card to reveal its meaning"
      >
        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search names or meanings"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>
      </ScreenHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  searchIcon: { color: onHero.soft, fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 12 },
  list: { paddingHorizontal: 10, paddingBottom: 30 },
  cell: { padding: 6 },
  card: {
    height: 168,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backfaceVisibility: 'hidden',
  },
  back: { ...StyleSheet.absoluteFill },
  num: { position: 'absolute', top: 10, left: 10 },
  numText: { fontSize: 10, fontWeight: '900' },
  arabic: { fontSize: 34, marginTop: 8 },
  translit: { fontSize: 14, fontWeight: '800', marginTop: 8 },
  backTranslit: { color: onHero.gold, fontSize: 18, fontWeight: '900' },
  divider: {
    width: 30,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(241,207,116,0.6)',
    marginVertical: 10,
  },
  backMeaning: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
  },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
