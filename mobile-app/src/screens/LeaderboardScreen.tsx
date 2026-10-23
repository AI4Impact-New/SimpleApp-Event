// Leaderboard Screen
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
import { useEventAnalytics } from '@/hooks/useEvents';
import { colors, spacing } from '@/theme/colors';

interface LeaderboardScreenProps {
  eventId: string;
  onBack: () => void;
}

export function LeaderboardScreen({ eventId, onBack }: LeaderboardScreenProps) {
  const { data: analytics, isLoading, error, refetch, isRefetching } = useEventAnalytics(eventId);

  const topStudents = analytics?.top_students || [];

  const renderStudent = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    const getRankStyle = (r: number) => {
      switch (r) {
        case 1: return { backgroundColor: '#fef3c7', color: '#b45309' };
        case 2: return { backgroundColor: '#f3f4f6', color: '#6b7280' };
        case 3: return { backgroundColor: '#e0e7ff', color: '#4338ca' };
        default: return { backgroundColor: '#f9fafb', color: '#6b7280' };
      }
    };
    const rankStyle = getRankStyle(rank);

    return (
      <View style={styles.studentRow}>
        <View style={[styles.rankBadge, { backgroundColor: rankStyle.backgroundColor }]}>
          <Text style={[styles.rankText, { color: rankStyle.color }]}>{rank}</Text>
        </View>
        
        <View style={styles.studentInfo}>
          <Text style={styles.studentId}>
            {(item?.display_name ?? item?.name ?? '').trim()
              ? (item.display_name ?? item.name).trim()
              : item?.user_id
                ? `${item.user_id.slice(0, 8)}...${item.user_id.slice(-4)}`
                : '—'}
          </Text>
          <Text style={styles.studentActions}>
            {item?.total_actions ?? 0} actions
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{item?.score ?? 0}</Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>
          Top engaged students
        </Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics?.attendance_count || 0}</Text>
          <Text style={styles.statLabel}>Attendees</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics?.average_engagement_score || 0}%</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{topStudents.length}</Text>
          <Text style={styles.statLabel}>Ranked</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load leaderboard</Text>
        </View>
      ) : (
        <FlatList
          data={topStudents}
          renderItem={renderStudent}
          keyExtractor={(item, index) => item?.user_id ?? `student-${index}`}
          contentContainerStyle={styles.list}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>
                Engagement data will appear after students start participating
              </Text>
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
    padding: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentId: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  studentActions: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
