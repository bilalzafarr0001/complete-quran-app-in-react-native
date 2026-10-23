import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { Star8 } from '../components/Star8';
import { getSurah, Surah, SURAHS } from '../data/surahs';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { contentColumn } from '../hooks/useResponsive';
import { useNav } from '../navigation/nav';
import { downloadedSurahs, FullAyah, getCachedSurah } from '../services/quran';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

type View_ = 'surahs' | 'bookmarks';

function SurahRow({
  surah,
  index,
  offline,
}: {
  surah: Surah;
  index: number;
  offline: boolean;
}) {
  const theme = useTheme();
  const nav = useNav();

  return (
    // Only the first screenful animates in; rows mounted while scrolling appear instantly.
    <FadeIn animate={index < 12} delay={index * 35} distance={12}>
      <PressableScale
        style={[
          styles.row,
          { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
        ]}
        onPress={() => nav.push({ name: 'surah', surah: surah.number })}
        scaleTo={0.98}
      >
        <Star8 size={44} color={theme.gold} outline fill={theme.goldSoft}>
          <Text style={[styles.num, { color: theme.text }]}>
            {surah.number}
          </Text>
        </Star8>
        <View style={styles.rowText}>
          <View style={styles.nameLine}>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: theme.text }]}
            >
              {surah.name}
            </Text>
            {offline ? (
              <View
                style={[styles.badge, { backgroundColor: theme.primarySoft }]}
              >
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  OFFLINE
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={2} style={[styles.meta, { color: theme.muted }]}>
            {surah.meaning} · {surah.revelation} · {surah.ayahs} ayat
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.arabic, { color: theme.arabic }]}
        >
          {surah.arabic}
        </Text>
      </PressableScale>
    </FadeIn>
  );
}

/** Ayah text for a bookmark, read from the offline cache. */
function BookmarkPreview({ surah, ayah }: { surah: number; ayah: number }) {
  const theme = useTheme();
  const [text, setText] = useState<FullAyah | null>(null);
  useEffect(() => {
    let alive = true;
    getCachedSurah(surah).then(
      list => alive && setText(list?.[ayah - 1] ?? null),
    );
    return () => {
      alive = false;
    };
  }, [surah, ayah]);
  if (!text) return null;
  return (
    <>
      <Text
        style={[styles.bookmarkArabic, { color: theme.arabic }]}
        numberOfLines={2}
      >
        {text.ar}
      </Text>
      {text.en ? (
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={2}>
          {text.en}
        </Text>
      ) : null}
    </>
  );
}

export function QuranScreen() {
  const theme = useTheme();
  const nav = useNav();
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View_>('surahs');
  const { header, headerHeight, onScroll } = useCollapsibleHeader();
  const listProps = {
    onScroll,
    scrollEventThrottle: 16,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    // Hidden for the first frame until the floating header has been measured.
    style: { opacity: headerHeight ? 1 : 0 },
    contentContainerStyle: [
      styles.list,
      contentColumn,
      { paddingTop: headerHeight + 14 },
    ],
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      s =>
        String(s.number) === q ||
        s.name
          .toLowerCase()
          .replace(/['-]/g, '')
          .includes(q.replace(/['-]/g, '')) ||
        s.meaning.toLowerCase().includes(q) ||
        s.arabic.includes(query.trim()),
    );
  }, [query]);

  const bookmarks = state.bookmarks.map(key => {
    const [surah, ayah] = key.split(':').map(Number);
    return { key, surah, ayah };
  });

  // Which surahs are saved on the device (shown with an OFFLINE badge).
  const [saved, setSaved] = useState<Set<number>>(new Set());
  useEffect(() => {
    downloadedSurahs().then(list => setSaved(new Set(list)));
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      {view === 'surahs' ? (
        <Animated.FlatList
          {...listProps}
          data={filtered}
          keyExtractor={s => String(s.number)}
          renderItem={({ item, index }) => (
            <SurahRow
              surah={item}
              index={index}
              offline={saved.has(item.number)}
            />
          )}
          initialNumToRender={12}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.muted }]}>
              No surah matches “{query}”.
            </Text>
          }
        />
      ) : (
        <Animated.FlatList
          {...listProps}
          data={bookmarks}
          keyExtractor={b => b.key}
          renderItem={({ item, index }) => (
            <FadeIn animate={index < 10} delay={index * 40}>
              <PressableScale
                style={[
                  styles.bookmark,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: theme.cardShadow,
                  },
                ]}
                onPress={() =>
                  nav.push({
                    name: 'surah',
                    surah: item.surah,
                    ayah: item.ayah,
                  })
                }
                scaleTo={0.98}
              >
                <View style={styles.bookmarkHead}>
                  <Text
                    style={[styles.bookmarkTitle, { color: theme.primary }]}
                  >
                    ★ {getSurah(item.surah).name} · Ayah {item.ayah}
                  </Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    Open ›
                  </Text>
                </View>
                <BookmarkPreview surah={item.surah} ayah={item.ayah} />
              </PressableScale>
            </FadeIn>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Star8 size={70} color={theme.gold} outline>
                <Text style={styles.emptyStar}>☆</Text>
              </Star8>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No bookmarks yet
              </Text>
              <Text style={[styles.empty, { color: theme.muted }]}>
                Tap the star on any ayah while reading to save it here.
              </Text>
            </View>
          }
        />
      )}
      <ScreenHeader
        collapsible={header}
        title="Al-Quran al-Kareem"
        arabic="القرآن الكريم"
        subtitle="114 surahs · 6,236 ayat"
      >
        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search surah name or number"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <View style={styles.segment}>
          <Segmented
            onDark
            value={view}
            onChange={setView}
            options={[
              { value: 'surahs', label: 'Surahs' },
              {
                value: 'bookmarks',
                label: `Bookmarks (${state.bookmarks.length})`,
              },
            ]}
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
  segment: { marginTop: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  num: { fontSize: 13, fontWeight: '800' },
  rowText: { flex: 1, marginLeft: 12 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '800' },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  meta: { fontSize: 12.5, marginTop: 3 },
  arabic: { fontSize: 22, marginLeft: 8 },
  bookmark: { borderRadius: 20, padding: 16, marginBottom: 10 },
  bookmarkHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookmarkTitle: { fontSize: 14, fontWeight: '800' },
  bookmarkArabic: {
    fontSize: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 10,
    lineHeight: 40,
  },
  emptyBox: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyStar: { fontSize: 24, color: '#C4602F' },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 18 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
