import { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { useNav } from '../navigation/nav';
import { onHero, useTheme } from '../theme';
import { SpinningStar, StarField } from './Decor';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  subtitle?: string;
  arabic?: string;
  /** Show a back button (for pushed screens). */
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
  /** Float the header over a list and hide the title while scrolling down. */
  collapsible?: CollapsibleHeader;
};

/** Green gradient page header with stars and a rotating geometric watermark. */
export function ScreenHeader({
  title,
  subtitle,
  arabic,
  back,
  right,
  children,
  collapsible,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { fs, isTablet } = useResponsive();
  const hasBar = back || !!right;

  return (
    <Animated.View
      onLayout={collapsible?.onLayout}
      style={[
        styles.hero,
        {
          backgroundImage: theme.hero,
          paddingTop: insets.top + 10,
          paddingHorizontal: isTablet ? 0 : 20,
        },
        collapsible && [
          styles.floating,
          { transform: [{ translateY: collapsible.translateY }] },
        ],
      ]}
    >
      <StarField count={14} height={200} seed={title.length * 13} />
      <SpinningStar
        size={190}
        color="rgba(241,207,116,0.18)"
        style={styles.watermark}
      />
      <View style={[contentColumn, isTablet && styles.tabletInset]}>
        {hasBar ? (
          <Animated.View
            style={[
              styles.bar,
              collapsible && {
                // Counter-translate so the bar (and back button) stays pinned.
                transform: [
                  { translateY: Animated.multiply(collapsible.translateY, -1) },
                ],
                zIndex: 2,
              },
            ]}
          >
            {back ? (
              <PressableScale
                onPress={nav.pop}
                style={headerStyles.iconButton}
                accessibilityLabel="Go back"
                hitSlop={8}
              >
                <Text style={styles.backIcon}>‹</Text>
              </PressableScale>
            ) : null}
            <View style={styles.flex} />
            {right}
          </Animated.View>
        ) : null}
        <Animated.View
          onLayout={collapsible?.onCollapseLayout}
          style={[
            { paddingTop: hasBar ? 10 : 0 },
            collapsible && { opacity: collapsible.titleOpacity },
          ]}
        >
          {arabic ? (
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.arabic, { fontSize: fs(22) }]}
            >
              {arabic}
            </Text>
          ) : null}
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.title, { fontSize: fs(28) }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              maxFontSizeMultiplier={1.4}
              numberOfLines={2}
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
        {children}
      </View>
    </Animated.View>
  );
}

export const headerStyles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  iconText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  tabletInset: { paddingHorizontal: 16 },
  floating: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  watermark: { right: -50, top: -30 },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
    fontWeight: '300',
  },
  flex: { flex: 1 },
  arabic: { color: onHero.gold, marginBottom: 2, textAlign: 'left' },
  title: { color: onHero.text, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { color: onHero.soft, fontSize: 14, marginTop: 4 },
});
