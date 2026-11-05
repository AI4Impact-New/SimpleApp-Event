// Browser-only exam (design: "Exam.dc.html"): an exam bar with exit and timer, one question at a time with a
// question grid, flag-for-review and keyboard shortcuts, then a result page. Presentational: ExamScreen owns the
// attempt (start/resume, server-clock countdown, auto-submit, saved answers), so web and native score identically.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Spinner } from '@/components/web/Spinner';
import type { Exam, ExamAnswers, ExamAttempt } from '@/types/learning';
import { colors, fonts, palette } from '@/theme/colors';

type PressState = { pressed: boolean; hovered?: boolean };

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const amber = palette.amber500;
const amberBg = '#fff1dc';
const amberInk = '#e8931a';
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export interface WebExamProps {
  exam: Exam;
  restoring: boolean;
  attempt: ExamAttempt | null;
  answers: ExamAnswers;
  remaining: number | null;
  attemptsLeft: number;
  starting: boolean;
  submitting: boolean;
  onStart: () => void;
  onSelect: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  onTryAgain: () => void;
  onBack: () => void;
}

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WebExam(props: WebExamProps) {
  const { exam, attempt, restoring } = props;
  const pending = attempt?.status === 'pending';

  return (
    <View style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={props.onBack} accessibilityRole="link" style={styles.exit}>
          {(s: PressState) => (
            <>
              <Ionicons name={pending ? 'close' : 'arrow-back'} size={16} color={s.hovered ? colors.primary : body} />
              <Text style={[styles.exitText, s.hovered && { color: colors.primary }]}>{pending ? 'Exit' : 'Back to course'}</Text>
            </>
          )}
        </Pressable>
        <View style={styles.barRule} />
        <Text style={styles.barTitle} numberOfLines={1}>
          {exam.title}
        </Text>
        {pending && props.remaining != null ? (
          <View style={styles.barRight}>
            <View style={[styles.timer, props.remaining < 60 && styles.timerUrgent]} accessibilityLabel={`${clock(props.remaining)} left`} aria-live="off">
              <Ionicons name="timer-outline" size={14} color={props.remaining < 60 ? '#b4321f' : ink} />
              <Text style={[styles.timerText, props.remaining < 60 && { color: '#b4321f' }]}>{clock(props.remaining)} left</Text>
            </View>
          </View>
        ) : null}
      </View>

      {restoring ? (
        <View style={styles.center}>
          <Spinner size={22} track={palette.slate200} head={palette.teal600} label="Loading assessment" />
        </View>
      ) : attempt && !pending ? (
        <Result {...props} attempt={attempt} />
      ) : attempt ? (
        <InProgress {...props} attempt={attempt} />
      ) : (
        <Intro {...props} />
      )}
    </View>
  );
}

