// Browser-only "My learning" (design: "My Learning.dc.html"): segmented filter and a course table with progress,
// what is next and one action per row. Each row reads its course's learning home (the same query the course
// workspace and home dashboard use), so progress and "next up" are server-authoritative.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLearningHome, useMyCertificates, useMyLearning } from '@/hooks/useLearning';
import { useWebLayout } from '@/hooks/useWebLayout';
import { apiErrorMessage } from '@/services/apiErrors';
import type { LearningClass, MyLearningCourse } from '@/types/learning';
import { colors, fonts, palette } from '@/theme/colors';
import { formatLocalDate, formatLocalDateTime } from '@/utils/datetime';
import { lectureAccess } from '@/utils/learning';

type PressState = { pressed: boolean; hovered?: boolean };
type Filter = 'all' | 'active' | 'done';

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;

export interface WebMyLearningProps {
  onCoursePress: (courseId: string) => void;
  onPlayLecture: (lecture: LearningClass) => void;
  onCertificatesPress: () => void;
  onPurchasesPress: () => void;
  onBrowseCourses: () => void;
}

/** First playable recording that is not finished, in course order. */
function nextLecture(classes: LearningClass[]) {
  return (
    classes
      .filter((c) => c.class_type === 'recorded')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .find((c) => !c.completed && lectureAccess(c) === 'available') ?? null
  );
}

/** Soonest live or in-person class that has not ended. */
function nextLive(classes: LearningClass[], now = Date.now()) {
  return (
    classes
      .filter((c) => c.class_type !== 'recorded' && c.start_time && new Date(c.end_time ?? c.start_time).getTime() > now)
      .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())[0] ?? null
  );
}

const isDone = (c: MyLearningCourse) => c.registration_status === 'completed';

