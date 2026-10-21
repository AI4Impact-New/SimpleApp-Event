// Notifications Screen – learner inbox (latest 100); tapping marks read and opens the related course
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
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMarkNotificationRead, useNotifications } from '@/hooks/useLearning';
import type { LearnerNotification } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDateTime } from '@/utils/datetime';

interface NotificationsScreenProps {
  onBack?: () => void;
  onOpenNotification: (notification: LearnerNotification) => void;
}

export function NotificationsScreen({ onBack, onOpenNotification }: NotificationsScreenProps) {
  const { data: notifications = [], isLoading, error, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();

  const handlePress = (item: LearnerNotification) => {
    if (!item.read_at) markRead.mutate(item.id);
    onOpenNotification(item);
  };

  const renderItem = ({ item }: { item: LearnerNotification }) => {
    const unread = !item.read_at;
    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.cardUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, !unread && styles.dotRead]} />
        <View style={styles.cardBody}>
          <Text style={[styles.title, unread && styles.titleUnread]}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{formatLocalDateTime(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Inbox" onBack={onBack} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load notifications</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.link}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
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
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: {
    borderColor: colors.primary + '66',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: colors.primary,
  },
  dotRead: {
    backgroundColor: 'transparent',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
