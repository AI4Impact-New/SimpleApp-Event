// Browser-only course workspace (design: "Course Workspace.dc.html"; loading/error from "States.dc.html").
// Purely presentational: data loading, certificate issuing, calendar export and navigation stay in
// CourseLearningScreen, which renders this layout on web and its app layout on native.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Spinner } from '@/components/web/Spinner';
import type { Completion, Exam, LearningClass } from '@/types/learning';
import type { Course } from '@/types/course';
import { colors, fonts, palette } from '@/theme/colors';
import { formatDuration, formatLocalDate, formatLocalTimeRange } from '@/utils/datetime';
import { lectureAccess, REQUIREMENT_LABELS } from '@/utils/learning';

type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'overview' | 'live' | 'exams' | 'cert';

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const amber = '#e8931a';

const shortDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : shortDate.format(d);
};
const monthOf = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '—';
};
const dayOf = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? String(d.getDate()).padStart(2, '0') : '';
};
const bySortOrder = (a: LearningClass, b: LearningClass) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export interface WebCourseWorkspaceProps {
  course: Course;
  classes: LearningClass[];
  completion: Completion;
  exams: { list: Exam[]; loading: boolean; error: string | null; retry: () => void };
  hasCertificate: boolean;
  issuing: boolean;
  onIssue: () => void;
  onViewCertificate: () => void;
  onPlayLecture: (lecture: LearningClass) => void;
  onOpenExam: (exam: Exam) => void;
  onAddToCalendar: () => void;
  onJoin: (lecture: LearningClass) => void;
  onBack: () => void;
}

