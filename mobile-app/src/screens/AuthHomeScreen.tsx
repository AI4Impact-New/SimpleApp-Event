// Auth entry: Sign In or Create account
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from '@/components/SafeAreaView';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { PiLogo } from '@/components/PiLogo';

interface AuthHomeScreenProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onVerifyCertificate?: () => void;
}

export function AuthHomeScreen({ onSignIn, onCreateAccount, onVerifyCertificate }: AuthHomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <PiLogo size={64} />
            <Text style={styles.title}>AI4Impact</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Student portal</Text>
            </View>
            <Text style={styles.tagline}>
              Sign in to continue your lessons, live sessions, projects and certificates.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={onSignIn}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to AI4Impact?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={onCreateAccount}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </Pressable>
        </View>

        {onVerifyCertificate ? (
          <Pressable
            style={({ pressed }) => [styles.verifyLink, pressed && styles.pressed]}
            onPress={onVerifyCertificate}
            accessibilityRole="link"
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.verifyLinkText}>Verify a certificate</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footer}>Powered by PiResearch Labs</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 28,
    paddingVertical: 36,
    shadowColor: colors.brandNavy,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.brandNavy,
    marginTop: spacing.lg,
  },
  badge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: '#fff4e0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#9a5b00',
  },
  tagline: {
    marginTop: spacing.lg,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 300,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandNavy,
    paddingVertical: 15,
    borderRadius: borderRadius.xl,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xxl,
    padding: spacing.sm,
  },
  verifyLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.lg,
  },
});
