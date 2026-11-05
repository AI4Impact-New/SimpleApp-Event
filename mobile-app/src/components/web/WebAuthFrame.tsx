// Signed-out pages on web: a split layout like the landing-page login (navy brand panel + form column).
// Narrow browsers and native get the screen on its own, centered in a phone-width column on web.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PiLogo } from '@/components/PiLogo';
import { useWebLayout } from '@/hooks/useWebLayout';
import { colors, fonts, palette, spacing } from '@/theme/colors';

// Same copy as LOGIN_FEATURES in landing-page/src/content/site.ts.
const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'play-circle-outline', title: 'Recorded sessions', body: 'Pick up every module where you left off.' },
  { icon: 'calendar-outline', title: 'Weekly clarification calls', body: 'Join live calls and see the recordings.' },
  { icon: 'git-branch-outline', title: 'Projects & capstone', body: 'Submit work and read your mentor’s feedback.' },
  { icon: 'shield-checkmark-outline', title: 'Certificates', body: 'Download and share verifiable credentials.' },
];

// The landing hero glow (--bg-hero-gradient); React Native styles have no gradient, so set it on the DOM node.
const HERO_GRADIENT =
  'radial-gradient(60% 50% at 75% 35%, rgba(20,166,140,.22), transparent 70%), radial-gradient(40% 40% at 10% 85%, rgba(60,50,40,.35), transparent 70%)';

export function WebAuthFrame({ children }: { children: React.ReactNode }) {
  const { isWeb, wide } = useWebLayout();
  const panelRef = useRef<View>(null);

  useEffect(() => {
    const node = panelRef.current as unknown as HTMLElement | null;
    if (node?.style) node.style.backgroundImage = HERO_GRADIENT;
  }, [wide]);

  if (!isWeb) return <>{children}</>;

  if (!wide) {
    return (
      <View style={styles.narrowPage}>
        <View style={styles.narrowColumn}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View ref={panelRef} style={styles.panel}>
        <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <PiLogo size={32} variant="dark" />
            <Text style={styles.wordmark}>
              AI4<Text style={styles.wordmarkAccent}>Impact</Text>
            </Text>
          </View>

          <View style={styles.pitch}>
            <Text style={styles.eyebrow}>LEARNER PORTAL</Text>
            <Text style={styles.heading} accessibilityRole="header">
              Welcome back. Your next milestone is waiting.
            </Text>
            <Text style={styles.lead}>
              Enrolled students sign in here for course content, live calls, project reviews and career support.
            </Text>
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon} size={18} color={palette.amber500} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.footnote}>© {new Date().getFullYear()} AI4Impact · Powered by PiResearch Labs</Text>
        </ScrollView>
      </View>

      <View style={styles.formSide}>
        <View style={styles.formColumn}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  narrowPage: {
    flex: 1,
    backgroundColor: colors.background,
  },
  narrowColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  panel: {
    flex: 1.1,
    backgroundColor: palette.navy900,
  },
  panelContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 64,
    paddingVertical: 40,
    gap: 48,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: palette.textOnDark,
  },
  wordmarkAccent: {
    color: palette.teal400,
  },
  pitch: {
    maxWidth: 560,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2.6,
    color: palette.amber500,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1,
    color: palette.textOnDark,
    marginTop: spacing.xl,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 27,
    color: palette.textOnDarkBody,
    marginTop: spacing.lg,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 40,
    rowGap: spacing.xxl,
  },
  feature: {
    width: '50%',
    flexDirection: 'row',
    gap: spacing.lg,
    paddingRight: spacing.xxl,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.navy750,
    borderWidth: 1,
    borderColor: palette.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '500',
    color: palette.textOnDark,
  },
  featureBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: palette.textOnDarkBody,
    marginTop: 2,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#7e8797',
  },
  formSide: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  formColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});