export function WebCourseWorkspace(props: WebCourseWorkspaceProps) {
  const { course, classes, completion, exams } = props;
  const { wide } = useWebLayout();
  const [tab, setTab] = useState<Tab>('overview');

  const recorded = classes.filter((c) => c.class_type === 'recorded').sort(bySortOrder);
  const live = classes.filter((c) => c.class_type !== 'recorded').sort(bySortOrder);
  const pct = Math.round(Number(completion.progress_percentage) || 0);
  const accessDays = recorded.find((c) => c.access_days)?.access_days ?? 7;

  // Resume the lecture already in progress, otherwise the first open one not yet completed.
  const open = recorded.filter((c) => lectureAccess(c) === 'available' && !c.completed);
  const resume = open.find((c) => Number(c.watched_seconds) > 0) ?? open[0] ?? null;

  const tabs: { id: Tab; label: string; icon: IconName; count?: number }[] = [
    { id: 'overview', label: 'Curriculum', icon: 'list', count: recorded.length },
    { id: 'live', label: 'Live classes', icon: 'radio-outline', count: live.length },
    { id: 'exams', label: 'Assessments', icon: 'document-text-outline', count: exams.loading ? undefined : exams.list.length },
    { id: 'cert', label: 'Certificate', icon: 'ribbon-outline' },
  ];

  const header = (
    <View style={[styles.header, wide && styles.headerWide]}>
      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <View style={styles.crumbs}>
          <Pressable onPress={props.onBack}>
            {(s: PressState) => <Text style={[styles.crumb, s.hovered && { color: colors.primary }]}>My learning</Text>}
          </Pressable>
          <Ionicons name="chevron-forward" size={13} color={muted} />
          <Text style={styles.crumb}>Course workspace</Text>
        </View>
        <Text style={[styles.h1, !wide && styles.h1Narrow]} role="heading" aria-level={1}>
          {course.title}
        </Text>
      </View>
      <View style={[styles.headerSide, !wide && { width: '100%' }]}>
        <View style={[styles.overall, !wide && { flex: 1, width: undefined }]}>
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>Overall progress</Text>
            <Text style={styles.overallPct}>{pct}%</Text>
          </View>
          <View style={styles.trackLg}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </View>
        {resume ? (
          <Pressable onPress={() => props.onPlayLecture(resume)} style={(s: PressState) => [styles.btnPrimary, s.hovered && styles.btnPrimaryHover]}>
            <Ionicons name="play" size={15} color="#ffffff" />
            <Text style={styles.btnPrimaryText}>{Number(resume.watched_seconds) > 0 ? 'Resume' : 'Start'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const nav = wide ? (
    <View style={styles.aside}>
      {tabs.map((t) => (
        <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
      ))}
      <View style={styles.help}>
        <Text style={styles.helpTitle}>Need help?</Text>
        <Text style={styles.helpText}>Ask your mentor in the cohort channel, or reply to any inbox message.</Text>
      </View>
    </View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {tabs.map((t) => (
        <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} compact />
      ))}
    </ScrollView>
  );

  let content: React.ReactNode;
  if (tab === 'overview') {
    content = (
      <>
        <Stats completion={completion} recorded={recorded} live={live} wide={wide} />
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.h2}>Curriculum</Text>
            {recorded.length ? <Text style={styles.sectionNote}>Recordings stay open for {accessDays} days after release</Text> : null}
          </View>
          {recorded.length ? (
            <View style={styles.card}>
              <View style={styles.groupHead}>
                <Text style={styles.groupIdx}>{String(recorded.length).padStart(2, '0')}</Text>
                <Text style={styles.groupTitle}>Recorded lectures</Text>
                <Text style={styles.groupSummary}>
                  {completion.recorded_completed === recorded.length && recorded.length > 0
                    ? 'Completed'
                    : `${completion.recorded_completed} of ${recorded.length} done`}
                </Text>
              </View>
              {recorded.map((c, i) => (
                <LectureRow key={c.id} lecture={c} last={i === recorded.length - 1} wide={wide} onPress={() => props.onPlayLecture(c)} />
              ))}
            </View>
          ) : (
            <Blank icon="play-outline" title="No recorded lectures yet" body="Recordings appear here after each session is published." />
          )}
        </View>
      </>
    );
  } else if (tab === 'live') {
    content = (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.h2}>Live classes</Text>
          {live.length ? (
            <Pressable onPress={props.onAddToCalendar} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
              <Ionicons name="calendar-outline" size={15} color={ink} />
              <Text style={styles.btnOutlineText}>Add all to calendar</Text>
            </Pressable>
          ) : null}
        </View>
        {live.length ? (
          <View style={styles.card}>
            {live.map((c, i) => (
              <LiveRow key={c.id} lecture={c} last={i === live.length - 1} onJoin={() => props.onJoin(c)} />
            ))}
          </View>
        ) : (
          <Blank icon="radio-outline" title="No live classes scheduled" body="Live sessions for this course will be listed here with their joining links." />
        )}
      </View>
    );
  } else if (tab === 'exams') {
    content = (
      <View style={styles.section}>
        <Text style={styles.h2}>Assessments</Text>
        {exams.loading ? (
          <View style={styles.grid}>
            {[0, 1].map((k) => (
              <SkeletonCard key={k} rows={[['30%', 12], ['90%', 20], ['60%', 12]]} />
            ))}
          </View>
        ) : exams.error ? (
          <Blank icon="cloud-offline-outline" iconColor="#b4321f" title="Could not load assessments" body={exams.error} cta="Try again" onCta={exams.retry} />
        ) : exams.list.length === 0 ? (
          <Blank icon="document-text-outline" title="No assessments published yet" body="Assessments appear here once your course team publishes them." />
        ) : (
          <View style={styles.grid}>
            {exams.list.map((e) => (
              <ExamCard key={e.id} exam={e} onPress={() => props.onOpenExam(e)} />
            ))}
          </View>
        )}
      </View>
    );
  } else {
    content = <CertificatePanel {...props} wide={wide} />;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {header}
      <View style={[styles.body, wide && styles.bodyWide]}>
        {nav}
        <View style={[styles.main, wide && styles.mainWide]}>{content}</View>
      </View>
    </ScrollView>
  );
}

function TabButton({
  label,
  icon,
  count,
  active,
  onPress,
  compact,
}: {
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={(s: PressState) => [
        compact ? styles.chip : styles.tab,
        active ? styles.tabActive : s.hovered && styles.tabHover,
        compact && !active && styles.chipIdle,
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? ink : body} />
      <Text style={[styles.tabText, !compact && { flex: 1 }, active && styles.tabTextActive]}>{label}</Text>
      {count != null ? <Text style={styles.tabCount}>{count}</Text> : null}
    </Pressable>
  );
}

function Stats({ completion, recorded, live, wide }: { completion: Completion; recorded: LearningClass[]; live: LearningClass[]; wide: boolean }) {
  const weekAhead = Date.now() + 7 * 86_400_000;
  const expiringSoon = recorded.filter((c) => {
    if (c.completed || lectureAccess(c) !== 'available' || !c.access_expires_at) return false;
    const t = new Date(c.access_expires_at).getTime();
    return t > Date.now() && t <= weekAhead;
  }).length;
  const nextLive = live
    .filter((c) => c.start_time && new Date(c.start_time).getTime() > Date.now())
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())[0];
  const left = completion.recorded_total - completion.recorded_completed;

  const stats = [
    {
      label: 'Lectures watched',
      value: completion.recorded_completed,
      of: completion.recorded_total,
      note: expiringSoon ? `${expiringSoon} expire this week` : left > 0 ? `${left} to go` : 'All watched',
    },
    {
      label: 'Assessments passed',
      value: completion.exams_passed,
      of: completion.exams_total,
      note: completion.rules.require_exam ? 'Required for the certificate' : 'Optional for this course',
    },
    ...(completion.live_total > 0
      ? [
          {
            label: 'Live classes attended',
            value: completion.live_attended,
            of: completion.live_total,
            note: nextLive
              ? `Next on ${fmtShort(nextLive.start_time)}`
              : completion.rules.require_attendance
                ? `${completion.rules.attendance_percentage}% attendance required`
                : 'No upcoming sessions',
          },
        ]
      : []),
  ];

  return (
    <View style={[styles.card, styles.stats, !wide && styles.statsNarrow]}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[
            styles.stat,
            !wide && styles.statNarrow,
            wide ? i < stats.length - 1 && styles.statDivider : i < stats.length - 1 && styles.statDividerNarrow,
          ]}
        >
          <Text style={styles.statLabel}>{s.label}</Text>
          <Text style={styles.statValue}>
            {s.value}
            <Text style={styles.statOf}> / {s.of}</Text>
          </Text>
          <Text style={styles.statNote}>{s.note}</Text>
        </View>
      ))}
    </View>
  );
}

