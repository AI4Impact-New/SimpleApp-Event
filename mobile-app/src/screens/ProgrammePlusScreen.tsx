// Programme+ tab: the optional career layer pitch, its modules, and the way into registration.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from '@/components/SafeAreaView';
import { useWebLayout } from '@/hooks/useWebLayout';
import { colors, fonts, layout, palette } from '@/theme/colors';

export const PROGRAMME_PLUS_URL = 'https://www.ai4impact.in/programme-plus/';

type PressState = { pressed: boolean; hovered?: boolean };

export const PROGRAMME_PLUS_MODULES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'school-outline', title: 'Real-World Internship', body: 'Opt in, clear two tests and a final interview to join a live 3-month project.' },
  { icon: 'document-text-outline', title: 'Interview Builder', body: 'Upload your CV and let our AI rebuild it around the roles you want.' },
  { icon: 'mic-outline', title: 'Mock Interviews', body: 'Book 3–5 sessions with our AI interviewer and get scored feedback.' },
  { icon: 'briefcase-outline', title: 'Recruitment Support', body: 'Apply to partner roles. Our screener forwards strong applications.' },
  { icon: 'chatbubbles-outline', title: 'Weekly Group Clarification', body: 'Opt in to live sessions your trainers schedule every week.' },
  { icon: 'person-outline', title: 'Personal Handholding', body: 'Five 1:1 30-minute sessions. Pick a trainer and a free slot.' },
];

export function openProgrammePlusSite() {
  void Linking.openURL(PROGRAMME_PLUS_URL);
}

export function ProgrammePlusScreen({ onRegister }: { onRegister: () => void }) {
  const { isWeb, wide, width } = useWebLayout();
  const main = Math.min(width, layout.container) - 48;
  const cols = !isWeb ? 1 : main >= 840 ? 3 : main >= 540 ? 2 : 1;
  const cardWidth = (cols === 1 ? '100%' : `calc((100% - ${(cols - 1) * 16}px) / ${cols})`) as any;

  const content = (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, wide && styles.contentWide]} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, !wide && styles.heroNarrow]}>
        <View style={styles.heroMain}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles-outline" size={16} color={palette.amber500} />
            <Text style={styles.eyebrow}>Optional career layer</Text>
          </View>
          <Text style={[styles.heroTitle, !wide && styles.heroTitleNarrow]} role="heading" aria-level={1}>
            Turn your capstone into interviews with Programme+
          </Text>
          <Text style={styles.heroBody}>
            Internship pathway, AI CV builder, AI mock interviews, recruiter support and trainer time. Opt in any time.
          </Text>
        </View>
        <View style={styles.heroActions}>
          <Pressable
            onPress={onRegister}
            accessibilityRole="button"
            style={(s: PressState) => [styles.btnAmber, (s.hovered || s.pressed) && styles.btnAmberHover]}
          >
            <Ionicons name="sparkles-outline" size={16} color={palette.amber950} />
            <Text style={styles.btnAmberText}>Opt in & register</Text>
          </Pressable>
          <Pressable
            onPress={openProgrammePlusSite}
            accessibilityRole="link"
            style={(s: PressState) => [styles.btnGhost, (s.hovered || s.pressed) && styles.btnGhostHover]}
          >
            <Text style={styles.btnGhostText}>Explore</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.h2} role="heading" aria-level={2}>
            Programme+ modules
          </Text>
          <Pressable onPress={openProgrammePlusSite} accessibilityRole="link" style={styles.textLink}>
            <Text style={styles.textLinkText}>View more</Text>
            <Ionicons name="open-outline" size={14} color={palette.slate600} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {PROGRAMME_PLUS_MODULES.map((m) => (
            <Pressable
              key={m.title}
              onPress={openProgrammePlusSite}
              accessibilityRole="link"
              accessibilityLabel={`${m.title}. ${m.body} View more on the website.`}
              style={(s: PressState) => [styles.module, { width: cardWidth }, (s.hovered || s.pressed) && styles.moduleHover]}
            >
              <View style={styles.moduleIcon}>
                <Ionicons name={m.icon} size={20} color={palette.navy850} />
              </View>
              <View style={styles.moduleText}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleBody}>{m.body}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={palette.slate500} />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return isWeb ? content : <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

const web = Platform.OS === 'web';
const display = web ? { fontFamily: fonts.display } : {};
const text = web ? { fontFamily: fonts.body } : {};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 72, gap: 40 },
  contentWide: { paddingBottom: 96, gap: 48 },

  hero: {
    backgroundColor: palette.navy800,
    borderRadius: 24,
    padding: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
  },
  heroNarrow: { padding: 24, gap: 24 },
  heroMain: { flexGrow: 1, flexShrink: 1, flexBasis: 320, maxWidth: 640, gap: 14 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontFamily: web ? fonts.mono : undefined, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: palette.amber500 },
  heroTitle: { ...display, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6, color: palette.textOnDark },
  heroTitleNarrow: { fontSize: 24, lineHeight: 30 },
  heroBody: { ...text, fontSize: 15, lineHeight: 22, color: palette.textOnDarkBody },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  btnAmber: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: palette.amber500 },
  btnAmberHover: { opacity: 0.9 },
  btnAmberText: { ...text, fontSize: 15, fontWeight: '600', color: palette.amber950 },
  btnGhost: { height: 44, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: '#3a4766', alignItems: 'center', justifyContent: 'center' },
  btnGhostHover: { backgroundColor: palette.navy700 },
  btnGhostText: { ...text, fontSize: 15, fontWeight: '500', color: palette.textOnDark },

  section: { gap: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44, color: palette.navy850 },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textLinkText: { ...text, fontSize: 13, fontWeight: '500', color: palette.slate600 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  module: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: palette.slate200,
    borderRadius: 16,
  },
  moduleHover: { borderColor: palette.slate300 },
  moduleIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: palette.slate100, alignItems: 'center', justifyContent: 'center' },
  moduleText: { flex: 1, minWidth: 0, gap: 4 },
  moduleTitle: { ...text, fontSize: 16, fontWeight: '600', color: palette.navy850 },
  moduleBody: { ...text, fontSize: 14, lineHeight: 20, color: palette.slate600 },
});
