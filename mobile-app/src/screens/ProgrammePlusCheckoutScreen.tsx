// Programme+ registration checkout. UI only: there is no Programme+ product in billing yet,
// so the pay button stays disabled until the backend can create a Programme+ order.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from '@/components/SafeAreaView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LearnerIdCard } from '@/components/LearnerIdCard';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useMyLearning } from '@/hooks/useLearning';
import { colors, fonts, palette } from '@/theme/colors';
import { PROGRAMME_PLUS_MODULES, openProgrammePlusSite } from '@/screens/ProgrammePlusScreen';

export const PROGRAMME_PLUS_PRICE = '₹24,999';

export function ProgrammePlusCheckoutScreen({ onBack }: { onBack: () => void }) {
  const profile = useMyProfile();
  const learning = useMyLearning();
  const [agreed, setAgreed] = useState(false);
  const course = (learning.data ?? []).find((c) => c.registration_status !== 'completed') ?? learning.data?.[0];
  const web = Platform.OS === 'web';

  const content = (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Register for Programme+" onBack={onBack} />

      <View style={styles.card}>
        <Text style={styles.label}>Learner</Text>
        <LearnerIdCard name={profile.data?.name} courseTitle={course?.title} />
        {profile.data?.email ? <Text style={styles.muted}>Receipts and updates go to {profile.data.email}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.spread}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Programme+</Text>
            <Text style={styles.muted}>Optional career layer · add-on to your course</Text>
          </View>
          <Text style={styles.price}>{PROGRAMME_PLUS_PRICE}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.label}>What's included</Text>
        <View style={styles.list}>
          {PROGRAMME_PLUS_MODULES.map((m) => (
            <View key={m.title} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.teal600} />
              <Text style={styles.listText}>{m.title}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={openProgrammePlusSite} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkText}>Full details on ai4impact.in</Text>
          <Ionicons name="open-outline" size={14} color={palette.teal700} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.spread}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{PROGRAMME_PLUS_PRICE}</Text>
        </View>
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          style={styles.checkRow}
        >
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={20} color={agreed ? palette.teal600 : palette.slate400} />
          <Text style={styles.checkText}>I understand Programme+ is an optional add-on and agree to the programme terms.</Text>
        </Pressable>
        <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.payBtn}>
          <Ionicons name="lock-closed-outline" size={16} color={palette.slate500} />
          <Text style={styles.payText}>Pay {PROGRAMME_PLUS_PRICE} · Coming soon</Text>
        </Pressable>
        <Text style={styles.note}>Online payment for Programme+ isn't open yet. We'll notify you when registration opens.</Text>
      </View>
    </ScrollView>
  );

  return web ? content : <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

const web = Platform.OS === 'web';
const display = web ? { fontFamily: fonts.display } : {};
const text = web ? { fontFamily: fonts.body } : {};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 72, gap: 16 },
  card: { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: palette.slate200, borderRadius: 16, padding: 20, gap: 12 },
  label: { fontFamily: web ? fonts.mono : undefined, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: palette.slate500 },
  muted: { ...text, fontSize: 13, color: palette.slate500 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planTitle: { ...display, fontSize: 20, fontWeight: '700', color: palette.navy850 },
  price: { ...display, fontSize: 20, fontWeight: '700', color: palette.navy850 },
  divider: { height: 1, backgroundColor: palette.slate150 },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listText: { ...text, fontSize: 14, color: palette.navy850 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  linkText: { ...text, fontSize: 13, fontWeight: '500', color: palette.teal700 },
  totalLabel: { ...text, fontSize: 15, fontWeight: '600', color: palette.navy850 },
  total: { ...display, fontSize: 26, fontWeight: '700', color: palette.navy850 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { ...text, flex: 1, fontSize: 13, lineHeight: 19, color: palette.slate600 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: palette.slate150,
  },
  payText: { ...text, fontSize: 15, fontWeight: '600', color: palette.slate500 },
  note: { ...text, fontSize: 12, lineHeight: 18, color: palette.slate500, textAlign: 'center' },
});
