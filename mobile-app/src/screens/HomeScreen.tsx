// Home Screen – greeting, continue learning, inbox, upcoming events and course discovery.
// Each card loads independently so one failed request never blanks the page.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useMyLearning, useNotifications } from '@/hooks/useLearning';
import { useEvents } from '@/hooks/useEvents';
import { useCourses } from '@/hooks/useCourses';
import { useBillingCatalog } from '@/hooks/useBilling';
import { authService } from '@/services/auth';
import type { MyLearningCourse } from '@/types/learning';
import type { Course } from '@/types/course';
import type { Event } from '@/types/event';
import { colors, spacing, borderRadius, fonts, palette } from '@/theme/colors';
import { useWebLayout } from '@/hooks/useWebLayout';
import { WebHero } from '@/components/web/WebHero';
import { formatCompactDateTimeInIst } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';

interface HomeScreenProps {
  onContinueCourse: (courseId: string) => void;
  onOpenInbox: () => void;
  onOpenEvents: () => void;
  onEventPress: (event: Event) => void;
  onScanPress: () => void;
  onLeaderboardPress: () => void;
  onExploreCourses: () => void;
  onCoursePress: (courseId: string) => void;
}

/** Most recently useful unfinished course: registered (not completed), most progress first. */
function pickContinueCourse(courses: MyLearningCourse[]): MyLearningCourse | null {
  const active = courses.filter((c) => c.registration_status !== 'completed');
  if (active.length === 0) return null;
  return [...active].sort((a, b) => (Number(b.completed_lectures) || 0) - (Number(a.completed_lectures) || 0))[0];
}

function upcomingEvents(events: Event[]): Event[] {
  const now = Date.now();
  return events
    .filter((e) => e.status !== 'cancelled' && e.status !== 'completed')
    .filter((e) => !e.end_time || new Date(e.end_time).getTime() >= now)
    .slice(0, 3);
}

