import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/colors';

/** Sent to POST /users/me/privacy-consent; bump together with "Last updated" below. */
export const PRIVACY_POLICY_VERSION = '2026-03';

export const POLICY_TEXT = `
AI4Impact (Pi Research Labs) – Privacy Policy
Last updated: March 2026

1. Information we collect
• Account and profile: name, email, phone (optional), user type (student/professional), university or company, course, year of study, city, state, designation.
• Usage: events attended, materials downloaded, polls answered, courses viewed or registered for.
• Device/app data as needed to operate and improve the app.

2. How we use your information
• To provide courses, events, certifications, and learning materials.
• To communicate about courses, events, and support.
• For analytics, leaderboards, and gamification.
• To comply with law and protect our rights.

3. Sharing
• We may share with partner institutions and certification providers to deliver courses and certificates.
• We do not sell your personal information.

4. Security and retention
• We retain data while your account is active or as required by law.
• We use standard measures to protect your data.

5. Your rights
• Access, update, or delete your profile in the app.
• Contact us for data export or withdrawal of consent.

6. Contact
For privacy questions, contact Pi Research Labs via the contact details in the app or on our website.

By using AI4Impact, you agree to this Privacy Policy.
`;

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.body}>{POLICY_TEXT}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
});
