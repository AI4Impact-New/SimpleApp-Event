import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/services/api';
import { useMyAttendance } from '@/hooks/useEvents';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { Event } from '@/types/event';
import { formatCompactDateTimeInIst } from '@/utils/datetime';

interface LeaderboardHomeScreenProps {
  onOpenLeaderboard: (eventId: string) => void;
  onOpenEvents: () => void;
  onBack?: () => void;
}

export function LeaderboardHomeScreen({ onOpenLeaderboard, onOpenEvents, onBack }: LeaderboardHomeScreenProps) {
  const attendanceQuery = useMyAttendance();

  const eventsQuery = useQuery({
    queryKey: ['events', 'all-for-leaderboard'],
    queryFn: () => api.getEvents(),
  });

  const attendance = attendanceQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const eventById = new Map((events as Event[]).map((event) => [event.id, event]));

  const joinedEvents = attendance
    .map((record) => ({
      record,
      event: eventById.get(record.event_id),
    }))
    .filter((item) => item.event);

  const isLoading = attendanceQuery.isLoading || eventsQuery.isLoading;
  const hasError = attendanceQuery.isError || eventsQuery.isError;
  const isRefreshing = attendanceQuery.isRefetching || eventsQuery.isRefetching;
  const onRefresh = () => {
    attendanceQuery.refetch();
    eventsQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See rankings for events you have joined</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.helperText}>Loading joined events...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Unable to load leaderboard</Text>
          <Text style={styles.helperText}>Please try again in a moment.</Text>
        </View>
      ) : joinedEvents.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="podium-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No joined events yet</Text>
          <Text style={styles.helperText}>Join an event to unlock its leaderboard.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onOpenEvents} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>View Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={joinedEvents}
          keyExtractor={(item) => item.record.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onOpenLeaderboard(item.event!.id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.event!.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardMeta}>{formatCompactDateTimeInIst(item.event!.start_time)} IST</Text>
              {item.event!.location ? (
                <Text style={styles.cardSubtext} numberOfLines={1}>{item.event!.location}</Text>
              ) : null}
            </TouchableOpacity>
          )}
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
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: spacing.sm,
  },
  cardMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
