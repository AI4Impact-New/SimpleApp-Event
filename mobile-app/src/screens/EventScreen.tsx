// Event Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useEvent, useJoinEvent, useEventAnalytics, useMyAttendance } from '@/hooks/useEvents';
import { usePolls } from '@/hooks/usePolls';
import { useMaterials } from '@/hooks/useMaterials';
import { PollCard } from '@/components/PollCard';
import { MaterialItem } from '@/components/MaterialItem';
import { Poll } from '@/types/poll';
import { Material } from '@/types/material';
import { api } from '@/services/api';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatDateTimeInIst } from '@/utils/datetime';
import { shareTextFile } from '@/utils/sharePdf';

interface EventScreenProps {
  eventId: string;
  onBack: () => void;
  onPollPress?: (pollId: string) => void;
}

export function EventScreen({ eventId, onBack, onPollPress }: EventScreenProps) {
  const { data: event, isLoading: eventLoading, error: eventError, refetch: refetchEvent, isRefetching: eventRefetching } = useEvent(eventId);
  const { data: pollsData, isLoading: pollsLoading, refetch: refetchPolls, isRefetching: pollsRefetching } = usePolls(eventId);
  const { data: materialsData, isLoading: materialsLoading, refetch: refetchMaterials, isRefetching: materialsRefetching } = useMaterials(eventId);
  const joinEvent = useJoinEvent();
  const { data: analytics, refetch: refetchAnalytics, isRefetching: analyticsRefetching } = useEventAnalytics(eventId);
  const { data: attendance, isLoading: attendanceLoading, refetch: refetchAttendance, isRefetching: attendanceRefetching } = useMyAttendance();
  const isRefreshing = eventRefetching || pollsRefetching || materialsRefetching || analyticsRefetching || attendanceRefetching;
  const onRefresh = () => {
    refetchEvent();
    refetchPolls();
    refetchMaterials();
    refetchAnalytics();
    refetchAttendance();
  };
  // Local flag covers the moment after joining, before the attendance refetch lands.
  const [joinedLocally, setJoined] = useState(false);
  const joined = joinedLocally || !!attendance?.some((record) => record.event_id === eventId);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string | null>>({});
  const [submittedPollOptions, setSubmittedPollOptions] = useState<Record<string, string | null>>({});
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);

  const polls = Array.isArray(pollsData) ? pollsData : pollsData?.polls || [];
  const materials = Array.isArray(materialsData) ? materialsData : materialsData?.materials || [];
  const topStudents = analytics?.top_students ?? [];

  const handleJoin = async () => {
    try {
      await joinEvent.mutateAsync(eventId);
      setJoined(true);
      Alert.alert('Success', 'You have joined the event!');
    } catch (error: any) {
      const msg = (error.response?.data?.message ?? error.response?.data?.error ?? '').trim();
      if (msg.includes('already joined') || msg.includes('already checked into')) {
        setJoined(true);
      } else {
        Alert.alert('Error', msg || 'Failed to join event');
      }
    }
  };

  const handleAddToCalendar = async () => {
    setAddingToCalendar(true);
    try {
      const ics = await api.getEventCalendarIcs(eventId);
      // Share a real .ics file: calendar apps import files, not pasted text.
      await shareTextFile({
        text: ics,
        fileName: 'event.ics',
        mimeType: 'text/calendar',
        UTI: 'com.apple.ical.ics',
        dialogTitle: event?.name ?? 'Event',
      });
    } catch (e: any) {
      Alert.alert(
        'Calendar unavailable',
        e?.status === 404
          ? 'This event is no longer available.'
          : 'Could not load the calendar. Check your connection and try again.'
      );
    } finally {
      setAddingToCalendar(false);
    }
  };

  const handlePollOptionSelect = (poll: Poll, optionId: string) => {
    setSelectedPollOptions((current) => ({
      ...current,
      [poll.id]: optionId,
    }));
  };

  const handleVote = async (poll: Poll) => {
    const optionId = selectedPollOptions[poll.id];
    if (!optionId) {
      Alert.alert('Choose an answer', 'Select one option before submitting.');
      return;
    }

    setSubmittingPollId(poll.id);
    try {
      await api.castVote(poll.id, optionId);
      setSubmittedPollOptions((current) => ({
        ...current,
        [poll.id]: optionId,
      }));
      Alert.alert('Success', 'Your answer has been recorded.');
      if (onPollPress) {
        onPollPress(poll.id);
      }
    } catch (error: any) {
      const msg = (error?.response?.data?.message ?? error?.response?.data?.error ?? 'Failed to submit your answer.').trim();
      if (msg.toLowerCase().includes('already voted')) {
        setSubmittedPollOptions((current) => ({ ...current, [poll.id]: optionId }));
        if (onPollPress) onPollPress(poll.id);
        return;
      }
      Alert.alert('Error', msg);
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleDownload = async (material: Material) => {
    setDownloading(material.id);
    try {
      const result = await api.getDownloadUrl(material.id);
      if (result.download_url) {
        Linking.openURL(result.download_url);
      }
    } catch {
      Alert.alert('Error', 'Failed to download material');
    }
    setDownloading(null);
  };

  if (eventLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event && (eventError || !eventLoading)) {
    const isUnauthorized = (eventError as any)?.response?.status === 401;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.errorText}>
            {isUnauthorized ? 'You don’t have access to this event.' : 'Event not found.'}
          </Text>
          <TouchableOpacity onPress={onBack} style={styles.errorBackButton}>
            <Text style={styles.errorBackText}>Back to events</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{event.name}</Text>
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        {/* Event Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoText}>{formatDateTimeInIst(event.start_time)} IST</Text>
          </View>
          {event.location ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoText}>{event.event_type ?? '—'}</Text>
          </View>
        </View>

        {/* Join / Attending */}
        {attendanceLoading && !joined ? (
          <View style={styles.joinPlaceholder}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : !joined ? (
          <TouchableOpacity
            style={[styles.joinButton, joinEvent.isPending && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={joinEvent.isPending}
            activeOpacity={0.85}
          >
            {joinEvent.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color={colors.white} />
                <Text style={styles.joinButtonText}>Join event</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.joinedText}>You're attending this event</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.calendarButton, addingToCalendar && styles.joinButtonDisabled]}
          onPress={handleAddToCalendar}
          disabled={addingToCalendar}
          activeOpacity={0.75}
        >
          {addingToCalendar ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={styles.calendarButtonText}>Add to calendar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Polls Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Polls</Text>
          </View>
          
          {pollsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : polls.length > 0 ? (
            polls.map((poll: Poll) => {
              const relatedMaterial = poll.material_id
                ? (materials as Material[]).find((m) => m.id === poll.material_id)
                : null;
              return (
                <View key={poll.id}>
                  {relatedMaterial ? (
                    <Text style={styles.relatedMaterialText}>
                      Related material: {relatedMaterial.title}
                    </Text>
                  ) : null}
                  <PollCard 
                    poll={poll} 
                    onSelectOption={handlePollOptionSelect}
                    onSubmitAnswer={handleVote}
                    selectedOptionId={selectedPollOptions[poll.id]}
                    submittedOptionId={submittedPollOptions[poll.id]}
                    isSubmitting={submittingPollId === poll.id}
                  />
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No polls available</Text>
          )}
        </View>

        {/* Materials Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Materials</Text>
          </View>
          
          {materialsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : materials.length > 0 ? (
            materials.map((material: Material) => (
              <MaterialItem
                key={material.id}
                material={material}
                onDownload={handleDownload}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No materials available</Text>
          )}
        </View>

        {/* Leaderboard Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="podium-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </View>
          {topStudents.length > 0 ? (
            topStudents.slice(0, 10).map((student: { user_id?: string; score?: number; total_actions?: number }, index: number) => (
              <View key={student?.user_id ?? `leader-${index}`} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>{index + 1}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardId} numberOfLines={1}>
                    {student?.user_id
                      ? `${student.user_id.slice(0, 8)}...${student.user_id.slice(-4)}`
                      : '—'}
                  </Text>
                  <Text style={styles.leaderboardActions}>{student?.total_actions ?? 0} actions</Text>
                </View>
                <Text style={styles.leaderboardScore}>{student?.score ?? 0} pts</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No rankings yet — participate in polls and materials to appear</Text>
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBackButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorBackText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  infoCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    minWidth: 64,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    marginBottom: spacing.lg,
  },
  joinButtonDisabled: {
    opacity: 0.85,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  joinPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    marginBottom: spacing.lg,
  },
  calendarButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  joinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.successBg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    marginBottom: spacing.lg,
  },
  joinedText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  relatedMaterialText: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  leaderboardRank: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  leaderboardId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  leaderboardActions: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
