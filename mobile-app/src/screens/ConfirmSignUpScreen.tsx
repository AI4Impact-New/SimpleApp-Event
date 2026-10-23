// Confirm Sign Up: enter 6-digit code from email → confirmSignUp → go to Login
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { PiLogo } from '@/components/PiLogo';

interface ConfirmSignUpScreenProps {
  email: string;
  password?: string;
  name?: string;
  onSuccess: () => void;
  onResend: () => void;
  onBack?: () => void;
}

export function ConfirmSignUpScreen({ email, password, name, onSuccess, onResend, onBack }: ConfirmSignUpScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter the verification code from your email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { authService } = await import('@/services/auth');
      const result = await authService.confirmSignUp(email, trimmed);

      if (result.success) {
        setSuccessMessage('Account confirmed. Sign in with your password.');
        onSuccess();
      } else {
        setError(result.error ?? 'Verification failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');

    try {
      const { authService } = await import('@/services/auth');
      const result = await authService.resendSignUpCode(email);
      if (result.success) {
        setCode('');
        setSuccessMessage('A new code was sent to your email.');
      } else {
        setError(result.error ?? 'Could not resend code');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <PiLogo size={56} />
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
          </View>

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verify</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={handleResend} disabled={resendLoading || loading}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.linkText}>Resend code</Text>
              )}
            </TouchableOpacity>

            {onBack ? (
              <TouchableOpacity style={styles.linkButton} onPress={onBack} disabled={loading}>
                <Text style={styles.linkText}>Wrong email? Go back</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.footer}>Powered by PiResearch Labs</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xxl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  successBox: { backgroundColor: colors.successBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  successText: { color: colors.success, fontSize: 14, textAlign: 'center' },
  errorBox: { backgroundColor: colors.errorBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
  form: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 18,
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 32 },
});
