// Browser poll (design: "Poll.dc.html"): answer one question, then results with the correct answer marked.
// `PollPanel` is the reusable card (event detail lists one per poll); `WebPoll` is the full page.
// The server owns eligibility (joined attendees only), one vote per learner and the tally.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCastVote, usePoll, usePollResults } from '@/hooks/usePolls';
import { useWebLayout } from '@/hooks/useWebLayout';
import { apiErrorMessage } from '@/services/apiErrors';
import { Button, ErrorState, InlineError, Skeleton, StateCard, useShimmer } from '@/components/web/states';
import { Crumb, POINTS, eventText, ink, line, lineSoft, muted, type PressState } from '@/components/web/eventParts';
import type { Poll, PollResults } from '@/types/poll';
import { colors, palette } from '@/theme/colors';

const { text, display, mono } = eventText;
type ResultRow = PollResults['results'][number];

const POLL_STATUS: Record<Poll['status'], { text: string; color: string; bg: string }> = {
  active: { text: 'Open', color: palette.teal700, bg: palette.teal50 },
  closed: { text: 'Closed', color: palette.slate600, bg: palette.slate100 },
  draft: { text: 'Not open yet', color: palette.slate600, bg: palette.slate100 },
};

const alreadyVoted = (err: any) => /already (voted|answered)/i.test(String(err?.response?.data?.message ?? err?.response?.data?.error ?? ''));

export function PollPanel({ poll, onOpen }: { poll: Poll; onOpen?: () => void }) {
  const queryClient = useQueryClient();
  const { data: results, refetch } = usePollResults(poll.id);
  const vote = useCastVote();
  const [selected, setSelected] = useState<string | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows: ResultRow[] = results?.results ?? [];
  const total = rows.reduce((sum, r) => sum + (r.votes ?? 0), 0);
  const rowFor = (id: string, label: string) => rows.find((r) => (r.option_id ? r.option_id === id : r.option === label));
  const options = (poll.options ?? []).map((o) => {
    const r = rowFor(o.id, o.option_text);
    return { id: o.id, label: o.option_text, votes: r?.votes ?? 0, correct: !!(r?.is_correct ?? o.is_correct) };
  });
  const hasCorrect = options.some((o) => o.correct);
  const open = poll.status === 'active';
  const showResults = answered || poll.status === 'closed';
  const canAnswer = open && !answered;
  // Opinion polls have no correct option: then the answer is neither right nor wrong.
  const mineCorrect = mine && hasCorrect ? options.find((o) => o.id === mine)?.correct : undefined;

  const submit = async () => {
    if (!selected || vote.isPending) return;
    setError(null);
    try {
      await vote.mutateAsync({ pollId: poll.id, optionId: selected });
      setMine(selected);
    } catch (err) {
      if (!alreadyVoted(err)) {
        setError(apiErrorMessage(err, 'Could not record your answer. Try again.'));
        return;
      }
    }
    setAnswered(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['polls', poll.id] });
    queryClient.invalidateQueries({ queryKey: ['events', poll.event_id, 'analytics'] });
  };

  const status = POLL_STATUS[poll.status] ?? POLL_STATUS.closed;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.chip, { backgroundColor: status.bg }]}>
          {open ? <View style={styles.dot} /> : null}
          <Text style={[styles.chipText, { color: status.color }]}>{status.text}</Text>
        </View>
        <Text style={styles.meta}>{showResults ? `${total} ${total === 1 ? 'vote' : 'votes'}` : canAnswer ? 'Choose one answer' : ''}</Text>
      </View>

      {onOpen ? (
        <Pressable onPress={onOpen} accessibilityRole="link">
          {(s: PressState) => <Text style={[styles.question, s.hovered && { color: colors.primary }]}>{poll.question}</Text>}
        </Pressable>
      ) : (
        <Text style={styles.question} role="heading" aria-level={1}>
          {poll.question}
        </Text>
      )}

      <View style={styles.options} role={canAnswer ? 'radiogroup' : undefined} aria-label={canAnswer ? poll.question : undefined}>
        {options.map((o) => {
          const pct = showResults && total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const isSelected = canAnswer && selected === o.id;
          const isMine = mine === o.id;
          const markCorrect = showResults && o.correct;
          return (
            <Pressable
              key={o.id}
              onPress={canAnswer ? () => setSelected(o.id) : undefined}
              disabled={!canAnswer}
              accessibilityRole={canAnswer ? 'radio' : undefined}
              accessibilityState={canAnswer ? { checked: isSelected } : undefined}
              accessibilityLabel={showResults ? `${o.label}, ${pct}%${markCorrect ? ', correct answer' : ''}${isMine ? ', your answer' : ''}` : o.label}
              style={(s: PressState) => [
                styles.opt,
                isSelected && styles.optSelected,
                markCorrect && styles.optCorrect,
                showResults && isMine && !o.correct && hasCorrect && styles.optWrong,
                canAnswer && !isSelected && s.hovered && { borderColor: palette.slate300 },
              ]}
            >
              {showResults ? (
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: markCorrect ? '#d9f2ea' : isMine ? palette.slate150 : palette.slate100 }]} />
              ) : null}
              {canAnswer ? (
                <View style={[styles.radio, isSelected && styles.radioOn]}>{isSelected ? <View style={styles.radioDot} /> : null}</View>
              ) : null}
              <Text style={styles.optText}>{o.label}</Text>
              {markCorrect ? (
                <View style={styles.tag}>
                  <Ionicons name="checkmark" size={12} color={palette.teal700} />
                  <Text style={styles.tagText}>Correct</Text>
                </View>
              ) : null}
              {showResults && isMine ? <Text style={styles.yours}>Your answer</Text> : null}
              {showResults ? <Text style={styles.pct}>{pct}%</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {canAnswer ? (
        <View style={styles.foot}>
          <Text style={styles.footNote}>
            Answering earns {POINTS.otherAnswer} points, or {POINTS.correctAnswer} for the correct answer.
          </Text>
          <Button label="Submit answer" loadingLabel="Submitting…" loading={vote.isPending} disabled={!selected} onPress={submit} />
        </View>
      ) : answered ? (
        <View style={styles.result} role="status">
          <Ionicons name={mineCorrect === false ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color={mineCorrect === false ? '#b4321f' : palette.teal600} />
          <Text style={styles.resultText}>
            {mine === null
              ? 'You have already answered this poll.'
              : mineCorrect === true
                ? `Correct. +${POINTS.correctAnswer} points added to the leaderboard.`
                : mineCorrect === false
                  ? `Not quite. +${POINTS.otherAnswer} points for taking part.`
                  : 'Answer recorded. Points are added to the event leaderboard.'}
          </Text>
        </View>
      ) : poll.status === 'draft' ? (
        <Text style={styles.footNote}>This poll opens when your host starts it.</Text>
      ) : null}
      <InlineError message={error} />
    </View>
  );
}

export interface WebPollProps {
  pollId: string;
  onBack: () => void;
  onOpenEvent?: (eventId: string) => void;
}

export function WebPoll({ pollId, onBack, onOpenEvent }: WebPollProps) {
  const { wide } = useWebLayout();
  const { data: poll, isLoading, error, refetch, isFetching } = usePoll(pollId);
  const status = (error as any)?.response?.status;

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && { paddingTop: 24 }]}>
      <Crumb label="Back to event" onPress={poll?.event_id && onOpenEvent ? () => onOpenEvent(poll.event_id) : onBack} />
      {isLoading ? (
        <PollSkeleton />
      ) : status === 404 || status === 403 || (!error && !poll) ? (
        <StateCard
          icon="help-circle-outline"
          title="Poll not available"
          body={status === 403 ? 'Join the event to see and answer its polls.' : 'This poll was removed or the link is incomplete.'}
          secondary={{ label: 'Back to event', onPress: onBack }}
        />
      ) : error ? (
        <ErrorState title="Could not load this poll" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <PollPanel key={poll.id} poll={poll as Poll} />
      )}
    </ScrollView>
  );
}

