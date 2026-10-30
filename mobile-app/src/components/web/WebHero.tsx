// Navy page hero for top-level web pages, after the landing page's PageHero (eyebrow, title, lead, glow).
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWebLayout } from '@/hooks/useWebLayout';
import { fonts, palette, spacing } from '@/theme/colors';

// --bg-hero-gradient plus the faint blueprint grid; set on the DOM node because RN styles have no gradients.
const HERO_BACKGROUND = [
  'radial-gradient(60% 50% at 75% 35%, rgba(20,166,140,.22), transparent 70%)',
  'radial-gradient(40% 40% at 10% 85%, rgba(60,50,40,.35), transparent 70%)',
  'linear-gradient(rgba(120,160,200,.07) 1px, transparent 1px)',
  'linear-gradient(90deg, rgba(120,160,200,.07) 1px, transparent 1px)',
].join(', ');

interface WebHeroProps {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Rendered beside the copy on wide screens and below it on narrow ones. */
  aside?: React.ReactNode;
}

export function WebHero({ eyebrow, title, lead, aside }: WebHeroProps) {
  const { wide } = useWebLayout();
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.style) return;
    node.style.backgroundImage = HERO_BACKGROUND;
    node.style.backgroundSize = 'auto, auto, 64px 64px, 64px 64px';
  }, []);

  return (
    <View ref={ref} style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.copy, wide && styles.copyWide]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowRule} />
          <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        </View>
        <Text style={[styles.title, wide && styles.titleWide]} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {lead ? <Text style={styles.lead}>{lead}</Text> : null}
      </View>
      {aside ? <View style={[styles.aside, wide && styles.asideWide]}>{aside}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.navy900,
    borderRadius: 20,
    padding: spacing.xxl,
    gap: spacing.xxl,
    overflow: 'hidden',
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 44,
    gap: 48,
  },
  copy: {
    gap: spacing.lg,
  },
  copyWide: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrowRule: {
    width: 24,
    height: 1,
    backgroundColor: palette.teal400,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2.6,
    color: palette.teal400,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -1,
    color: palette.textOnDark,
  },
  titleWide: {
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 27,
    color: palette.textOnDarkBody,
    maxWidth: 560,
  },
  aside: {},
  asideWide: {
    width: 400,
  },
});
