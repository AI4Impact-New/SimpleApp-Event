// Browser-only student dashboard (design: claude.ai/design "Home.dc.html").
// Native keeps the app layout in HomeScreen; this renders only when the portal is opened in a browser.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLearningHome } from '@/hooks/useLearning';
import { useWebLayout } from '@/hooks/useWebLayout';
import type { LearnerNotification, LearningClass, MyLearningCourse } from '@/types/learning';
import type { Course } from '@/types/course';
import type { Event } from '@/types/event';
import type { UseQueryResult } from '@tanstack/react-query';
import { colors, fonts, layout, palette, spacing } from '@/theme/colors';
import { formatDuration, formatLocalDate } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';

type PressState = { pressed: boolean; hovered?: boolean };

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const onDarkMuted = '#7e8797';
const darkStrong = '#2b3858';

export interface WebHomeDashboardProps {
  name: string | null;
  learning: UseQueryResult<MyLearningCourse[]>;
  inbox: UseQueryResult<LearnerNotification[]>;
  events: UseQueryResult<Event[]>;
  courses: UseQueryResult<Course[]>;
  prices: { data?: { id: string; total_paise: number }[] };
  continueCourse: MyLearningCourse | null;
  nextEvents: Event[];
  refreshing: boolean;
  onRefresh: () => void;
  onContinueCourse: (courseId: string) => void;
  onPlayLecture: (lecture: LearningClass) => void;
  onOpenLearning: () => void;
  onOpenInbox: () => void;
  onOpenEvents: () => void;
  onEventPress: (event: Event) => void;
  onLeaderboardPress: () => void;
  onExploreCourses: () => void;
  onCoursePress: (courseId: string) => void;
}

function greetingFor(date: Date) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const todayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function coursePct(c: MyLearningCourse) {
  const total = Number(c.total_recorded_lectures) || 0;
  const done = Number(c.completed_lectures) || 0;
  if (c.registration_status === 'completed') return 100;
  return total > 0 ? Math.round((done * 100) / total) : 0;
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatLocalDate(iso);
}

/** Card widths for an auto-fill grid with 16px gaps (RN Web passes calc() through to CSS). */
function useColumns() {
  const { width, wide } = useWebLayout();
  // Main column width: page container minus gutters, and minus the side nav on wide windows.
  const main = Math.min(width, layout.container) - 48 - (wide ? 232 + 32 : 0);
  const cols = main >= 840 ? 3 : main >= 540 ? 2 : 1;
  return { cols, cardWidth: (cols === 1 ? '100%' : `calc((100% - ${(cols - 1) * 16}px) / ${cols})`) as any };
}

