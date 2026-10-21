// Complete profile after email verification (signIn + PUT /users/me), or for a signed-in user whose profile is incomplete
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
  Modal,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { PiLogo } from '@/components/PiLogo';
import { Ionicons } from '@expo/vector-icons';
import { POLICY_TEXT, PRIVACY_POLICY_VERSION } from '@/screens/PrivacyPolicyScreen';

export type UserType = 'student' | 'professional';

interface CompleteProfileScreenProps {
  initialProfile?: import('@/services/api').MyProfile;
  email: string;
  /** Omitted when the user is already signed in (post-login profile check). */
  password?: string;
  name?: string; // from sign-up (given + family)
  onComplete: () => void;
  onSignOut?: () => void;
}

export function CompleteProfileScreen({ email, password, name, onComplete, onSignOut, initialProfile }: CompleteProfileScreenProps) {
  const [userType, setUserType] = useState<UserType | null>(initialProfile?.user_type ?? null);
  const [university, setUniversity] = useState(initialProfile?.university ?? '');
  const [course, setCourse] = useState(initialProfile?.course ?? '');
  const [yearOfStudy, setYearOfStudy] = useState(initialProfile?.year_of_study ?? '');
  const [city, setCity] = useState(initialProfile?.city ?? '');
  const [state, setState] = useState(initialProfile?.state ?? '');
  const [designation, setDesignation] = useState(initialProfile?.designation ?? '');
  const [company, setCompany] = useState(initialProfile?.company ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const handleSubmit = async () => {
    if (!userType) {
      setError('Please select Student or Working professional');
      return;
    }
    if (userType === 'student') {
      if (!university.trim()) {
        setError('Please enter your university');
        return;
      }
      if (!course.trim()) {
        setError('Please enter your course');
        return;
      }
      if (!yearOfStudy.trim()) {
        setError('Please enter year of study');
        return;
      }
      if (!city.trim()) {
        setError('Please enter city');
        return;
      }
      if (!state.trim()) {
        setError('Please enter state');
        return;
      }
    } else {
      if (!designation.trim()) {
        setError('Please enter your designation');
        return;
      }
      if (!company.trim()) {
        setError('Please enter your company');
        return;
      }
    }

    if (!consented) {
      setError('Please accept the Privacy Policy to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { authService } = await import('@/services/auth');
      const { api } = await import('@/services/api');

      if (password) {
        const loginResult = await authService.login(email, password);
        if (!loginResult.success) {
          setError(loginResult.error ?? 'Sign in failed. Please try again.');
          setLoading(false);
          return;
        }
      }

      const payload: Parameters<typeof api.updateMyProfile>[0] = {
        user_type: userType,
        name: name?.trim() || undefined,
      };
      if (userType === 'student') {
        payload.university = university.trim();
        payload.course = course.trim();
        payload.year_of_study = yearOfStudy.trim();
        payload.city = city.trim();
        payload.state = state.trim();
      } else {
        payload.designation = designation.trim();
        payload.company = company.trim();
      }

      await api.updateMyProfile(payload);
      await api.submitPrivacyConsent(PRIVACY_POLICY_VERSION);
      await authService.updateStoredUserData(payload);
      onComplete();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message
          || (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(msg || (err instanceof Error ? err.message : 'Failed to save profile'));
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
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>I am a</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionButton, userType === 'student' && styles.optionButtonActive]}
                onPress={() => setUserType('student')}
                activeOpacity={0.7}
              >
                <Ionicons name="school-outline" size={24} color={userType === 'student' ? colors.white : colors.text} />
                <Text style={[styles.optionText, userType === 'student' && styles.optionTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, userType === 'professional' && styles.optionButtonActive]}
                onPress={() => setUserType('professional')}
                activeOpacity={0.7}
              >
                <Ionicons name="briefcase-outline" size={24} color={userType === 'professional' ? colors.white : colors.text} />
                <Text style={[styles.optionText, userType === 'professional' && styles.optionTextActive]}>Working professional</Text>
              </TouchableOpacity>
            </View>
          </View>

          {userType === 'student' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>University *</Text>
                <TextInput
                  style={styles.input}
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="Your university"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course registered *</Text>
                <TextInput
                  style={styles.input}
                  value={course}
                  onChangeText={setCourse}
                  placeholder="e.g. B.Tech CSE"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Year of study *</Text>
                <TextInput
                  style={styles.input}
                  value={yearOfStudy}
                  onChangeText={setYearOfStudy}
                  placeholder="e.g. 2nd year"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
            </View>
          )}

          {userType === 'professional' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Designation *</Text>
                <TextInput
                  style={styles.input}
                  value={designation}
                  onChangeText={setDesignation}
                  placeholder="e.g. Software Engineer"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company *</Text>
                <TextInput
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Company name"
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
              </View>
            </View>
          )}

          {userType ? (
            <View style={styles.consentRow}>
              <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Accept Privacy Policy" accessibilityState={{ checked: consented }} aria-checked={consented} onPress={() => setConsented((v) => !v)} disabled={loading} hitSlop={8}>
                <Ionicons
                  name={consented ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={consented ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.consentText}>
                I agree to the{' '}
                <Text style={styles.consentLink} onPress={() => setPolicyOpen(true)}>
                  AI4Impact Privacy Policy
                </Text>
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {userType ? (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {onSignOut ? (
            <TouchableOpacity style={styles.signOutLink} onPress={onSignOut} disabled={loading}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.footer}>Powered by PiResearch Labs</Text>
        </ScrollView>
        <Modal visible={policyOpen} animationType="slide" onRequestClose={() => setPolicyOpen(false)}>
          <SafeAreaView style={styles.container}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>Privacy Policy</Text>
              <TouchableOpacity onPress={() => setPolicyOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.policyBody}>
              <Text style={styles.policyText}>{POLICY_TEXT.trim()}</Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  consentLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  policyBody: {
    padding: spacing.lg,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  signOutLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  signOutText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { padding: spacing.xxl, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  section: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
  },
  optionButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 6 },
  optionTextActive: { color: colors.white },
  form: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  errorBox: { backgroundColor: colors.errorBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  errorText: { color: colors.error, fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 32 },
});
