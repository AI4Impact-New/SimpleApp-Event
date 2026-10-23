import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius } from '@/theme/colors';
import { authService, StoredUserData } from '@/services/auth';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';

type UserType = 'student' | 'professional';

interface EditProfileScreenProps {
  onBack: () => void;
  onSaved: () => void;
}

export function EditProfileScreen({ onBack, onSaved }: EditProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  // Values as loaded from the server; leaving with different values asks before discarding them.
  const initialRef = useRef('');
  const savedRef = useRef(false);

  const [name, setName] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [designation, setDesignation] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const profile = await api.getMyProfile();
        if (!mounted) return;
        const values = {
          name: profile.name ?? '',
          userType: (profile.user_type ?? null) as UserType | null,
          university: profile.university ?? '',
          course: profile.course ?? '',
          yearOfStudy: profile.year_of_study ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          designation: profile.designation ?? '',
          company: profile.company ?? '',
        };
        setName(values.name);
        setUserType(values.userType);
        setUniversity(values.university);
        setCourse(values.course);
        setYearOfStudy(values.yearOfStudy);
        setCity(values.city);
        setState(values.state);
        setDesignation(values.designation);
        setCompany(values.company);
        initialRef.current = JSON.stringify(values);
      } catch (err) {
        // Don't edit from a cached copy: saving it could overwrite newer server values.
        if (mounted) setLoadError(apiErrorMessage(err, 'Could not load your profile.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const current = JSON.stringify({ name, userType, university, course, yearOfStudy, city, state, designation, company });
  const dirty = !loading && !loadError && initialRef.current !== '' && current !== initialRef.current;

  // Native stack gestures and confirmed redispatch are handled by the hook.
  usePreventRemove(dirty && !savedRef.current, ({ data }) => {
    if (savedRef.current) { navigation.dispatch(data.action); return; }
    Alert.alert('Discard changes?', 'Your profile changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const handleSave = async () => {
    if (!userType) {
      setError('Please select Student or Working professional');
      return;
    }

    if (userType === 'student') {
      if (!university.trim() || !course.trim() || !yearOfStudy.trim() || !city.trim() || !state.trim()) {
        setError('Please complete all student profile fields');
        return;
      }
    }

    if (userType === 'professional') {
      if (!designation.trim() || !company.trim()) {
        setError('Please complete designation and company');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const payload: Parameters<typeof api.updateMyProfile>[0] = {
        name: name.trim() || undefined,
        user_type: userType,
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

      const updated = await api.updateMyProfile(payload);
      const nextUser: Partial<StoredUserData> = {
        email: updated?.email,
        name: updated?.name,
        user_type: updated?.user_type,
        university: updated?.university,
        course: updated?.course,
        year_of_study: updated?.year_of_study,
        city: updated?.city,
        state: updated?.state,
        designation: updated?.designation,
        company: updated?.company,
      };
      await authService.updateStoredUserData(nextUser);
      savedRef.current = true;
      onSaved();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message
          || (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(message || (err instanceof Error ? err.message : 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.inputLabel, { textAlign: 'center', marginTop: spacing.md }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.saveButton, { marginTop: spacing.lg, paddingHorizontal: spacing.xl }]} onPress={() => setReloadKey((k) => k + 1)}>
            <Text style={styles.saveButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Edit Profile</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
              />
            </View>

            <Text style={styles.inputLabel}>I am a</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionButton, userType === 'student' && styles.optionButtonActive]}
                onPress={() => setUserType('student')}
                disabled={saving}
              >
                <Text style={[styles.optionText, userType === 'student' && styles.optionTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, userType === 'professional' && styles.optionButtonActive]}
                onPress={() => setUserType('professional')}
                disabled={saving}
              >
                <Text style={[styles.optionText, userType === 'professional' && styles.optionTextActive]}>Working Professional</Text>
              </TouchableOpacity>
            </View>

            {userType === 'student' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>University</Text>
                  <TextInput value={university} onChangeText={setUniversity} style={styles.input} placeholder="Your university" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Course</Text>
                  <TextInput value={course} onChangeText={setCourse} style={styles.input} placeholder="Course" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Year of Study</Text>
                  <TextInput value={yearOfStudy} onChangeText={setYearOfStudy} style={styles.input} placeholder="Year of study" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput value={state} onChangeText={setState} style={styles.input} placeholder="State" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
              </>
            ) : null}

            {userType === 'professional' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Designation</Text>
                  <TextInput value={designation} onChangeText={setDesignation} style={styles.input} placeholder="Designation" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company</Text>
                  <TextInput value={company} onChangeText={setCompany} style={styles.input} placeholder="Company" placeholderTextColor={colors.textMuted} editable={!saving} />
                </View>
              </>
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '500',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.white,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