export function HomeScreen({
  onContinueCourse,
  onOpenInbox,
  onOpenEvents,
  onEventPress,
  onScanPress,
  onLeaderboardPress,
  onExploreCourses,
  onCoursePress,
}: HomeScreenProps) {
  const [name, setName] = useState<string | null>(null);
  const learning = useMyLearning();
  const inbox = useNotifications();
  const events = useEvents('global');
  const courses = useCourses();
  const prices = useBillingCatalog();

  useEffect(() => {
    authService.getCurrentUser().then((res) => {
      const u = res.user;
      setName(u?.given_name || u?.name?.split(' ')[0] || null);
    });
  }, []);

  const refreshing = learning.isRefetching || inbox.isRefetching || events.isRefetching || courses.isRefetching;
  const refreshAll = () => {
    learning.refetch();
    inbox.refetch();
    events.refetch();
    courses.refetch();
    prices.refetch();
  };

  const unread = (inbox.data ?? []).filter((n) => !n.read_at).length;
  const continueCourse = pickContinueCourse(learning.data ?? []);
  const nextEvents = upcomingEvents(events.data ?? []);
  const discover = (courses.data ?? []).slice(0, 6) as Course[];
  const { isWeb, wide } = useWebLayout();

  const continueBlock = learning.isLoading ? (
    <View style={[styles.card, styles.cardCenter]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : learning.error ? (
    <RetryCard message="Could not load your courses" onRetry={() => learning.refetch()} />
  ) : continueCourse ? (
    <ContinueCard course={continueCourse} onPress={() => onContinueCourse(continueCourse.id)} />
  ) : (
    <TouchableOpacity style={[styles.card, styles.exploreCard]} onPress={onExploreCourses} activeOpacity={0.8}>
      <Ionicons name="compass-outline" size={32} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>
          {(learning.data ?? []).length > 0 ? 'All caught up' : 'Start your first course'}
        </Text>
        <Text style={styles.muted}>Explore the AI4Impact career tracks</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  const inboxBlock =
    unread > 0 ? (
      <TouchableOpacity style={[styles.card, styles.inboxCard]} onPress={onOpenInbox} activeOpacity={0.8}>
        <Ionicons name="mail-unread-outline" size={24} color={colors.primaryDark} />
        <Text style={styles.inboxText}>
          {unread} unread {unread === 1 ? 'message' : 'messages'} in your inbox
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
      </TouchableOpacity>
    ) : null;

  const eventsBlock = events.isLoading ? (
    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
  ) : events.error ? (
    <RetryCard message="Could not load events" onRetry={() => events.refetch()} />
  ) : nextEvents.length === 0 ? (
    <Text style={styles.muted}>No upcoming events right now.</Text>
  ) : (
    nextEvents.map((event) => (
      <TouchableOpacity key={event.id} style={[styles.card, styles.eventRow]} onPress={() => onEventPress(event)} activeOpacity={0.75}>
        <Ionicons
          name={event.event_type === 'online' ? 'videocam-outline' : 'location-outline'}
          size={22}
          color={colors.primary}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{event.name}</Text>
          <Text style={styles.muted} numberOfLines={1}>
            {formatCompactDateTimeInIst(event.start_time)} IST{event.location ? ` · ${event.location}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    ))
  );

  const courseCards = discover.map((course) => {
    const price = prices.data?.find((p) => p.id === course.id);
    return (
      <TouchableOpacity
        key={course.id}
        style={[styles.courseCard, wide && styles.courseCardGrid]}
        onPress={() => onCoursePress(course.id)}
        activeOpacity={0.8}
      >
        {wide ? (
          <View style={styles.courseIcon}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
          </View>
        ) : null}
        <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
        {course.short_description ? (
          <Text style={styles.courseDesc} numberOfLines={3}>{course.short_description}</Text>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.coursePrice}>
          {price ? formatPaise(price.total_paise) : 'View current fee'}
        </Text>
      </TouchableOpacity>
    );
  });

  const coursesBlock = courses.isLoading ? (
    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
  ) : courses.error ? (
    <RetryCard message="Could not load courses" onRetry={() => courses.refetch()} />
  ) : wide ? (
    <View style={styles.courseGrid}>{courseCards}</View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseStrip}>
      {courseCards}
    </ScrollView>
  );

  const refresh = (
    <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.primary} colors={[colors.primary]} />
  );

  // Browser portal: dashboard layout with a hero, main column and sidebar.
  if (isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.webContent} showsVerticalScrollIndicator={false} refreshControl={refresh}>
          <WebHero
            eyebrow="Student dashboard"
            title={name ? `Welcome back, ${name}` : 'Welcome back'}
            lead="Pick up where you left off, join upcoming sessions and explore new career tracks."
            aside={wide ? continueBlock : undefined}
          />

          <View style={[styles.webColumns, wide && styles.webColumnsWide]}>
            <View style={styles.webMain}>
              {!wide ? (
                <>
                  <Text style={[styles.webSectionTitle, { marginTop: spacing.xxl }]}>Continue learning</Text>
                  {continueBlock}
                </>
              ) : null}
              <SectionHeader title="Upcoming events" action="See all" onAction={onOpenEvents} web />
              {eventsBlock}
            </View>
            <View style={[styles.webSide, wide && styles.webSideWide]}>
              <Text style={styles.webSectionTitle}>Quick actions</Text>
              <View style={styles.webActions}>
                <QuickAction icon="qr-code-outline" label="Scan event QR" hint="Check in to a live session" onPress={onScanPress} row />
                <QuickAction icon="calendar-outline" label="Events" hint="Workshops and live calls" onPress={onOpenEvents} row />
                <QuickAction icon="podium-outline" label="Leaderboard" hint="See how you rank" onPress={onLeaderboardPress} row />
              </View>
              {inboxBlock}
            </View>
          </View>

          <SectionHeader title="Explore courses" action="View all" onAction={onExploreCourses} web />
          {coursesBlock}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refresh}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title} numberOfLines={1}>{name ? `Hi, ${name}` : 'Hi there'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={onOpenInbox} activeOpacity={0.7} accessibilityLabel="Inbox">
            <Ionicons name="notifications-outline" size={26} color={colors.primary} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Continue learning */}
        <Text style={styles.sectionTitle}>Continue learning</Text>
        {continueBlock}

        {inboxBlock}

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction icon="qr-code-outline" label="Scan QR" onPress={onScanPress} />
          <QuickAction icon="calendar-outline" label="Events" onPress={onOpenEvents} />
          <QuickAction icon="podium-outline" label="Leaderboard" onPress={onLeaderboardPress} />
        </View>

        {/* Upcoming events */}
        <SectionHeader title="Upcoming events" action="See all" onAction={onOpenEvents} />
        {eventsBlock}

        {/* Course discovery */}
        <SectionHeader title="Explore courses" action="View all" onAction={onExploreCourses} />
        {coursesBlock}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContinueCard({ course, onPress }: { course: MyLearningCourse; onPress: () => void }) {
  const total = Number(course.total_recorded_lectures) || 0;
  const done = Number(course.completed_lectures) || 0;
  const pct = total > 0 ? Math.round((done * 100) / total) : 0;
  return (
    <TouchableOpacity style={[styles.card, styles.continueCard]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.continueTitle} numberOfLines={2}>{course.title}</Text>
      {total > 0 ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.continueMeta}>{done} of {total} recordings completed</Text>
        </>
      ) : (
        <Text style={styles.continueMeta}>Recordings will appear here once published</Text>
      )}
      <View style={styles.continueBtn}>
        <Text style={styles.continueBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
  row,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  /** Web sidebar style: icon tile, label and hint in a row. */
  row?: boolean;
}) {
  if (row) {
    return (
      <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.actionIcon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionRowLabel}>{label}</Text>
          {hint ? <Text style={styles.actionRowHint}>{hint}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={26} color={colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, action, onAction, web }: { title: string; action: string; onAction: () => void; web?: boolean }) {
  return (
    <View style={[styles.sectionHeader, web && styles.webSectionHeader]}>
      <Text style={[web ? styles.webSectionTitle : styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{title}</Text>
      <TouchableOpacity onPress={onAction} hitSlop={8}>
        <Text style={styles.link}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.card, styles.retryCard]}>
      <Text style={styles.muted}>{message}</Text>
      <TouchableOpacity onPress={onRetry} hitSlop={8}>
        <Text style={styles.link}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  bellBtn: {
    padding: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCenter: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  continueCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  continueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  continueMeta: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  continueBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    backgroundColor: `${colors.primary}14`,
    borderColor: `${colors.primary}44`,
  },
  inboxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  retryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webContent: {
    padding: spacing.lg,
    paddingBottom: 64,
  },
  webColumns: {
    gap: spacing.xxl,
  },
  webColumnsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  webMain: {
    flex: 1,
    minWidth: 0,
  },
  webSide: {
    marginTop: spacing.xxl,
  },
  webSideWide: {
    width: 340,
    marginTop: 40,
  },
  webSectionHeader: {
    marginTop: 40,
  },
  webSectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  webActions: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate150,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionRowHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  courseCardGrid: {
    // Three across with the 20px gaps; RN Web passes calc() through to CSS.
    width: 'calc((100% - 40px) / 3)' as any,
    minHeight: 200,
    padding: spacing.xxl,
    borderRadius: 16,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  courseStrip: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  courseCard: {
    width: 220,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  courseDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  coursePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.md,
  },
});
