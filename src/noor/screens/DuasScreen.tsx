import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { Dua, DUA_CATEGORIES, DuaCategory, DUAS } from '../data/duas';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { contentColumn } from '../hooks/useResponsive';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

function DuaCard({
  dua,
  open,
  onToggle,
}: {
  dua: Dua;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const { state } = useStore();
  const size = state.arabicSize - 2;
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(turn, {
      toValue: open ? 1 : 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [open, turn]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.cardHead}>
          <View style={styles.flex}>
            <Text style={[styles.category, { color: theme.gold }]}>
              {dua.category.toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>
              {dua.title}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.chevron,
              {
                backgroundColor: open ? theme.primarySoft : theme.surfaceAlt,
                transform: [
                  {
                    rotate: turn.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.chevronText,
                { color: open ? theme.primary : theme.muted },
              ]}
            >
              ›
            </Text>
          </Animated.View>
        </View>
        <Text
          style={[
            styles.arabic,
            { color: theme.arabic, fontSize: size, lineHeight: size * 1.9 },
          ]}
          numberOfLines={open ? undefined : 1}
        >
          {dua.arabic}
        </Text>
      </Pressable>
      {open ? (
        <FadeIn distance={8}>
          <Text style={[styles.translit, { color: theme.primary }]}>
            {dua.transliteration}
          </Text>
          <Text style={[styles.translation, { color: theme.text }]}>
            {dua.translation}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.reference, { color: theme.muted }]}>
              {dua.reference}
            </Text>
            <PressableScale
              style={[styles.share, { backgroundColor: theme.primarySoft }]}
              onPress={() =>
                Share.share({
                  message: `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n— ${dua.reference}`,
                })
              }
            >
              <Text style={[styles.shareText, { color: theme.primary }]}>
                Share
              </Text>
            </PressableScale>
          </View>
        </FadeIn>
      ) : null}
    </View>
  );
}

export function DuasScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<DuaCategory | 'All'>('All');
  const [openId, setOpenId] = useState<string | null>(DUAS[0].id);
  const { header, headerHeight, onScroll } = useCollapsibleHeader();

  const list =
    category === 'All' ? DUAS : DUAS.filter(d => d.category === category);

  const animate = () =>
    LayoutAnimation.configureNext(
      LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'),
    );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ opacity: headerHeight ? 1 : 0 }}
        contentContainerStyle={[
          styles.list,
          contentColumn,
          { paddingTop: headerHeight + 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {list.map((dua, i) => (
          <FadeIn key={`${category}-${dua.id}`} delay={i * 50} animate={i < 10}>
            <DuaCard
              dua={dua}
              open={openId === dua.id}
              onToggle={() => {
                animate();
                setOpenId(id => (id === dua.id ? null : dua.id));
              }}
            />
          </FadeIn>
        ))}
      </Animated.ScrollView>
      <ScreenHeader
        back
        collapsible={header}
        title="Daily Duas"
        arabic="الأدعية"
        subtitle={`${DUAS.length} supplications, each with its source`}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chips}
        >
          {(['All', ...DUA_CATEGORIES] as const).map(c => {
            const active = c === category;
            return (
              <PressableScale
                key={c}
                onPress={() => {
                  animate();
                  setCategory(c);
                }}
                style={[
                  styles.chip,
                  active && {
                    backgroundImage: theme.gold3,
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {c}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </ScreenHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chipScroll: { marginTop: 16, marginHorizontal: -20 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#2A1E00' },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: { borderRadius: 22, padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  category: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '800', marginTop: 3 },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: { fontSize: 22, fontWeight: '600', marginTop: -2 },
  arabic: { textAlign: 'right', writingDirection: 'rtl', marginTop: 12 },
  translit: {
    fontSize: 14.5,
    fontStyle: 'italic',
    lineHeight: 21,
    marginTop: 10,
  },
  translation: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  reference: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  share: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  shareText: { fontSize: 13, fontWeight: '800' },
});
