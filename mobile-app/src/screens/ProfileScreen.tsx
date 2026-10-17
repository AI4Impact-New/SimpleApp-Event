// Profile Screen – user info and sign out
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { authService, StoredUserData } from '@/services/auth';
import { api } from '@/services/api';
import { isPushOptedOut, setPushOptOut } from '@/services/push';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onPrivacyPolicy?: () => void;
}

export function ProfileScreen({ onBack, onLogout, onEditProfile, onPrivacyPolicy }: ProfileScreenProps) {
  const [user, setUser] = useState<StoredUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    isPushOptedOut().then((optedOut) => setPushEnabled(!optedOut));
  }, []);

  const togglePush = async (enabled: boolean) => {
    setPushBusy(true);
    setPushEnabled(enabled);
    const result = await setPushOptOut(!enabled);
    setPushBusy(false);
    if (enabled && !result.ok) {
      const messages: Record<string, string> = {
        not_device: 'Push notifications need a physical device.',
        no_project: 'Push notifications are not configured in this build yet.',
        permission_denied: 'Allow notifications for this app in your device settings.',
        not_configured: 'Push notifications are not enabled on the server yet. Your in-app inbox still works.',
      };
      Alert.alert('Notifications', messages[result.reason] ?? result.message ?? 'Could not enable notifications.');
    }
  };

  const loadProfile = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const profile = await api.getMyProfile();
      const nextUser: StoredUserData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        user_type: profile.user_type,
        university: profile.university,
        course: profile.course,
        year_of_study: profile.year_of_study,
        city: profile.city,
        state: profile.state,
        designation: profile.designation,
        company: profile.company,
      };
      await authService.updateStoredUserData(nextUser);
      setUser(nextUser);
    } catch (_) {
      const res = await authService.getCurrentUser();
      setUser(res.success ? res.user : null);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.name ?? ([user?.given_name, user?.family_name].filter(Boolean).join(' ').trim() || '—');
  const profileType = user?.user_type === 'professional' ? 'Working Professional' : user?.user_type === 'student' ? 'Student' : 'Not completed';
  const primaryDetail = user?.user_type === 'professional'
    ? user?.designation || user?.company || '—'
    : user?.user_type === 'student'
      ? user?.university || user?.course || '—'
      : '—';
  const secondaryDetail = user?.user_type === 'professional'
    ? user?.company || '—'
    : user?.user_type === 'student'
      ? [user?.city, user?.state].filter(Boolean).join(', ') || '—'
      : '—';
  const profileBadgeStyle = user?.user_type === 'professional'
    ? styles.badgeProfessional
    : user?.user_type === 'student'
      ? styles.badgeStudent
      : styles.badgeUnspecified;
  const profileBadgeTextStyle = user?.user_type === 'professional'
    ? styles.badgeProfessionalText
    : user?.user_type === 'student'
      ? styles.badgeStudentText
      : styles.badgeUnspecifiedText;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
          <Text style={styles.heroEmail} numberOfLines={1}>{user?.email ?? '—'}</Text>
          <View style={[styles.profileBadge, profileBadgeStyle]}>
            <Text style={[styles.profileBadgeText, profileBadgeTextStyle]}>{profileType}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditProfile}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="school-outline" size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.label}>Primary Detail</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{primaryDetail}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="location-outline" size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.label}>{user?.user_type === 'professional' ? 'Company' : 'Location'}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{secondaryDetail}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value} numberOfLines={2}>{displayName}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value} numberOfLines={1}>{user?.email ?? '—'}</Text>
            </View>
          </View>
        </View>

        {Platform.OS !== 'web' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>Push notifications</Text>
              <Text style={styles.label}>Course announcements and certificate updates</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={togglePush} disabled={pushBusy} />
          </View>
        </View>
        )}

        {onPrivacyPolicy && (
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 8 }]}
            onPress={onPrivacyPolicy}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.editButtonText}>Privacy Policy</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.xxl * 2,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: -28,
    right: -18,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: `${colors.primary}14`,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: `${colors.primary}16`,
    borderWidth: 6,
    borderColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroEmail: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  profileBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeStudent: {
    backgroundColor: '#fef3c7',
  },
  badgeStudentText: {
    color: '#b45309',
  },
  badgeProfessional: {
    backgroundColor: '#dbeafe',
  },
  badgeProfessionalText: {
    color: '#1d4ed8',
  },
  badgeUnspecified: {
    backgroundColor: '#e5e7eb',
  },
  badgeUnspecifiedText: {
    color: '#4b5563',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  detailCopy: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  detailValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
    textAlign: 'right',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    borderRadius: 20,
    marginTop: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
  },
});
