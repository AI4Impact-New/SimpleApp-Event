// My Learning Screen – enrolled/completed courses with recorded lecture progress
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyLearning, useNotifications } from '@/hooks/useLearning';
import type { MyLearningCourse } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';

interface MyLearningScreenProps {
  onCoursePress: (courseId: string) => void;
  onCertificatesPress: () => void;
  onNotificationsPress: () => void;
  onPurchasesPress: () => void;
  onBrowseCourses: () => void;
}

export function MyLearningScreen({
  onCoursePress,
  onCertificatesPress,
  onNotificationsPress,
  onPurchasesPress,
  onBrowseCourses,
}: MyLearningScreenProps) {
  const { data: courses = [], isLoading, error, refetch, isRefetching } = useMyLearning();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read_at).length;

  const renderCourse = ({ item }: { item: MyLearningCourse }) => {
    const total = Number(item.total_recorded_lectures) || 0;
    const done = Number(item.completed_lectures) || 0;
    const pct = total > 0 ? Math.round((done * 100) / total) : 0;
    const completed = item.registration_status === 'completed';
    return (
      <TouchableOpacity style={styles.card} onPress={() => onCoursePress(item.id)} activeOpacity={0.65}>
        <View style={styles.cardTop}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="ribbon" size={14} color={colors.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : null}
        </View>
        {total > 0 ? (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.meta}>{done} of {total} recorded lectures completed</Text>
          </>
        ) : (
          <Text style={styles.meta}>No recorded lectures yet</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>My Learning</Text>
          <Text style={styles.subtitle}>Continue your enrolled courses</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onPurchasesPress} activeOpacity={0.7}>
          <Ionicons name="receipt-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onCertificatesPress} activeOpacity={0.7}>
          <Ionicons name="ribbon-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onNotificationsPress} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={26} color={colors.primary} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load your courses</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()} activeOpacity={0.75}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={courses.length === 0 ? styles.emptyList : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="school-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No enrolled courses</Text>
              <Text style={styles.emptyMessage}>Register for a course to start learning.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onBrowseCourses} activeOpacity={0.75}>
                <Text style={styles.primaryBtnText}>Browse courses</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  iconBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl + 2,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.successBg,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
