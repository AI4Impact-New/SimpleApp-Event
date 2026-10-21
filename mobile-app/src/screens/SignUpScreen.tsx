// Sign Up: email, password, required name → Cognito signUp → confirm code screen
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
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { PiLogo } from '@/components/PiLogo';

const PASSWORD_HINT = '8+ characters, upper & lower case, number, symbol';

interface SignUpScreenProps {
  onSuccess: (email: string, password: string, name?: string) => void;
  onSignIn: () => void;
}

function validatePassword(p: string): boolean {
  if (p.length < 8) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}

export function SignUpScreen({ onSuccess, onSignIn }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGiven = givenName.trim();
    const trimmedFamily = familyName.trim();
    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (!validatePassword(password)) {
      setError(PASSWORD_HINT);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!trimmedGiven) {
      setError('Please enter your first name');
      return;
    }
    if (!trimmedFamily) {
      setError('Please enter your last name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { authService } = await import('@/services/auth');
      const result = await authService.signUp(trimmedEmail, password, {
        givenName: trimmedGiven,
        familyName: trimmedFamily,
      });

      if (result.success) {
        const fullName = [trimmedGiven, trimmedFamily].filter(Boolean).join(' ').trim() || undefined;
        onSuccess(trimmedEmail, password, fullName);
      } else {
        setError(result.error ?? 'Sign up failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <PiLogo size={56} />
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>AI4Impact – Student</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
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
                editable={!loading}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={PASSWORD_HINT}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={givenName}
                onChangeText={setGivenName}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Create account</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={onSignIn} disabled={loading}>
              <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
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
  scrollContent: { flexGrow: 1, padding: spacing.xxl, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  errorBox: { backgroundColor: colors.errorBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
  form: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
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
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 24 },
});