type RowKind = 'done' | 'progress' | 'todo' | 'soon' | 'locked' | 'expired';
const ROW_ICON: Record<RowKind, { name: IconName; bg: string; fg: string; border: string }> = {
  done: { name: 'checkmark', bg: colors.primary, fg: '#ffffff', border: colors.primary },
  progress: { name: 'play', bg: palette.teal50, fg: colors.primary, border: colors.primary },
  todo: { name: 'play', bg: '#ffffff', fg: body, border: line },
  soon: { name: 'time-outline', bg: '#ffffff', fg: palette.slate400, border: line },
  locked: { name: 'lock-closed', bg: palette.slate100, fg: palette.slate400, border: line },
  expired: { name: 'hourglass-outline', bg: palette.slate100, fg: palette.slate400, border: line },
};

function LectureRow({ lecture, last, wide, onPress }: { lecture: LearningClass; last: boolean; wide: boolean; onPress: () => void }) {
  const access = lectureAccess(lecture);
  const playable = access === 'available';
  const duration = Number(lecture.duration_seconds) || 0;
  const watched = Number(lecture.watched_seconds) || 0;
  const pct = duration > 0 ? Math.min(100, Math.round((watched * 100) / duration)) : 0;
  const until = playable && lecture.access_expires_at ? `available until ${fmtShort(lecture.access_expires_at)}` : '';

  let kind: RowKind;
  let sub: string;
  if (access === 'not_ready') {
    kind = 'soon';
    sub = 'Recording not available yet';
  } else if (access === 'locked') {
    kind = 'locked';
    sub = 'Locked · complete the previous lecture to unlock';
  } else if (access === 'expired') {
    kind = lecture.completed ? 'done' : 'expired';
    sub = lecture.completed
      ? `Completed · ${lecture.access_days ?? 7}-day viewing window ended`
      : `Viewing window ended ${formatLocalDate(lecture.access_expires_at)} · ask an administrator to reopen it`;
  } else if (lecture.completed) {
    kind = 'done';
    sub = ['Watched', until].filter(Boolean).join(' · ');
  } else if (watched > 0) {
    kind = 'progress';
    sub = [`${pct}% watched`, until].filter(Boolean).join(' · ');
  } else {
    kind = 'todo';
    sub = ['Not started', until].filter(Boolean).join(' · ');
  }
  const icon = ROW_ICON[kind];
  const dim = !playable && !lecture.completed;

  return (
    <Pressable
      onPress={onPress}
      disabled={!playable}
      accessibilityRole="link"
      accessibilityState={{ disabled: !playable }}
      style={(s: PressState) => [styles.row, !last && styles.rowDivider, dim && { opacity: 0.6 }, playable && s.hovered && styles.rowHover]}
    >
      <View style={[styles.rowIcon, { backgroundColor: icon.bg, borderColor: icon.border }]}>
        <Ionicons name={icon.name} size={14} color={icon.fg} style={icon.name === 'play' ? { marginLeft: 2 } : undefined} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {lecture.title}
        </Text>
        <Text style={[styles.rowSub, kind === 'progress' && { color: colors.primary }]}>{sub}</Text>
      </View>
      {wide ? (
        <View style={[styles.rowBar, kind !== 'progress' && { opacity: 0 }]}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      ) : null}
      <Text style={styles.rowDur}>{duration > 0 ? formatDuration(duration) : ''}</Text>
    </Pressable>
  );
}

