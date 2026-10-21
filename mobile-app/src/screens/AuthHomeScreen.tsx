// Auth entry: Sign In or Create account
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
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
        <View style={styles.header}>
            <PiLogo size={72} />
            <Text style={styles.title}>AI4Impact</Text>
          <Text style={styles.subtitle}>Student</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onSignIn} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCreateAccount} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </TouchableOpacity>
        </View>

        {onVerifyCertificate ? (
          <TouchableOpacity onPress={onVerifyCertificate} activeOpacity={0.7}>
            <Text style={styles.verifyLink}>Verify a certificate</Text>
          </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  verifyLink: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 32,
  },
});