export function WebHomeDashboard(props: WebHomeDashboardProps) {
  const { name, learning, inbox, events, courses, prices, continueCourse, nextEvents } = props;
  const { wide } = useWebLayout();
  const { cardWidth } = useColumns();
  const now = new Date();

  const myCourses = learning.data ?? [];
  const enrolledIds = new Set(myCourses.map((c) => c.id));
  const recs = (courses.data ?? []).filter((c) => !enrolledIds.has(c.id)).slice(0, 3);
  const recordingsDone = myCourses.reduce((sum, c) => sum + (Number(c.completed_lectures) || 0), 0);
  const activeCount = myCourses.filter((c) => c.registration_status !== 'completed').length;
  const unread = (inbox.data ?? []).filter((n) => !n.read_at).length;

  const nav: SideItem[] = [
    { icon: 'book-outline', label: 'Your courses', count: myCourses.length || undefined, onPress: props.onOpenLearning },
    { icon: 'mail-outline', label: 'Inbox', badge: unread || undefined, onPress: props.onOpenInbox },
    { icon: 'podium-outline', label: 'Leaderboards', onPress: props.onLeaderboardPress },
    { icon: 'calendar-outline', label: 'Events', onPress: props.onOpenEvents },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, wide && styles.contentWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor={colors.primary} />}
    >
      <View style={wide ? styles.shell : undefined}>
      {wide ? (
        <SideNav items={nav} courses={myCourses} onCoursePress={props.onContinueCourse} onAllCourses={props.onOpenLearning} />
      ) : null}
      <View style={[styles.main, wide && styles.mainWide]}>
      {/* Greeting + headline stats */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.date}>{todayFormat.format(now)}</Text>
          <Text style={[styles.h1, !wide && styles.h1Narrow]} role="heading" aria-level={1}>
            {greetingFor(now)}
            {name ? `, ${name}` : ''}.
          </Text>
        </View>
        {myCourses.length > 0 ? (
          <View style={styles.stats}>
            <Stat value={String(activeCount)} label={activeCount === 1 ? 'Active course' : 'Active courses'} />
            <Stat value={String(recordingsDone)} label="Recordings completed" />
          </View>
        ) : null}
      </View>

      {!wide ? <ShortcutPills items={nav} /> : null}

      {/* Continue learning */}
      {learning.isLoading ? (
        <View style={[styles.hero, styles.center]}>
          <ActivityIndicator color={palette.teal400} />
        </View>
      ) : learning.error ? (
        <View style={[styles.hero, styles.center]}>
          <Text style={styles.heroBody}>Could not load your courses.</Text>
          <TextLink label="Retry" onPress={() => learning.refetch()} dark />
        </View>
      ) : continueCourse ? (
        <ContinueHero
          course={continueCourse}
          onOpenCourse={() => props.onContinueCourse(continueCourse.id)}
          onPlayLecture={props.onPlayLecture}
        />
      ) : (
        <StartHero hasCourses={myCourses.length > 0} onExplore={props.onExploreCourses} />
      )}

      {/* Up next */}
      <View style={styles.section}>
        <SectionHeader title="Up next" action="All events" onAction={props.onOpenEvents} />
        {events.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xxl }} />
        ) : events.error ? (
          <View style={styles.panel}>
            <PanelMessage text="Could not load events." action="Retry" onAction={() => events.refetch()} />
          </View>
        ) : nextEvents.length === 0 ? (
          <Text style={styles.mutedText}>No upcoming events right now.</Text>
        ) : (
          <View style={styles.grid}>
            {nextEvents.map((event) => (
              <UpNextCard key={event.id} event={event} width={cardWidth} onPress={() => props.onEventPress(event)} />
            ))}
          </View>
        )}
      </View>

      {/* Recommended next */}
      <View style={styles.section}>
        <SectionHeader title={myCourses.length > 0 ? 'Recommended next' : 'Explore courses'} action="Browse all courses" onAction={props.onExploreCourses} />
        {courses.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xxl }} />
        ) : courses.error ? (
          <View style={styles.panel}>
            <PanelMessage text="Could not load courses." action="Retry" onAction={() => courses.refetch()} />
          </View>
        ) : recs.length === 0 ? (
          <Text style={styles.mutedText}>You're enrolled in every available course.</Text>
        ) : (
          <View style={styles.grid}>
            {recs.map((course, i) => {
              const price = prices.data?.find((p) => p.id === course.id);
              return (
                <RecCard
                  key={course.id}
                  index={i}
                  course={course}
                  price={price ? formatPaise(price.total_paise) : 'View fee'}
                  width={cardWidth}
                  onPress={() => props.onCoursePress(course.id)}
                />
              );
            })}
          </View>
        )}
      </View>
      </View>
      </View>
    </ScrollView>
  );
}

// ---- Side navigation --------------------------------------------------------------------------

type SideItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Neutral count (e.g. number of courses). */
  count?: number;
  /** Attention count (e.g. unread messages). */
  badge?: number;
  onPress: () => void;
};

