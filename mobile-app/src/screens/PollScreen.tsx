// Poll Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { useQueryClient } from '@tanstack/react-query';
import { usePoll, usePollResults, useCastVote } from '@/hooks/usePolls';
import { PollOption } from '@/types/poll';
import { colors, spacing, borderRadius } from '@/theme/colors';

interface PollScreenProps {
  pollId: string;
  onBack: () => void;
}

function getErrorMessage(error: any): string {
  const msg = error?.response?.data?.message ?? error?.response?.data?.error;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  return 'Failed to submit your answer.';
}

export function PollScreen({ pollId, onBack }: PollScreenProps) {
  const queryClient = useQueryClient();
  const { data: poll, isLoading: pollLoading, refetch: refetchPoll, isRefetching: pollRefetching } = usePoll(pollId);
  const { data: results, isLoading: resultsLoading, refetch: refetchResults, isRefetching: resultsRefetching } = usePollResults(pollId);
  const castVote = useCastVote();
  const [hasVotedThisSession, setHasVotedThisSession] = useState(false);
  const isRefreshing = pollRefetching || resultsRefetching;
  const onRefresh = () => {
    refetchPoll();
    refetchResults();
  };

  const handleVote = async (optionId: string) => {
    try {
      await castVote.mutateAsync({ pollId, optionId });
      setHasVotedThisSession(true);
      await Promise.all([refetchPoll(), refetchResults()]);
      queryClient.invalidateQueries({ queryKey: ['polls', pollId] });
      queryClient.invalidateQueries({ queryKey: ['polls', pollId, 'results'] });
      Alert.alert('Success', 'Your answer has been recorded.');
    } catch (error: any) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes('already voted')) {
        setHasVotedThisSession(true);
        refetchResults();
        queryClient.invalidateQueries({ queryKey: ['polls', pollId, 'results'] });
        Alert.alert('Info', 'You have already answered this question.');
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  if (pollLoading || resultsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Poll not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalVotes = results?.results?.reduce((sum: number, r: { option: string; votes: number }) => sum + r.votes, 0) || 0;
  const canVote = poll.status === 'active' && !hasVotedThisSession;

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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.question}>{poll.question}</Text>
          
          <View style={[styles.statusBadge, { 
            backgroundColor: poll.status === 'active' ? '#22c55e20' : '#6b728020' 
          }]}>
            <Text style={[styles.statusText, { 
              color: poll.status === 'active' ? '#22c55e' : '#6b7280' 
            }]}>
              {poll.status}
            </Text>
          </View>
        </View>

        {/* Voting Options - only when active and not yet voted */}
        {poll.status === 'active' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {hasVotedThisSession ? "You've already answered" : 'Choose the correct answer'}
            </Text>
            {poll.options?.map((option: PollOption) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionButton, !canVote && styles.optionButtonDisabled]}
                onPress={() => canVote && handleVote(option.id)}
                disabled={!canVote || castVote.isPending}
              >
                <Text style={styles.optionText}>{option.option_text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results - show correct answer when poll has one */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 Results ({totalVotes} votes)
          </Text>
          
          {results?.results?.map((result: { option_id?: string; option: string; votes: number; is_correct?: boolean }, index: number) => {
            const percentage = totalVotes > 0 
              ? Math.round((result.votes / totalVotes) * 100) 
              : 0;
            
            return (
              <View key={result.option_id ?? index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultOptionRow}>
                    <Text style={styles.resultOption}>{result.option}</Text>
                    {result.is_correct && (
                      <View style={styles.correctBadge}>
                        <Text style={styles.correctBadgeText}>Correct</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.resultVotes}>
                    {result.votes} votes ({percentage}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { width: `${percentage}%` }]} 
                  />
                </View>
              </View>
            );
          })}
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
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
  header: {
    padding: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    padding: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 14,
  },
  optionButton: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#f9fafb',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  resultItem: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resultOption: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  resultVotes: {
    fontSize: 14,
    color: '#6b7280',
  },
  correctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#22c55e20',
  },
  correctBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
});
