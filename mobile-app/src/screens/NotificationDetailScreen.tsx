// Notification Detail Screen – full inbox message with a link to its course
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useNotifications } from '@/hooks/useLearning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDateTime } from '@/utils/datetime';

interface NotificationDetailScreenProps {
  notificationId: string;
  onBack: () => void;
  onOpenCourse: (courseId: string) => void;
}

export function NotificationDetailScreen({ notificationId, onBack, onOpenCourse }: NotificationDetailScreenProps) {
  // Read from the owned inbox list, never from navigation params: the server decides what this user can see.
  const { data: notifications, isLoading } = useNotifications();
  const item = notifications?.find((n) => n.id === notificationId);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Message" onBack={onBack} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.center}>
          <Ionicons name="mail-unread-outline" size={44} color={colors.textMuted} />
          <Text style={styles.muted}>This message is no longer available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.time}>{formatLocalDateTime(item.created_at)}</Text>
          <Text style={styles.body}>{item.body}</Text>
          {item.course_id ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onOpenCourse(item.course_id!)} activeOpacity={0.75}>
              <Ionicons name="school-outline" size={20} color={colors.white} />
              <Text style={styles.primaryBtnText}>Open course</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginTop: spacing.lg,
  },
  muted: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.xxl,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