function SideNav({
  items,
  courses,
  onCoursePress,
  onAllCourses,
}: {
  items: SideItem[];
  courses: MyLearningCourse[];
  onCoursePress: (courseId: string) => void;
  onAllCourses: () => void;
}) {
  const shown = courses.slice(0, 4);
  return (
    <View style={styles.side} role="navigation" aria-label="Dashboard shortcuts">
      <View style={styles.sideGroup}>
        {items.map((item) => (
          <Pressable key={item.label} onPress={item.onPress} style={(s: PressState) => [styles.sideItem, s.hovered && styles.sideItemHover]}>
            <Ionicons name={item.icon} size={18} color={body} />
            <Text style={styles.sideLabel}>{item.label}</Text>
            {item.badge ? (
              <View style={styles.sideBadge}>
                <Text style={styles.sideBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
              </View>
            ) : item.count ? (
              <Text style={styles.sideCount}>{item.count}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {shown.length > 0 ? (
        <View style={styles.sideCourses}>
          <Text style={styles.sideHeading}>Your courses</Text>
          {shown.map((c) => {
            const pct = coursePct(c);
            return (
              <Pressable key={c.id} onPress={() => onCoursePress(c.id)} style={(s: PressState) => [styles.sideCourse, s.hovered && styles.sideItemHover]}>
                <Text style={styles.sideCourseTitle} numberOfLines={2}>
                  {c.title}
                </Text>
                <View style={styles.sideCourseMeta}>
                  <View style={[styles.trackLight, { flex: 1 }]}>
                    <View style={[styles.fillPrimary, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.sideCoursePct}>{pct}%</Text>
                </View>
              </Pressable>
            );
          })}
          {courses.length > shown.length ? <TextLink label={`All ${courses.length} courses`} onPress={onAllCourses} icon /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Narrow browsers: the side navigation collapses into a row of shortcuts. */
function ShortcutPills({ items }: { items: SideItem[] }) {
  return (
    <ScrollView horizontal style={styles.pillsScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {items.map((item) => (
        <Pressable key={item.label} onPress={item.onPress} style={(s: PressState) => [styles.pill, s.hovered && styles.outlineBtnHover]}>
          <Ionicons name={item.icon} size={15} color={body} />
          <Text style={styles.pillText}>{item.label}</Text>
          {item.badge ? (
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---- Continue learning ------------------------------------------------------------------------

/** The lecture to resume: first available recording that is not finished, in course order. */
function nextLecture(classes: LearningClass[]): LearningClass | null {
  const recorded = classes
    .filter((c) => c.class_type === 'recorded')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return recorded.find((c) => !c.completed && (c.access_state ?? 'available') === 'available') ?? null;
}

function ContinueHero({
  course,
  onOpenCourse,
  onPlayLecture,
}: {
  course: MyLearningCourse;
  onOpenCourse: () => void;
  onPlayLecture: (lecture: LearningClass) => void;
}) {
  const { wide } = useWebLayout();
  // Opening the dashboard is not an intent to start a recording access window.
  const home = useLearningHome(course.id, false);
  const completion = home.data?.completion;
  const lecture = Array.isArray(home.data?.classes) ? nextLecture(home.data!.classes) : null;
  const pct = completion ? Math.round(completion.progress_percentage) : coursePct(course);

  const duration = lecture?.duration_seconds ?? (lecture?.duration_minutes ? lecture.duration_minutes * 60 : 0);
  const watched = lecture ? Math.max(lecture.resume_seconds || 0, 0) : 0;
  const lecturePct = duration > 0 ? Math.min(100, Math.round((watched * 100) / duration)) : 0;
  const expires = lecture?.access_expires_at ? formatLocalDate(lecture.access_expires_at) : '';

  const rows: [string, number, number][] = completion
    ? ([
        ['Lectures', completion.recorded_completed, completion.recorded_total],
        ['Assessments', completion.exams_passed, completion.exams_total],
        ['Live classes', completion.live_attended, completion.live_total],
      ] as [string, number, number][]).filter(([, , total]) => total > 0)
    : [['Lectures', Number(course.completed_lectures) || 0, Number(course.total_recorded_lectures) || 0]];

  return (
    <View style={[styles.hero, !wide && styles.heroNarrow]}>
      <View style={styles.heroMain}>
        <Text style={styles.heroEyebrow}>Continue learning</Text>
        <View>
          <Text style={styles.heroBody}>{lecture ? course.title : 'Your course'}</Text>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {lecture ? lecture.title : course.title}
          </Text>
        </View>
        {lecture && duration > 0 ? (
          <View style={styles.heroProgress}>
            <View style={styles.trackDark}>
              <View style={[styles.fillTeal, { width: `${lecturePct}%` }]} />
            </View>
            <View style={styles.spread}>
              <Text style={styles.heroMeta}>
                {formatDuration(watched)} of {formatDuration(duration)}
              </Text>
              {expires ? <Text style={styles.heroMeta}>Available until {expires}</Text> : null}
            </View>
          </View>
        ) : null}
        <View style={styles.heroActions}>
          {lecture ? (
            <Pressable onPress={() => onPlayLecture(lecture)} style={(s: PressState) => [styles.btnLight, s.hovered && { backgroundColor: '#ffffff' }]}>
              <Ionicons name="play" size={16} color={ink} />
              <Text style={styles.btnLightText}>{watched > 0 ? 'Resume lecture' : 'Start lecture'}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onOpenCourse}
            style={(s: PressState) => [lecture ? styles.btnDark : styles.btnLight, s.hovered && (lecture ? { borderColor: palette.slate600 } : { backgroundColor: '#ffffff' })]}
          >
            <Text style={lecture ? styles.btnDarkText : styles.btnLightText}>Open course</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.heroAside, !wide && styles.heroAsideNarrow]}>
        <Text style={styles.asideLabel}>Course progress</Text>
        <Text style={styles.asidePct}>{pct}%</Text>
        <View style={styles.asideRows}>
          {rows.map(([label, done, total]) => (
            <View key={label} style={styles.spread}>
              <Text style={styles.asideRowLabel}>{label}</Text>
              <Text style={styles.asideRowValue}>
                {done} / {total}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function StartHero({ hasCourses, onExplore }: { hasCourses: boolean; onExplore: () => void }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroMain}>
        <Text style={styles.heroEyebrow}>{hasCourses ? 'All caught up' : 'Get started'}</Text>
        <Text style={styles.heroTitle}>{hasCourses ? 'You have finished every enrolled course.' : 'Start your first course'}</Text>
        <Text style={styles.heroBody}>Explore the AI4Impact career tracks and pick your next skill.</Text>
        <View style={styles.heroActions}>
          <Pressable onPress={onExplore} style={(s: PressState) => [styles.btnLight, s.hovered && { backgroundColor: '#ffffff' }]}>
            <Text style={styles.btnLightText}>Browse courses</Text>
            <Ionicons name="arrow-forward" size={16} color={ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---- Rows and cards ---------------------------------------------------------------------------

function UpNextCard({ event, width, onPress }: { event: Event; width: any; onPress: () => void }) {
  const start = event.start_time ? new Date(event.start_time) : null;
  const valid = start && !Number.isNaN(start.getTime());
  const live = event.status === 'ongoing';
  const kind = live ? 'Live now' : event.event_type === 'online' ? 'Online event' : event.event_type === 'hybrid' ? 'Hybrid event' : 'In-person event';
  const meta = [valid ? timeFormat.format(start!) : 'Time TBD', event.location].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={(s: PressState) => [styles.upCard, { width }, s.hovered && styles.cardHover]}>
      <View style={styles.dateTile}>
        <Text style={styles.dateMon}>{valid ? monthFormat.format(start!).toUpperCase() : '—'}</Text>
        <Text style={styles.dateDay}>{valid ? String(start!.getDate()).padStart(2, '0') : '--'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.kind, { color: live ? palette.amber500 : colors.primary }]}>{kind}</Text>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

function RecCard({ index, course, price, width, onPress }: { index: number; course: Course; price: string; width: any; onPress: () => void }) {
  const modes = (course.delivery_modes ?? []).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(' · ');
  return (
    <Pressable onPress={onPress} style={(s: PressState) => [styles.card, styles.recCard, { width }, s.hovered && styles.cardHover]}>
      <Text style={styles.recIdx}>{String(index + 1).padStart(2, '0')}</Text>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {course.title}
      </Text>
      {course.short_description ? (
        <Text style={styles.recDesc} numberOfLines={3}>
          {course.short_description}
        </Text>
      ) : null}
      <View style={styles.recFoot}>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {modes || 'Career track'}
        </Text>
        <View style={styles.recPrice}>
          <Text style={styles.recPriceText}>{price}</Text>
          <Ionicons name="arrow-forward" size={15} color={ink} style={{ transform: [{ rotate: '-45deg' }] }} />
        </View>
      </View>
    </Pressable>
  );
}

// ---- Small pieces -----------------------------------------------------------------------------

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TextLink({ label, onPress, dark, icon }: { label: string; onPress: () => void; dark?: boolean; icon?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.textLink}>
      {(s: PressState) => (
        <>
          <Text style={[styles.textLinkText, dark && { color: palette.teal400 }, s.hovered && { color: colors.primary }]}>{label}</Text>
          {icon ? <Ionicons name="arrow-forward" size={14} color={s.hovered ? colors.primary : body} /> : null}
        </>
      )}
    </Pressable>
  );
}

function PanelHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.panelHeader}>
      <Text style={styles.panelTitle}>{title}</Text>
      <TextLink label={action} onPress={onAction} />
    </View>
  );
}

function PanelMessage({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.panelMessage}>
      <Text style={styles.mutedText}>{text}</Text>
      {action && onAction ? <TextLink label={action} onPress={onAction} /> : null}
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.h2} role="heading" aria-level={2}>
        {title}
      </Text>
      <TextLink label={action} onPress={onAction} icon />
    </View>
  );
}

const display = { fontFamily: fonts.display };
const text = { fontFamily: fonts.body };

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 72, gap: 40 },
  contentWide: { paddingTop: 24, paddingBottom: 96 },
  shell: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
  main: { gap: 40 },
  mainWide: { flex: 1, minWidth: 0, gap: 48 },
  side: {
    width: 232,
    flexShrink: 0,
    gap: 28,
    // Stays in view while the main column scrolls.
    position: 'sticky' as any,
    top: 24,
    paddingTop: 4,
  },
  sideGroup: { gap: 2 },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: 8 },
  sideItemHover: { backgroundColor: palette.slate100 },
  sideLabel: { ...text, flex: 1, fontSize: 14, fontWeight: '500', color: ink },
  sideCount: { ...text, fontSize: 13, color: muted },
  sideBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: palette.amber500, alignItems: 'center', justifyContent: 'center' },
  sideBadgeText: { ...text, fontSize: 11, fontWeight: '700', color: palette.amber950 },
  sideCourses: { gap: 4, borderTopWidth: 1, borderTopColor: line, paddingTop: 20 },
  sideHeading: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: muted, paddingHorizontal: 12, marginBottom: 6 },
  sideCourse: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, gap: 8 },
  sideCourseTitle: { ...text, fontSize: 13, lineHeight: 18, fontWeight: '500', color: ink },
  sideCourseMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sideCoursePct: { ...text, fontSize: 12, color: muted, minWidth: 32, textAlign: 'right' },
  pillsScroller: { flexGrow: 0, flexShrink: 0 },
  pills: { gap: 8, paddingRight: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: line, backgroundColor: colors.backgroundCard },
  pillText: { ...text, fontSize: 13, fontWeight: '500', color: ink },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 260 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },

  greetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  date: { ...text, fontSize: 14, color: muted },
  h1: { ...display, marginTop: 6, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },
  stats: { flexDirection: 'row', gap: 32 },
  statValue: { ...display, fontSize: 22, lineHeight: 22, fontWeight: '700', color: ink },
  statLabel: { ...text, fontSize: 13, color: muted, marginTop: 6 },


  hero: {
    backgroundColor: palette.navy900,
    borderRadius: 20,
    padding: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    alignItems: 'stretch',
  },
  heroNarrow: { padding: 24, gap: 24 },
  heroAsideNarrow: { flexGrow: 1 },
  h1Narrow: { fontSize: 28, lineHeight: 32, letterSpacing: -0.7 },
  heroMain: { flexGrow: 1, flexShrink: 1, flexBasis: 300, gap: 20 },
  heroEyebrow: { ...text, fontSize: 13, color: palette.teal400 },
  heroBody: { ...text, fontSize: 14, color: palette.textOnDarkBody },
  heroTitle: { ...display, marginTop: 8, fontSize: 30, lineHeight: 33, fontWeight: '700', letterSpacing: -0.75, color: palette.textOnDark },
  heroProgress: { gap: 8, maxWidth: 420 },
  heroMeta: { ...text, fontSize: 13, color: palette.textOnDarkBody },
  trackDark: { height: 4, borderRadius: 2, backgroundColor: palette.borderDark, overflow: 'hidden' },
  fillTeal: { height: '100%', backgroundColor: palette.teal400 },
  heroActions: { marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  btnLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: palette.textOnDark,
  },
  btnLightText: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  btnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkStrong,
    backgroundColor: palette.navy750,
  },
  btnDarkText: { ...text, fontSize: 15, fontWeight: '500', color: palette.textOnDark },
  heroAside: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 240,
    borderRadius: 14,
    backgroundColor: palette.navy750,
    borderWidth: 1,
    borderColor: palette.borderDark,
    padding: 20,
    gap: 14,
  },
  asideLabel: { ...text, fontSize: 13, color: onDarkMuted },
  asidePct: { ...display, fontSize: 44, lineHeight: 44, fontWeight: '700', letterSpacing: -1.3, color: palette.textOnDark },
  asideRows: { gap: 10, borderTopWidth: 1, borderTopColor: palette.borderDark, paddingTop: 14 },
  asideRowLabel: { ...text, fontSize: 13, color: palette.textOnDarkBody },
  asideRowValue: { ...text, fontSize: 13, color: palette.textOnDark },

  panel: { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  panelHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  panelTitle: { ...display, fontSize: 18, lineHeight: 22, fontWeight: '600', color: ink },
  panelMessage: { paddingVertical: 20, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  outlineBtnHover: { borderColor: palette.slate300, backgroundColor: palette.slate50 },
  outlineBtnText: { ...text, fontSize: 14, fontWeight: '500', color: ink },

  upCard: { flexDirection: 'row', gap: 14, padding: 20, backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: line, borderRadius: 16 },
  dateTile: { width: 52, borderWidth: 1, borderColor: line, borderRadius: 10, alignItems: 'center', paddingVertical: 6, alignSelf: 'flex-start' },
  dateMon: { ...text, fontSize: 11, color: muted },
  dateDay: { ...display, fontSize: 18, lineHeight: 20, fontWeight: '700', color: ink },
  kind: { ...text, fontSize: 12, fontWeight: '500' },
  rowTitle: { ...text, fontSize: 14, fontWeight: '600', color: ink, marginTop: 2 },
  rowMeta: { ...text, fontSize: 13, color: muted, marginTop: 2 },

  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44, color: ink },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textLinkText: { ...text, fontSize: 13, color: body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  card: { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: line, borderRadius: 20, padding: 24, gap: 16 },
  cardHover: { borderColor: palette.slate300 },
  cardMeta: { ...text, fontSize: 13, color: muted, flexShrink: 1 },
  cardTitle: { ...display, fontSize: 19, lineHeight: 24, fontWeight: '600', color: ink, minHeight: 48 },
  trackLight: { height: 4, borderRadius: 2, backgroundColor: lineSoft, overflow: 'hidden' },
  fillPrimary: { height: '100%', backgroundColor: colors.primary },

  recCard: { gap: 12 },
  recIdx: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '500', color: muted },
  recDesc: { ...text, fontSize: 14, lineHeight: 22, color: body },
  recFoot: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: lineSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  recPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recPriceText: { ...display, fontSize: 15, fontWeight: '600', color: ink },

  mutedText: { ...text, fontSize: 13, color: muted, flexShrink: 1 },
});