function LiveRow({ lecture, last, onJoin }: { lecture: LearningClass; last: boolean; onJoin: () => void }) {
  const online = lecture.class_type === 'online';
  const meta = [
    online ? 'Live online' : 'In person',
    formatLocalTimeRange(lecture.start_time, lecture.end_time),
    lecture.duration_minutes && !lecture.end_time ? `${lecture.duration_minutes} min` : '',
    !online && lecture.location ? lecture.location : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.liveRow, !last && styles.rowDivider]}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateMon}>{monthOf(lecture.start_time)}</Text>
        <Text style={styles.dateDay}>{dayOf(lecture.start_time)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.liveTitle} numberOfLines={2}>
          {lecture.title}
        </Text>
        <Text style={styles.liveMeta}>{meta}</Text>
        {lecture.minutes_attended != null ? (
          <Text style={styles.attended}>Attended {Math.round(Number(lecture.minutes_attended))} min</Text>
        ) : null}
      </View>
      {online && lecture.zoom_link ? (
        <Pressable
          onPress={onJoin}
          accessibilityRole="link"
          accessibilityLabel={`Join ${lecture.title}`}
          style={(s: PressState) => [styles.btnPrimary, styles.btnSm, s.hovered && styles.btnPrimaryHover]}
        >
          <Ionicons name="videocam-outline" size={15} color="#ffffff" />
          <Text style={styles.btnPrimaryText}>Join</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ExamCard({ exam, onPress }: { exam: Exam; onPress: () => void }) {
  const max = exam.max_attempts ?? 1;
  const used = Number(exam.attempts_used) || 0;
  const minutes = exam.time_limit_seconds ? Math.round(exam.time_limit_seconds / 60) : null;
  const status = used >= max ? { text: 'No attempts left', color: muted } : used > 0 ? { text: 'Attempted', color: colors.primary } : { text: 'Not started', color: amber };
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={(s: PressState) => [styles.examCard, s.hovered && { borderColor: palette.slate300 }]}>
      <View style={styles.examTop}>
        <Text style={styles.examMeta}>
          {exam.question_count} questions{minutes ? ` · ${minutes} min` : ''}
        </Text>
        <Text style={[styles.examStatus, { color: status.color }]}>{status.text}</Text>
      </View>
      <Text style={styles.examTitle}>{exam.title}</Text>
      <View style={styles.examFoot}>
        <Text style={styles.examFootText}>Pass mark {exam.pass_percentage}%</Text>
        <Text style={styles.examFootText}>
          {used} of {max} attempt{max === 1 ? '' : 's'} used
        </Text>
      </View>
    </Pressable>
  );
}

function CertificatePanel(props: WebCourseWorkspaceProps & { wide: boolean }) {
  const { completion, course, hasCertificate, issuing, wide } = props;
  const { rules, missing_requirements: missing } = completion;
  const reqs = [
    rules.require_recorded && {
      label: 'Watch every recorded lecture',
      val: `${completion.recorded_completed} / ${completion.recorded_total}`,
      done: !missing.includes('recorded_lectures'),
    },
    rules.require_attendance && {
      label: `Attend ${rules.attendance_percentage}% of live classes`,
      val: `${completion.live_attended} / ${completion.live_total}`,
      done: !missing.includes('live_attendance'),
    },
    rules.require_exam && {
      label: 'Pass every assessment',
      val: `${completion.exams_passed} / ${completion.exams_total}`,
      done: !missing.includes('exam'),
    },
    missing.includes('configured_learning_activities') && { label: REQUIREMENT_LABELS.configured_learning_activities, val: '', done: false },
  ].filter(Boolean) as { label: string; val: string; done: boolean }[];

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Certificate</Text>
      <View style={[styles.card, wide && { flexDirection: 'row' }]}>
        <View style={[styles.certInfo, wide ? styles.certInfoWide : styles.certInfoNarrow]}>
          <Text style={styles.certLead}>
            Complete every requirement to unlock your certificate. It is issued in your name with a verification link you can share.
          </Text>
          {reqs.map((r) => (
            <View key={r.label} style={styles.req}>
              <View style={[styles.reqDot, r.done && styles.reqDotDone]}>
                {r.done ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
              </View>
              <Text style={styles.reqLabel}>{r.label}</Text>
              {r.val ? <Text style={styles.reqVal}>{r.val}</Text> : null}
            </View>
          ))}
          {hasCertificate ? (
            <Pressable onPress={props.onViewCertificate} style={(s: PressState) => [styles.btnPrimary, styles.selfStart, s.hovered && styles.btnPrimaryHover]}>
              <Ionicons name="ribbon" size={15} color="#ffffff" />
              <Text style={styles.btnPrimaryText}>View certificate</Text>
            </Pressable>
          ) : completion.eligible ? (
            <Pressable
              onPress={props.onIssue}
              disabled={issuing}
              style={(s: PressState) => [styles.btnPrimary, styles.selfStart, (s.hovered || issuing) && styles.btnPrimaryHover]}
            >
              {issuing ? <Spinner label="Issuing certificate" /> : <Ionicons name="ribbon-outline" size={15} color="#ffffff" />}
              <Text style={styles.btnPrimaryText}>{issuing ? 'Issuing certificate' : 'Get certificate'}</Text>
            </Pressable>
          ) : (
            <View style={[styles.btnDisabled, styles.selfStart]}>
              <Ionicons name="lock-closed" size={14} color={palette.slate400} />
              <Text style={styles.btnDisabledText}>Unlocks when every requirement is met</Text>
            </View>
          )}
        </View>
        <View style={[styles.certPreviewWrap, wide && { flex: 1 }]}>
          <View style={[styles.certPreview, !hasCertificate && styles.certPreviewLocked]}>
            <Text style={styles.certBrand}>AI4Impact</Text>
            <View>
              <Text style={styles.certKind}>{course.certificate?.title || 'Professional certificate'}</Text>
              <Text style={styles.certTitle}>{course.title}</Text>
              {course.certificate?.provider ? <Text style={styles.certProvider}>{course.certificate.provider}</Text> : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function Blank({
  icon,
  iconColor = body,
  title,
  body: text,
  cta,
  onCta,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.blank}>
      <View style={styles.blankIcon}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.blankTitle}>{title}</Text>
      <Text style={styles.blankBody}>{text}</Text>
      {cta && onCta ? (
        <Pressable onPress={onCta} style={(s: PressState) => [styles.btnPrimary, styles.btnSm, { marginTop: 6 }, s.hovered && styles.btnPrimaryHover]}>
          <Text style={styles.btnPrimaryText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---- Loading and error (States design: skeletons in the final shape; spinners only for user actions) ----

function useShimmer() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [palette.slate150, '#eef1f5'] });
}

function Sk({ w, h, r = 6, color }: { w: number | `${number}%`; h: number; r?: number; color: Animated.AnimatedInterpolation<string> }) {
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: color }} />;
}

function SkeletonCard({ rows }: { rows: [number | `${number}%`, number][] }) {
  const color = useShimmer();
  return (
    <View style={[styles.examCard, { gap: 12 }]}>
      {rows.map(([w, h], i) => (
        <Sk key={i} w={w} h={h} color={color} />
      ))}
    </View>
  );
}

export function WebCourseWorkspaceSkeleton() {
  const { wide } = useWebLayout();
  const color = useShimmer();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} accessibilityLabel="Loading course" aria-busy>
      <View style={[styles.header, wide && styles.headerWide]}>
        <View style={{ gap: 14, flex: 1 }}>
          <Sk w={180} h={12} color={color} />
          <Sk w="55%" h={30} color={color} />
        </View>
        <View style={{ gap: 10, width: wide ? 260 : '100%' }}>
          <Sk w="100%" h={12} color={color} />
          <Sk w="100%" h={6} r={3} color={color} />
        </View>
      </View>
      <View style={[styles.body, wide && styles.bodyWide]}>
        {wide ? (
          <View style={[styles.aside, { gap: 10 }]}>
            {[0, 1, 2, 3].map((k) => (
              <Sk key={k} w="100%" h={28} r={8} color={color} />
            ))}
          </View>
        ) : null}
        <View style={[styles.main, wide && styles.mainWide]}>
          <View style={[styles.card, styles.stats, !wide && styles.statsNarrow]}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={[styles.stat, !wide && styles.statNarrow, { gap: 12 }]}>
                <Sk w="60%" h={12} color={color} />
                <Sk w="40%" h={26} color={color} />
                <Sk w="50%" h={10} color={color} />
              </View>
            ))}
          </View>
          <View style={styles.card}>
            {[0, 1, 2, 3].map((k) => (
              <View key={k} style={[styles.row, k < 3 && styles.rowDivider]}>
                <Sk w={28} h={28} r={14} color={color} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Sk w="65%" h={14} color={color} />
                  <Sk w="40%" h={10} color={color} />
                </View>
                <Sk w={44} h={12} color={color} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export function WebCourseWorkspaceError({ message, onRetry, onBack }: { message: string; onRetry?: () => void; onBack: () => void }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, { alignItems: 'center' }]}>
      <View style={[styles.blank, { maxWidth: 480, width: '100%', marginTop: 48 }]}>
        <View style={styles.blankIcon}>
          <Ionicons name={onRetry ? 'cloud-offline-outline' : 'lock-closed-outline'} size={18} color={onRetry ? '#b4321f' : body} />
        </View>
        <Text style={styles.blankTitle}>{onRetry ? 'We could not load this course' : 'Course not available'}</Text>
        <Text style={styles.blankBody}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {onRetry ? (
            <Pressable onPress={onRetry} style={(s: PressState) => [styles.btnPrimary, styles.btnSm, s.hovered && styles.btnPrimaryHover]}>
              <Text style={styles.btnPrimaryText}>Try again</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onBack} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
            <Text style={styles.btnOutlineText}>Back to my learning</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 28 },

  header: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, padding: 20, gap: 20 },
  headerWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 28, paddingHorizontal: 28, gap: 24 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crumb: { ...text, fontSize: 13, color: muted },
  h1: { ...display, marginTop: 10, fontSize: 32, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8, color: ink },
  h1Narrow: { fontSize: 26, lineHeight: 30 },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  overall: { width: 260 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  overallLabel: { ...text, fontSize: 13, color: body },
  overallPct: { ...text, fontSize: 13, fontWeight: '600', color: ink },
  trackLg: { height: 6, borderRadius: 3, backgroundColor: lineSoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },

  body: { gap: 20 },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
  aside: { width: 232, flexShrink: 0, gap: 2, position: 'sticky' as any, top: 24 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: 8 },
  tabActive: { backgroundColor: lineSoft },
  tabHover: { backgroundColor: palette.slate100 },
  tabText: { ...text, fontSize: 14, fontWeight: '500', color: body },
  tabTextActive: { fontWeight: '600', color: ink },
  tabCount: { ...text, fontSize: 12, color: muted },
  chips: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 12, borderRadius: 8 },
  chipIdle: { borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  help: { marginTop: 20, padding: 16, borderWidth: 1, borderColor: line, borderRadius: 14, backgroundColor: '#ffffff', gap: 4 },
  helpTitle: { ...text, fontSize: 13, fontWeight: '600', color: ink },
  helpText: { ...text, fontSize: 13, lineHeight: 20, color: body },

  main: { gap: 32 },
  mainWide: { flex: 1, minWidth: 0 },
  section: { gap: 16 },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4, color: ink },
  sectionNote: { ...text, fontSize: 13, color: muted },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },

  stats: { flexDirection: 'row' },
  statsNarrow: { flexDirection: 'column' },
  stat: { flex: 1, padding: 24 },
  statNarrow: { paddingVertical: 18, paddingHorizontal: 20 },
  statDivider: { borderRightWidth: 1, borderRightColor: lineSoft },
  statDividerNarrow: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  statLabel: { ...text, fontSize: 13, color: muted },
  statValue: { ...display, marginTop: 10, fontSize: 28, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, color: ink },
  statOf: { fontSize: 16, fontWeight: '500', color: palette.slate400, letterSpacing: 0 },
  statNote: { ...text, marginTop: 8, fontSize: 12, color: muted },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 24, backgroundColor: palette.slate50, borderBottomWidth: 1, borderBottomColor: line },
  groupIdx: { ...mono, fontSize: 12, fontWeight: '500', color: muted },
  groupTitle: { ...display, flex: 1, fontSize: 16, fontWeight: '600', color: ink },
  groupSummary: { ...text, fontSize: 13, color: muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: '#ffffff' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  rowHover: { backgroundColor: palette.slate50 },
  rowIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  rowSub: { ...text, marginTop: 3, fontSize: 12, color: muted },
  rowBar: { width: 90, height: 4, borderRadius: 2, backgroundColor: lineSoft, overflow: 'hidden' },
  rowDur: { ...mono, width: 56, textAlign: 'right', fontSize: 12, fontWeight: '500', color: muted },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 18, paddingHorizontal: 24 },
  dateBadge: { width: 64, paddingVertical: 8, borderWidth: 1, borderColor: line, borderRadius: 10, alignItems: 'center' },
  dateMon: { ...text, fontSize: 11, color: muted },
  dateDay: { ...display, fontSize: 20, lineHeight: 22, fontWeight: '700', color: ink },
  liveTitle: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  liveMeta: { ...text, marginTop: 4, fontSize: 13, color: muted },
  attended: { ...text, marginTop: 4, fontSize: 12, fontWeight: '500', color: colors.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  examCard: { flexGrow: 1, flexBasis: 300, backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, padding: 24, gap: 14 },
  examTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  examMeta: { ...text, fontSize: 13, color: muted },
  examStatus: { ...text, fontSize: 13, fontWeight: '500' },
  examTitle: { ...display, fontSize: 18, lineHeight: 23, fontWeight: '600', color: ink },
  examFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: lineSoft },
  examFootText: { ...text, fontSize: 13, color: body },

  certInfo: { padding: 32, gap: 20 },
  certInfoWide: { flex: 1, borderRightWidth: 1, borderRightColor: lineSoft },
  certInfoNarrow: { padding: 24, borderBottomWidth: 1, borderBottomColor: lineSoft },
  certLead: { ...text, fontSize: 15, lineHeight: 25, color: body },
  req: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.slate300, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  reqDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  reqLabel: { ...text, flex: 1, fontSize: 14, color: ink },
  reqVal: { ...mono, fontSize: 12, fontWeight: '500', color: muted },
  certPreviewWrap: { padding: 32, backgroundColor: palette.slate100, alignItems: 'center', justifyContent: 'center' },
  certPreview: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 1.414,
    backgroundColor: '#fbf9f3',
    borderWidth: 1,
    borderColor: '#e4dfd3',
    borderRadius: 6,
    padding: 24,
    justifyContent: 'space-between',
  },
  certPreviewLocked: { opacity: 0.75, filter: 'grayscale(0.4)' } as any,
  certBrand: { ...display, fontSize: 13, fontWeight: '700', color: ink },
  certKind: { ...text, fontSize: 10, color: muted },
  certTitle: { ...display, marginTop: 4, fontSize: 18, lineHeight: 21, fontWeight: '700', color: ink },
  certProvider: { ...text, marginTop: 8, fontSize: 11, color: body },

  blank: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  blankBody: { ...text, fontSize: 14, lineHeight: 22, color: body },

  selfStart: { alignSelf: 'flex-start' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 18, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnSm: { height: 36, paddingHorizontal: 16 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderWidth: 1, borderColor: line, borderRadius: 8, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300 },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  btnDisabled: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderWidth: 1, borderColor: lineSoft, borderRadius: 8, backgroundColor: palette.slate100 },
  btnDisabledText: { ...text, fontSize: 14, fontWeight: '500', color: palette.slate400 },
});