function PollSkeleton() {
  const color = useShimmer();
  return (
    <View style={[styles.card, { gap: 14 }]} aria-busy>
      <Skeleton w={70} h={20} r={10} color={color} />
      <Skeleton w="80%" h={22} color={color} />
      {[0, 1, 2, 3].map((k) => (
        <Skeleton key={k} w="100%" h={48} r={10} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 20 },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, padding: 24, gap: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.teal500 },
  chipText: { ...text, fontSize: 12, fontWeight: '600' },
  meta: { ...text, fontSize: 13, color: muted },
  question: { ...display, fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: -0.3, color: ink },

  options: { gap: 10 },
  opt: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  optSelected: { borderColor: palette.navy800, backgroundColor: palette.slate50 },
  optCorrect: { borderColor: palette.teal500 },
  optWrong: { borderColor: '#e6a397' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: palette.slate300, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  radioOn: { borderColor: palette.navy800 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.navy800 },
  optText: { ...text, flex: 1, fontSize: 15, lineHeight: 21, color: ink },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: palette.teal50 },
  tagText: { ...text, fontSize: 12, fontWeight: '600', color: palette.teal700 },
  yours: { ...text, fontSize: 12, color: muted },
  pct: { ...mono, width: 44, textAlign: 'right', fontSize: 13, fontWeight: '500', color: ink },

  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: lineSoft },
  footNote: { ...text, flexShrink: 1, fontSize: 13, lineHeight: 19, color: muted },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: lineSoft },
  resultText: { ...text, flex: 1, fontSize: 14, color: ink },
});