export function WebMyLearning(props: WebMyLearningProps) {
  const { wide } = useWebLayout();
  const { data: courses = [], isLoading, error, refetch, isFetching } = useMyLearning();
  const { data: certificates = [] } = useMyCertificates();
  const [filter, setFilter] = useState<Filter>('all');

  const active = courses.filter((c) => !isDone(c));
  const done = courses.filter(isDone);
  const rows = filter === 'active' ? active : filter === 'done' ? done : courses;
  const certFor = (courseId: string) => certificates.find((c) => c.course_id === courseId && !c.revoked_at) ?? null;

  const filters: [Filter, string][] = [
    ['all', `All · ${courses.length}`],
    ['active', `In progress · ${active.length}`],
    ['done', `Completed · ${done.length}`],
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]}>
      <View style={styles.head}>
        <Text style={styles.h1} role="heading" aria-level={1}>
          My learning
        </Text>
        {courses.length > 0 ? (
          <View style={styles.segment} role="tablist">
            {filters.map(([id, label]) => {
              const on = filter === id;
              return (
                <Pressable
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onPress={() => setFilter(id)}
                  style={(s: PressState) => [styles.segBtn, on ? styles.segOn : s.hovered && styles.segHover]}
                >
                  <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <TableSkeleton wide={wide} />
      ) : error ? (
        <Blank
          title="Could not load your courses"
          body={apiErrorMessage(error, 'Check your connection and try again.')}
          cta={isFetching ? 'Retrying…' : 'Try again'}
          onCta={() => refetch()}
        />
      ) : courses.length === 0 ? (
        <Blank
          title="No enrolled courses yet"
          body="Courses you are enrolled in appear here. Browse courses and choose I'm interested to be contacted."
          cta="Browse courses"
          onCta={props.onBrowseCourses}
        />
      ) : (
        <View style={styles.card}>
          {wide ? (
            <View style={[styles.row, styles.headRow]}>
              <Text style={[styles.th, styles.colCourse]}>Course</Text>
              <Text style={[styles.th, styles.colProgress]}>Progress</Text>
              <Text style={[styles.th, styles.colNext]}>Next up</Text>
              <View style={styles.colAction} />
            </View>
          ) : null}
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                {filter === 'done' ? 'Courses you finish move here with their certificates.' : 'You have finished every course you are enrolled in.'}
              </Text>
            </View>
          ) : (
            rows.map((c, i) => (
              <CourseRow key={c.id} course={c} wide={wide} last={i === rows.length - 1} certIssuedAt={certFor(c.id)?.issued_at ?? null} {...props} />
            ))
          )}
        </View>
      )}

      {courses.length > 0 ? (
        <View style={styles.links}>
          <TextLink label="My certificates" onPress={props.onCertificatesPress} />
          <Text style={styles.linkSep}>·</Text>
          <TextLink label="Purchases" onPress={props.onPurchasesPress} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function CourseRow({
  course,
  wide,
  last,
  certIssuedAt,
  onCoursePress,
  onPlayLecture,
  onCertificatesPress,
}: WebMyLearningProps & { course: MyLearningCourse; wide: boolean; last: boolean; certIssuedAt: string | null }) {
  // Course previews must not initialize access windows. Observe only existing detail cache.
  const home = useLearningHome(course.id, false);
  const completion = home.data?.completion;
  const classes = Array.isArray(home.data?.classes) ? home.data!.classes : [];
  const done = isDone(course);

  const recTotal = completion?.recorded_total ?? (Number(course.total_recorded_lectures) || 0);
  const recDone = completion?.recorded_completed ?? (Number(course.completed_lectures) || 0);
  const pct = done ? 100 : completion ? Math.round(completion.progress_percentage) : recTotal > 0 ? Math.round((recDone * 100) / recTotal) : 0;

  const meta = done
    ? 'Completed'
    : [
        recTotal ? `${recTotal} lecture${recTotal === 1 ? '' : 's'}` : null,
        completion?.live_total ? `${completion.live_total} live class${completion.live_total === 1 ? '' : 'es'}` : null,
        completion?.exams_total ? `${completion.exams_total} assessment${completion.exams_total === 1 ? '' : 's'}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Enrolled';

  const lecture = done ? null : nextLecture(classes);
  const live = done ? null : nextLive(classes);
  let next: string;
  if (done) next = certIssuedAt ? `Certificate issued ${formatLocalDate(certIssuedAt)}` : 'Course completed';
  else if (!home.data) next = 'Open course to see available lessons';
  else if (live && (!lecture || new Date(live.start_time!).getTime() - Date.now() < 3 * 86400000))
    next = `Live: ${live.title} · ${formatLocalDateTime(live.start_time)}`;
  else if (lecture)
    next = lecture.access_expires_at ? `${lecture.title} · open until ${formatLocalDate(lecture.access_expires_at)}` : lecture.title;
  else if (completion && completion.exams_total > completion.exams_passed) next = 'Assessment to complete';
  else if (completion?.eligible) next = 'Ready for your certificate';
  else next = 'No lectures available right now';

  const action = done
    ? { label: 'Certificate', primary: false, go: onCertificatesPress }
    : lecture
      ? { label: 'Resume', primary: true, go: () => onPlayLecture(lecture) }
      : { label: 'Open course', primary: true, go: () => onCoursePress(course.id) };

  const progress = (
    <View>
      <View style={styles.progressHead}>
        <Text style={styles.pct}>{pct}%</Text>
        {recTotal ? (
          <Text style={styles.counts}>
            {recDone} of {recTotal} lectures
          </Text>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: done ? palette.slate600 : palette.teal600 }]} />
      </View>
    </View>
  );

  const button = (
    <Pressable
      onPress={action.go}
      accessibilityRole="button"
      accessibilityLabel={`${action.label}: ${course.title}`}
      style={(s: PressState) => [
        action.primary ? styles.btnPrimary : styles.btnOutline,
        s.hovered && (action.primary ? styles.btnPrimaryHover : styles.btnOutlineHover),
      ]}
    >
      <Text style={action.primary ? styles.btnPrimaryText : styles.btnOutlineText}>{action.label}</Text>
    </Pressable>
  );

  const title = (
    <Pressable onPress={() => onCoursePress(course.id)} accessibilityRole="link">
      {(s: PressState) => <Text style={[styles.title, s.hovered && { color: colors.primary }]}>{course.title}</Text>}
    </Pressable>
  );

  if (!wide) {
    return (
      <View style={[styles.stack, !last && styles.divider]}>
        <View>
          {title}
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {progress}
        <Text style={styles.next}>{next}</Text>
        <View style={{ flexDirection: 'row' }}>{button}</View>
      </View>
    );
  }

  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.colCourse}>
        {title}
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={styles.colProgress}>{progress}</View>
      <Text style={[styles.next, styles.colNext]} numberOfLines={3}>
        {next}
      </Text>
      <View style={[styles.colAction, { alignItems: 'flex-end' }]}>{button}</View>
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {(s: PressState) => <Text style={[styles.link, s.hovered && { color: colors.primary }]}>{label}</Text>}
    </Pressable>
  );
}

function Blank({ title, body: text, cta, onCta }: { title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <View style={styles.blank}>
      <View style={styles.blankIcon}>
        <Ionicons name="school-outline" size={18} color={body} />
      </View>
      <Text style={styles.blankTitle}>{title}</Text>
      <Text style={styles.blankBody}>{text}</Text>
      {cta && onCta ? (
        <Pressable onPress={onCta} style={(s: PressState) => [styles.btnPrimary, s.hovered && styles.btnPrimaryHover]}>
          <Text style={styles.btnPrimaryText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TableSkeleton({ wide }: { wide: boolean }) {
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
  const color = v.interpolate({ inputRange: [0, 1], outputRange: [palette.slate150, '#eef1f5'] });
  const sk = (w: number | `${number}%`, h: number) => <Animated.View style={{ width: w, height: h, borderRadius: 4, backgroundColor: color }} />;
  return (
    <View style={styles.card} aria-busy>
      {[0, 1, 2].map((k) => (
        <View key={k} style={[wide ? styles.row : styles.stack, k < 2 && styles.divider]}>
          <View style={[wide && styles.colCourse, { gap: 8 }]}>
            {sk('70%', 16)}
            {sk('45%', 10)}
          </View>
          <View style={[wide && styles.colProgress, { gap: 8 }]}>
            {sk(40, 12)}
            {sk('100%', 4)}
          </View>
          {wide ? <View style={styles.colNext}>{sk('80%', 12)}</View> : null}
          {wide ? <View style={[styles.colAction, { alignItems: 'flex-end' }]}>{sk(90, 36)}</View> : null}
        </View>
      ))}
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 28 },
  pageContentWide: { paddingTop: 24 },
  head: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-end' },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },

  segment: { flexDirection: 'row', gap: 2, padding: 3, borderWidth: 1, borderColor: line, borderRadius: 10, backgroundColor: '#ffffff' },
  segBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7 },
  segHover: { backgroundColor: palette.slate100 },
  segOn: { backgroundColor: palette.navy800 },
  segText: { ...text, fontSize: 14, fontWeight: '500', color: body },
  segTextOn: { color: '#ffffff' },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 20, paddingHorizontal: 24 },
  headRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: line, backgroundColor: palette.slate50 },
  th: { ...text, fontSize: 12, color: muted },
  colCourse: { flex: 2.4, minWidth: 0 },
  colProgress: { flex: 1.4, minWidth: 0 },
  colNext: { flex: 1.2, minWidth: 0 },
  colAction: { width: 140 },
  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  stack: { padding: 20, gap: 14 },

  title: { ...display, fontSize: 16, lineHeight: 21, fontWeight: '600', color: ink },
  meta: { ...text, marginTop: 4, fontSize: 13, color: muted },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  pct: { ...text, fontSize: 13, fontWeight: '600', color: ink },
  counts: { ...text, fontSize: 13, color: muted },
  track: { height: 4, borderRadius: 2, backgroundColor: lineSoft, overflow: 'hidden' },
  fill: { height: '100%' },
  next: { ...text, fontSize: 13, lineHeight: 20, color: body },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: palette.navy800, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700, borderColor: palette.navy700 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300 },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '600', color: ink },

  empty: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  emptyTitle: { ...display, fontSize: 18, fontWeight: '600', color: ink },
  emptyBody: { ...text, fontSize: 14, color: muted, textAlign: 'center' },

  links: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { ...text, fontSize: 13, fontWeight: '500', color: body },
  linkSep: { ...text, fontSize: 13, color: palette.slate300 },

  blank: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  blankBody: { ...text, fontSize: 14, lineHeight: 22, color: body },
});
