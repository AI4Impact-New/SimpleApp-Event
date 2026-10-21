import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchUserAttributes, sendUserAttributeVerificationCode, confirmUserAttribute } from 'aws-amplify/auth';
import { colors } from '@/theme/colors';

/** Invited users must verify their own email before Cognito password recovery. */
export function VerifyEmailNotice() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    fetchUserAttributes().then(attributes => {
      if (active) setVerified(attributes.email_verified === 'true');
    }).catch(() => { if (active) setError('Could not check email verification. Reopen your profile to retry.'); });
    return () => { active = false; };
  }, []);
  async function send() {
    setBusy(true); setError('');
    try {
      await sendUserAttributeVerificationCode({ userAttributeKey: 'email' });
      setSent(true); setNotice('Verification code sent. Check your email.');
    } catch {
      setError('Could not send the code. Wait a moment and try again.');
    } finally { setBusy(false); }
  }
  async function confirm() {
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the six-digit code from your email.'); return; }
    setBusy(true); setError('');
    try {
      await confirmUserAttribute({ userAttributeKey: 'email', confirmationCode: code.trim() });
      setVerified(true); setCode(''); setNotice('Email verified. Password recovery is now available.');
    } catch (cause: unknown) {
      const name = cause instanceof Error ? cause.name : '';
      setError(name === 'CodeMismatchException' ? 'Incorrect code. Check your email and try again.' : name === 'ExpiredCodeException' ? 'This code has expired. Request a new code.' : 'Could not verify your email. Please try again.');
    } finally { setBusy(false); }
  }
  if (verified === true && !notice) return null;
  if (verified === null && !error) return null;
  return <View style={styles.card}>
    <Text style={styles.title}>{verified ? 'Email verified' : 'Verify your email'}</Text>
    {!verified && <Text style={styles.body}>Confirm your email address so you can recover your account if you forget your password.</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!verified && sent && <>
      <TextInput accessibilityLabel="Email verification code" placeholder="Six-digit email code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={styles.input} editable={!busy} />
      <TouchableOpacity accessibilityRole="button" onPress={confirm} disabled={busy} style={styles.button}><Text style={styles.buttonText}>Verify email</Text></TouchableOpacity>
    </>}
    {!verified && <TouchableOpacity accessibilityRole="button" onPress={send} disabled={busy || verified === null} style={styles.button}><Text style={styles.buttonText}>{sent ? 'Resend verification code' : 'Send verification code'}</Text></TouchableOpacity>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16, gap: 10 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  error: { color: colors.error, fontSize: 14 },
  input: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 8, padding: 12, color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
