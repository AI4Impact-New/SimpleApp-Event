// Exam Screen – timed MCQ attempt with resume after navigation/app restart; scored on the server
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { useSubmitExamAttempt } from '@/hooks/useLearning';
import { apiErrorMessage } from '@/services/apiErrors';
import type { Exam, ExamAnswers, ExamAttempt } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatDuration } from '@/utils/datetime';
import { userStore } from '@/utils/userStorage';

interface ExamScreenProps {
  exam: Exam;
  onBack: () => void;
}

type StoredAttempt = { attemptId: string; answers: ExamAnswers };

export function ExamScreen({ exam, onBack }: ExamScreenProps) {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [restoring, setRestoring] = useState(true);
  const [starting, setStarting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const submit = useSubmitExamAttempt();
  const autoSubmittedRef = useRef(false);
  // Active attempt + answers persisted per user/exam so a timed exam survives an app restart
  const storeRef = useRef<ReturnType<typeof userStore<StoredAttempt>> | null>(null);
  const store = () => (storeRef.current ??= userStore<StoredAttempt>('exam_attempt', exam.id));

  // Restore a pending (or just-finished) attempt saved for this user/exam
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await (await store()).read();
      if (stored) {
        try {
          const restored = await api.getExamAttempt(stored.attemptId);
          if (!cancelled) {
            setAttempt(restored);
            setAnswers(stored.answers ?? {});
            if (restored.status !== 'pending') await (await store()).write(null);
          }
        } catch (err: any) {
          // Forget the attempt only when the server says it is gone or not ours; keep answers through
          // connection errors so "Start / resume" can pick them back up.
          const status = err?.response?.status;
          if (status === 403 || status === 404) await (await store()).write(null);
        }
      }
      if (!cancelled) setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [exam.id]);

  const doSubmit = useCallback(async () => {
    if (!attempt || submit.isPending) return;
    try {
      const result = await submit.mutateAsync({ attemptId: attempt.id, answers });
      setAttempt(result);
      await (await store()).write(null);
    } catch (err: any) {
      if (!err?.response) {
        // Connection error: resubmitting is safe (a finalized attempt returns its existing score)
        Alert.alert('Connection problem', 'Your answers were not submitted yet.', [
          { text: 'Retry', onPress: () => doSubmit() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Submission failed', apiErrorMessage(err, 'Could not submit your answers.'));
      }
    }
  }, [attempt, answers, exam.id, submit]);

  // Countdown derived from server expires_at; auto-submit at zero (the server decides expiry)
  useEffect(() => {
    if (!attempt || attempt.status !== 'pending') {
      setRemaining(null);
      return;
    }
    const expiresAt = new Date(attempt.expires_at).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        doSubmit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt, doSubmit]);

  const start = async () => {
    setStarting(true);
    try {
      const started = await api.startExamAttempt(exam.id);
      const stored = await (await store()).read();
      const restoredAnswers = stored?.attemptId === started.id ? stored.answers : {};
      autoSubmittedRef.current = false;
      setAttempt(started);
      setAnswers(restoredAnswers);
      await (await store()).write({ attemptId: started.id, answers: restoredAnswers });
    } catch (err) {
      Alert.alert('Cannot start exam', apiErrorMessage(err, 'Could not start the exam.'));
    } finally {
      setStarting(false);
    }
  };

  const select = (questionId: string, optionId: string) => {
    if (!attempt || attempt.status !== 'pending') return;
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    store().then((st) => st.write({ attemptId: attempt.id, answers: next }));
  };

  const confirmSubmit = () => {
    if (!attempt) return;
    const unanswered = attempt.questions.filter((q) => !answers[q.id]).length;
    Alert.alert(
      'Submit answers?',
      unanswered > 0
        ? `${unanswered} question(s) unanswered. Unanswered questions score zero.`
        : 'You cannot change your answers after submitting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => doSubmit() },
      ]
    );
  };

  if (restoring) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={exam.title} onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Result
  if (attempt && attempt.status !== 'pending') {
    const passed = attempt.status === 'passed';
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={exam.title} onBack={onBack} />
        <View style={styles.center}>
          <Ionicons
            name={passed ? 'checkmark-circle' : 'close-circle'}
            size={64}
            color={passed ? colors.success : colors.error}
          />
          <Text style={styles.resultTitle}>{passed ? 'Passed' : 'Not passed'}</Text>
          {attempt.expired ? <Text style={styles.muted}>Time expired before submission.</Text> : null}
          <Text style={styles.resultScore}>
            {attempt.score ?? 0} / {attempt.max_score}
            {attempt.percentage != null ? ` (${Math.round(Number(attempt.percentage))}%)` : ''}
          </Text>
          <Text style={styles.muted}>Pass mark {attempt.pass_percentage}%</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack} activeOpacity={0.75}>
            <Text style={styles.primaryBtnText}>Back to course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Intro
  if (!attempt) {
    const maxAttempts = exam.max_attempts ?? 1;
    const used = Number(exam.attempts_used) || 0;
    const minutes = exam.time_limit_seconds ? Math.round(exam.time_limit_seconds / 60) : null;
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={exam.title} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {exam.description ? <Text style={styles.description}>{exam.description}</Text> : null}
          <View style={styles.card}>
            <InfoRow icon="help-circle-outline" label="Questions" value={String(exam.question_count)} />
            {minutes ? <InfoRow icon="time-outline" label="Time limit" value={`${minutes} min`} /> : null}
            <InfoRow icon="trophy-outline" label="Pass mark" value={`${exam.pass_percentage}%`} />
            <InfoRow icon="repeat-outline" label="Attempts used" value={`${used} / ${maxAttempts}`} />
          </View>
          <Text style={styles.muted}>
            The timer keeps running if you leave this screen. Starting again resumes an unfinished attempt.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.fullBtn]}
            onPress={start}
            disabled={starting}
            activeOpacity={0.75}
          >
            {starting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Start / resume exam</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // In progress
  const answered = attempt.questions.filter((q) => answers[q.id]).length;
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={exam.title}
        onBack={onBack}
        right={
          remaining != null ? (
            <View style={[styles.timer, remaining < 60 && styles.timerUrgent]}>
              <Ionicons name="time-outline" size={16} color={remaining < 60 ? colors.error : colors.text} />
              <Text style={[styles.timerText, remaining < 60 && { color: colors.error }]}>
                {formatDuration(remaining)}
              </Text>
            </View>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {attempt.questions.map((q, index) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.questionMeta}>
              Question {index + 1} · {q.points} {q.points === 1 ? 'point' : 'points'}
            </Text>
            <Text style={styles.questionText}>{q.question}</Text>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => select(q.id, opt.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <TouchableOpacity
          style={[styles.primaryBtn, styles.fullBtn, submit.isPending && styles.disabledBtn]}
          onPress={confirmSubmit}
          disabled={submit.isPending}
          activeOpacity={0.75}
        >
          {submit.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>
              Submit ({answered}/{attempt.questions.length} answered)
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  questionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  timerUrgent: {
    backgroundColor: colors.errorBg,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  fullBtn: {
    alignSelf: 'stretch',
  },
  disabledBtn: {
    backgroundColor: colors.textMuted,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