function Intro({ exam, attemptsLeft, starting, onStart }: WebExamProps) {
  const maxAttempts = exam.max_attempts ?? 1;
  const used = Number(exam.attempts_used) || 0;
  const minutes = exam.time_limit_seconds ? Math.round(exam.time_limit_seconds / 60) : null;
  const facts: [string, string][] = [
    ['Questions', String(exam.question_count)],
    ...(minutes ? ([['Time limit', `${minutes} min`]] as [string, string][]) : []),
    ['Pass mark', `${exam.pass_percentage}%`],
    ['Attempts used', `${used} of ${maxAttempts}`],
  ];
  return (
    <ScrollView contentContainerStyle={styles.narrow}>
      <Text style={styles.eyebrow}>Assessment</Text>
      <Text style={styles.h1} role="heading" aria-level={1}>
        {exam.title}
      </Text>
      {exam.description ? <Text style={styles.lead}>{exam.description}</Text> : null}
      <Stats items={facts} />
      <Text style={styles.note}>
        The timer starts when you begin and keeps running if you leave this page. Opening the assessment again resumes an unfinished attempt.
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Pressable
          onPress={onStart}
          disabled={starting || attemptsLeft <= 0}
          style={(s: PressState) => [styles.btnPrimary, styles.btnLg, (s.hovered || starting) && styles.btnPrimaryHover, attemptsLeft <= 0 && { opacity: 0.5 }]}
        >
          {starting ? <Spinner size={16} /> : null}
          <Text style={styles.btnPrimaryText}>{attemptsLeft <= 0 ? 'No attempts left' : starting ? 'Starting…' : 'Start or resume'}</Text>
          {!starting && attemptsLeft > 0 ? <Ionicons name="arrow-forward" size={15} color="#ffffff" /> : null}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InProgress({ attempt, answers, onSelect, onSubmit, submitting }: WebExamProps & { attempt: ExamAttempt }) {
  const { wide } = useWebLayout();
  const questions = attempt.questions;
  const total = questions.length;
  const [i, setI] = useState(0);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const q = questions[Math.min(i, total - 1)];
  const answered = questions.filter((x) => answers[x.id]).length;
  const unanswered = total - answered;
  const flagged = questions.filter((x) => flags[x.id]).length;
  const last = i === total - 1;

  // Keyboard: A–H or 1–8 picks an option, ← / → move between questions.
  useEffect(() => {
    if (typeof window === 'undefined' || !q) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && /input|textarea|select/i.test(t.tagName))) return;
      if (e.key === 'ArrowRight') setI((n) => Math.min(total - 1, n + 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      else {
        const k = e.key.toUpperCase();
        const idx = /^[1-8]$/.test(k) ? Number(k) - 1 : KEYS.indexOf(k);
        if (idx >= 0 && idx < q.options.length) onSelect(q.id, q.options[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, total, onSelect]);

  if (!q) return null;

  const grid = (
    <View style={[styles.aside, wide && styles.asideWide]}>
      <View style={styles.spread}>
        <Text style={styles.asideTitle}>Questions</Text>
        <Text style={styles.asideMeta}>
          {answered} of {total} answered
        </Text>
      </View>
      <View style={styles.grid}>
        {questions.map((x, j) => {
          const a = !!answers[x.id];
          const f = !!flags[x.id];
          const cur = j === i;
          return (
            <Pressable
              key={x.id}
              onPress={() => setI(j)}
              accessibilityRole="button"
              accessibilityLabel={`Question ${j + 1}${a ? ', answered' : ''}${f ? ', flagged' : ''}`}
              aria-current={cur || undefined}
              style={[
                styles.cell,
                f ? styles.cellFlag : a ? styles.cellDone : null,
                cur && styles.cellCurrent,
              ]}
            >
              <Text style={[styles.cellText, f ? { color: amberInk } : a ? { color: '#ffffff' } : null]}>{j + 1}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: palette.navy800 }]} />
          <Text style={styles.legendText}>Answered</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: amberBg, borderWidth: 1, borderColor: amber }]} />
          <Text style={styles.legendText}>Flagged for review</Text>
        </View>
      </View>
      <Pressable onPress={() => setConfirming(true)} style={(s: PressState) => [styles.btnOutline, { alignSelf: 'stretch' }, s.hovered && styles.btnOutlineHover]}>
        <Text style={styles.btnOutlineText}>Submit attempt</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={[styles.examBody, wide && styles.examBodyWide]}>
      <View style={styles.main}>
        <Text style={styles.qMeta}>
          Question {i + 1} of {total} · {q.points} {q.points === 1 ? 'point' : 'points'}
        </Text>
        <Text style={styles.question} role="heading" aria-level={1}>
          {q.question}
        </Text>
        <View style={{ gap: 10 }} role="radiogroup" aria-label={`Question ${i + 1} options`}>
          {q.options.map((o, j) => {
            const sel = answers[q.id] === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => onSelect(q.id, o.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel }}
                style={(s: PressState) => [styles.opt, sel ? styles.optSel : s.hovered && styles.optHover]}
              >
                <View style={[styles.key, sel && styles.keySel]}>
                  <Text style={[styles.keyText, sel && { color: '#ffffff' }]}>{KEYS[j] ?? j + 1}</Text>
                </View>
                <Text style={styles.optText}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {confirming ? (
          <View style={styles.confirm} role="alertdialog" aria-label="Submit attempt">
            <Text style={styles.confirmTitle}>Submit this attempt?</Text>
            <Text style={styles.confirmBody}>
              {unanswered > 0
                ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered and will score zero.`
                : 'You cannot change your answers after submitting.'}
              {flagged > 0 ? ` ${flagged} flagged for review.` : ''}
            </Text>
            <View style={styles.row}>
              <Pressable onPress={() => setConfirming(false)} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
                <Text style={styles.btnOutlineText}>Keep working</Text>
              </Pressable>
              <Pressable
                onPress={onSubmit}
                disabled={submitting}
                style={(s: PressState) => [styles.btnPrimary, (s.hovered || submitting) && styles.btnPrimaryHover]}
              >
                {submitting ? <Spinner size={16} /> : null}
                <Text style={styles.btnPrimaryText}>{submitting ? 'Submitting…' : 'Submit answers'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.nav}>
            <Pressable
              onPress={() => setI((n) => Math.max(0, n - 1))}
              disabled={i === 0}
              style={(s: PressState) => [styles.btnOutline, styles.btnNav, i === 0 && { opacity: 0.45 }, s.hovered && i > 0 && styles.btnOutlineHover]}
            >
              <Text style={styles.btnOutlineText}>Previous</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable onPress={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))} style={(s: PressState) => [styles.flagBtn, s.hovered && { backgroundColor: palette.slate100 }]}>
                <Ionicons name={flags[q.id] ? 'flag' : 'flag-outline'} size={14} color={flags[q.id] ? amberInk : body} />
                <Text style={[styles.flagText, flags[q.id] && { color: amberInk }]}>{flags[q.id] ? 'Flagged' : 'Flag for review'}</Text>
              </Pressable>
              <Pressable
                onPress={() => (last ? setConfirming(true) : setI(i + 1))}
                style={(s: PressState) => [styles.btnPrimary, styles.btnNav, s.hovered && styles.btnPrimaryHover]}
              >
                <Text style={styles.btnPrimaryText}>{last ? 'Submit attempt' : 'Next question'}</Text>
                <Ionicons name="arrow-forward" size={15} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        )}
        {wide ? <Text style={styles.hint}>Tip: press A–{KEYS[q.options.length - 1] ?? 'D'} to answer and ← → to move.</Text> : null}
      </View>
      {grid}
    </ScrollView>
  );
}

function Result({ exam, attempt, attemptsLeft, onTryAgain, onBack }: WebExamProps & { attempt: ExamAttempt }) {
  const passed = attempt.status === 'passed';
  const pct = attempt.percentage != null ? Math.round(Number(attempt.percentage)) : null;
  const taken =
    attempt.submitted_at && attempt.started_at
      ? Math.max(0, (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
      : null;
  const canRetry = !passed && attemptsLeft > 0;
  const maxAttempts = exam.max_attempts ?? 1;

  return (
    <ScrollView contentContainerStyle={styles.narrow}>
      <Text style={[styles.eyebrow, { color: passed ? palette.teal600 : '#b4321f' }]}>
        Submitted{attempt.expired ? ' · time ran out' : ''}
      </Text>
      <Text style={styles.h1} role="heading" aria-level={1}>
        {passed ? `You passed${pct != null ? ` with ${pct}%` : ''}.` : `Not passed${pct != null ? ` · ${pct}%` : ''}.`}
      </Text>
      <Text style={styles.lead}>
        The pass mark is {attempt.pass_percentage}%.{' '}
        {passed
          ? 'This assessment now counts towards your course completion.'
          : canRetry
            ? `You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left. Review the course material before trying again.`
            : 'You have used all your attempts. Contact your trainer if you need help.'}
      </Text>
      <Stats
        items={[
          ['Score', `${attempt.score ?? 0} / ${attempt.max_score}`],
          ['Time taken', taken != null ? clock(taken) : '—'],
          ['Attempts left', `${attemptsLeft} of ${maxAttempts}`],
        ]}
      />
      <View style={styles.row}>
        <Pressable onPress={onBack} style={(s: PressState) => [styles.btnPrimary, styles.btnLg, s.hovered && styles.btnPrimaryHover]}>
          <Text style={styles.btnPrimaryText}>Back to course</Text>
        </Pressable>
        {canRetry ? (
          <Pressable onPress={onTryAgain} style={(s: PressState) => [styles.btnOutline, styles.btnLg, s.hovered && styles.btnOutlineHover]}>
            <Text style={styles.btnOutlineText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <View style={styles.stats}>
      {items.map(([label, value], k) => (
        <View key={label} style={[styles.stat, k < items.length - 1 && styles.statRule]}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },

  bar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: line },
  exit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exitText: { ...text, fontSize: 14, color: body },
  barRule: { width: 1, height: 24, backgroundColor: line },
  barTitle: { ...display, flex: 1, fontSize: 15, fontWeight: '600', color: ink },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 12, borderWidth: 1, borderColor: line, borderRadius: 8 },
  timerUrgent: { borderColor: '#f1b4a7', backgroundColor: '#fdf1ee' },
  timerText: { ...mono, fontSize: 13, fontWeight: '500', color: ink },

  narrow: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 8, paddingTop: 56, paddingBottom: 96, gap: 24 },
  eyebrow: { ...text, fontSize: 14, fontWeight: '500', color: palette.teal600 },
  h1: { ...display, marginTop: -12, fontSize: 40, lineHeight: 42, fontWeight: '700', letterSpacing: -1.2, color: ink },
  lead: { ...text, fontSize: 16, lineHeight: 27, color: body },
  note: { ...text, fontSize: 13, lineHeight: 20, color: muted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  stat: { flexGrow: 1, flexBasis: 140, paddingVertical: 20, paddingHorizontal: 24 },
  statRule: { borderRightWidth: 1, borderRightColor: lineSoft },
  statLabel: { ...text, fontSize: 13, color: muted },
  statValue: { ...display, marginTop: 8, fontSize: 26, fontWeight: '700', color: ink },

  examBody: { paddingTop: 32, paddingBottom: 96, gap: 32 },
  examBodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 48, paddingTop: 40 },
  main: { flex: 1, minWidth: 0, maxWidth: 720, gap: 28 },
  qMeta: { ...mono, fontSize: 12, fontWeight: '500', color: muted },
  question: { ...display, marginTop: -12, fontSize: 26, lineHeight: 34, fontWeight: '600', letterSpacing: -0.4, color: ink },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  optHover: { borderColor: palette.slate400 },
  optSel: { borderColor: palette.teal600, backgroundColor: palette.teal50 },
  key: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  keySel: { borderColor: palette.teal600, backgroundColor: palette.teal600 },
  keyText: { ...display, fontSize: 13, fontWeight: '600', color: body },
  optText: { ...text, flex: 1, fontSize: 15, lineHeight: 23, color: ink },
  nav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: line },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: 8 },
  flagText: { ...text, fontSize: 14, fontWeight: '500', color: body },
  hint: { ...text, fontSize: 12, color: palette.slate400 },

  confirm: { gap: 12, padding: 20, borderRadius: 14, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  confirmTitle: { ...display, fontSize: 17, fontWeight: '600', color: ink },
  confirmBody: { ...text, fontSize: 14, lineHeight: 22, color: body },

  aside: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, padding: 20, gap: 16 },
  asideWide: { width: 260, flexShrink: 0, position: 'sticky' as any, top: 24 },
  asideTitle: { ...text, fontSize: 13, fontWeight: '600', color: ink },
  asideMeta: { ...text, fontSize: 13, color: muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 'calc((100% - 24px) / 5)' as any, aspectRatio: 1, borderRadius: 8, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  cellDone: { backgroundColor: palette.navy800, borderColor: palette.navy800 },
  cellFlag: { backgroundColor: amberBg, borderColor: amber },
  cellCurrent: { borderColor: palette.teal600, borderWidth: 2 },
  cellText: { ...mono, fontSize: 12, fontWeight: '500', color: body },
  legend: { gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: lineSoft },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { ...text, fontSize: 12, color: muted },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, paddingHorizontal: 18, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300 },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  btnNav: { height: 42 },
  btnLg: { height: 44, paddingHorizontal: 20 },
});
