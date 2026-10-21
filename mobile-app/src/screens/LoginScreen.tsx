// Login Screen
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { PiLogo } from '@/components/PiLogo';

interface LoginScreenProps {
  initialEmail?: string;
  notice?: string;
  onLoginSuccess: () => void;
  onCreateAccount?: () => void;
  onForgotPassword?: (email: string) => void;
  onNeedsConfirmation?: (email: string) => void;
}

export function LoginScreen({
  initialEmail,
  notice,
  onLoginSuccess,
  onCreateAccount,
  onForgotPassword,
  onNeedsConfirmation,
}: LoginScreenProps) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set after Cognito asks this account to replace its temporary password.
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNewPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { authService } = await import('@/services/auth');
      const result = await authService.completeNewPassword(email.trim(), newPassword);
      if (result.success) onLoginSuccess();
      else setError(result.error || 'Could not set the new password');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not set the new password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { authService } = await import('@/services/auth');
      const result = await authService.login(email, password);

      if (result.success) {
        onLoginSuccess();
      } else if (result.needsConfirmation && onNeedsConfirmation) {
        onNeedsConfirmation(email.trim());
      } else if (result.needsNewPassword) {
        setNeedsNewPassword(true);
        setError(result.error || '');
      } else if (result.needsPasswordReset && onForgotPassword) {
        onForgotPassword(email.trim());
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <PiLogo size={72} />
            <Text style={styles.title}>AI4Impact</Text>
            <Text style={styles.subtitle}>Student Login</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : notice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {needsNewPassword ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm new password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleNewPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.buttonText}>Set Password & Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {onForgotPassword ? (
              <TouchableOpacity style={styles.forgotButton} onPress={() => onForgotPassword(email.trim())} disabled={loading}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            ) : null}

            {onCreateAccount ? (
              <TouchableOpacity style={styles.linkButton} onPress={onCreateAccount} disabled={loading}>
                <Text style={styles.linkText}>Don't have an account? Create account</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.footer}>
            Powered by PiResearch Labs
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  noticeBox: {
    backgroundColor: colors.successBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    color: colors.success,
    fontSize: 14,
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    padding: spacing.xs,
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 32,
  },
});
