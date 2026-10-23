// Course Learning Screen – classes, progress, exams, completion and certificate for an enrolled course
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLearningHome, useCourseExams, useIssueCertificate, useMyCertificates } from '@/hooks/useLearning';
import { api } from '@/services/api';
import { shareTextFile } from '@/utils/sharePdf';
import { apiErrorMessage } from '@/services/apiErrors';
import type { AccessState, Completion, Exam, LearningClass } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatLocalDate, formatLocalDateTime, formatLocalTimeRange, formatDuration } from '@/utils/datetime';

interface CourseLearningScreenProps {
  courseId: string;
  onBack: () => void;
  onPlayLecture: (lecture: LearningClass) => void;
  onOpenExam: (exam: Exam) => void;
  onCertificateIssued: () => void;
}

const REQUIREMENT_LABELS: Record<string, string> = {
  recorded_lectures: 'Complete all recorded lectures',
  live_attendance: 'Attend the required live classes',
  exam: 'Pass all assessments',
  configured_learning_activities: 'This course has no learning activities configured yet',
};

export function CourseLearningScreen({
  courseId,
  onBack,
  onPlayLecture,
  onOpenExam,
  onCertificateIssued,
}: CourseLearningScreenProps) {
  const home = useLearningHome(courseId);
  const exams = useCourseExams(courseId);
  const issueCertificate = useIssueCertificate();
  const certificates = useMyCertificates();
  const hasCertificate = (certificates.data ?? []).some((c) => c.course_id === courseId && !c.revoked_at);
  // Progress refreshes on app foreground (focusManager + staleTime 0) and when the player/exam invalidate it.
  const { refetch: refetchHome } = home;
  const { refetch: refetchExams } = exams;
  const refetchAll = () => {
    refetchHome();
    refetchExams();
  };

  const handleIssue = async () => {
    try {
      await issueCertificate.mutateAsync(courseId);
      Alert.alert('Certificate issued', 'Your completion certificate is ready.', [
        { text: 'View certificates', onPress: onCertificateIssued },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      const status = err?.response?.status;
      const revoked = /revoked/i.test(err?.response?.data?.error ?? '');
      const title = revoked ? 'Certificate revoked' : status === 409 ? 'Not yet eligible' : 'Certificate not issued';
      Alert.alert(title, apiErrorMessage(err, 'Could not issue the certificate.'));
      refetchHome();
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const ics = await api.getCourseCalendarIcs(courseId);
      await shareTextFile({
        text: ics,
        fileName: 'course-schedule.ics',
        mimeType: 'text/calendar',
        UTI: 'com.apple.ical.ics',
        dialogTitle: 'Add classes to your calendar',
      });
    } catch {
      Alert.alert('Calendar unavailable', 'Could not load the calendar. Check your connection and try again.');
    }
  };

  const status = (home.error as any)?.response?.status;
  if (home.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Course" onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (home.error || !home.data) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Course" onBack={onBack} />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>
            {status === 403
              ? 'Register for this course to access its learning content.'
              : status === 404
                ? 'This course is unavailable.'
                : 'Failed to load course.'}
          </Text>
          {status !== 403 && status !== 404 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => refetchHome()}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const { course, classes, completion } = home.data;
  const recorded = classes.filter((c) => c.class_type === 'recorded');
  const live = classes.filter((c) => c.class_type !== 'recorded');
  const examList = exams.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={course.title} onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={home.isRefetching}
            onRefresh={refetchAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <CompletionCard
          completion={completion}
          issuing={issueCertificate.isPending}
          onIssue={handleIssue}
          hasCertificate={hasCertificate}
          onViewCertificate={onCertificateIssued}
        />

        {recorded.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recorded lectures</Text>
            {recorded.map((lecture) => (
              <RecordedRow key={lecture.id} lecture={lecture} onPress={() => onPlayLecture(lecture)} />
            ))}
          </View>
        )}

        {live.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live classes</Text>
            {live.map((cl) => (
              <LiveRow key={cl.id} lecture={cl} />
            ))}
            <TouchableOpacity style={styles.calendarBtn} onPress={handleAddToCalendar} activeOpacity={0.75}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.calendarBtnText}>Add live classes to calendar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessments</Text>
          {exams.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : exams.isError ? (
            <View style={styles.inlineError}>
              <Text style={styles.muted}>{apiErrorMessage(exams.error, 'Could not load assessments.')}</Text>
              <TouchableOpacity onPress={() => refetchExams()} accessibilityRole="button">
                <Text style={styles.retryLink}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : examList.length === 0 ? (
            <Text style={styles.muted}>No assessments published yet.</Text>
          ) : (
            examList.map((exam) => <ExamRow key={exam.id} exam={exam} onPress={() => onOpenExam(exam)} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompletionCard({
  completion,
  issuing,
  onIssue,
  hasCertificate,
  onViewCertificate,
}: {
  completion: Completion;
  issuing: boolean;
  onIssue: () => void;
  hasCertificate: boolean;
  onViewCertificate: () => void;
}) {
  const { rules } = completion;
  const pct = Math.round(Number(completion.progress_percentage) || 0);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your progress</Text>
      {completion.recorded_total > 0 ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.muted}>{pct}% of recorded lectures completed</Text>
        </>
      ) : null}

      <View style={styles.indicators}>
        {rules.require_recorded ? (
          <Indicator
            icon="play-circle-outline"
            label="Lectures"
            value={`${completion.recorded_completed}/${completion.recorded_total}`}
            done={!completion.missing_requirements.includes('recorded_lectures')}
          />
        ) : null}
        {rules.require_attendance ? (
          <Indicator
            icon="people-outline"
            label={`Attendance (${rules.attendance_percentage}%)`}
            value={`${completion.live_attended}/${completion.live_total}`}
            done={!completion.missing_requirements.includes('live_attendance')}
          />
        ) : null}
        {rules.require_exam ? (
          <Indicator
            icon="document-text-outline"
            label="Exams passed"
            value={`${completion.exams_passed}/${completion.exams_total}`}
            done={!completion.missing_requirements.includes('exam')}
          />
        ) : null}
      </View>

      {completion.missing_requirements.length > 0 ? (
        <View style={styles.missing}>
          {completion.missing_requirements.map((req) => (
            <View key={req} style={styles.missingRow}>
              <Ionicons name="ellipse-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.missingText}>{REQUIREMENT_LABELS[req] ?? req}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasCertificate ? (
        <TouchableOpacity style={[styles.primaryBtn, styles.fullBtn]} onPress={onViewCertificate} activeOpacity={0.75}>
          <Ionicons name="ribbon" size={20} color={colors.white} />
          <Text style={styles.primaryBtnText}>View certificate</Text>
        </TouchableOpacity>
      ) : (
      <TouchableOpacity
        style={[styles.primaryBtn, styles.fullBtn, !completion.eligible && styles.disabledBtn]}
        onPress={onIssue}
        disabled={!completion.eligible || issuing}
        activeOpacity={0.75}
      >
        {issuing ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Ionicons name="ribbon-outline" size={20} color={colors.white} />
            <Text style={styles.primaryBtnText}>
              {completion.eligible ? 'Get certificate' : 'Certificate locked'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      )}
    </View>
  );
}

function Indicator({ icon, label, value, done }: { icon: any; label: string; value: string; done: boolean }) {
  return (
    <View style={styles.indicator}>
      <Ionicons name={done ? 'checkmark-circle' : icon} size={20} color={done ? colors.success : colors.textSecondary} />
      <Text style={styles.indicatorValue}>{value}</Text>
      <Text style={styles.indicatorLabel}>{label}</Text>
    </View>
  );
}

const ACCESS_ICONS: Record<AccessState, keyof typeof Ionicons.glyphMap> = {
  available: 'play-circle',
  locked: 'lock-closed',
  expired: 'hourglass-outline',
  not_ready: 'time-outline',
};

/** Combine recording readiness with the server's seven-day access window. */
function lectureAccess(lecture: LearningClass): AccessState {
  if (lecture.video_status !== 'ready') return 'not_ready';
  return lecture.access_state ?? 'available';
}

function RecordedRow({ lecture, onPress }: { lecture: LearningClass; onPress: () => void }) {
  const access = lectureAccess(lecture);
  const playable = access === 'available';
  const duration = Number(lecture.duration_seconds) || 0;
  const watched = Number(lecture.watched_seconds) || 0;
  const pct = duration > 0 ? Math.min(100, Math.round((watched * 100) / duration)) : 0;

  let detail: string;
  if (access === 'not_ready') detail = 'Recording not available yet';
  else if (access === 'locked') detail = 'Locked · complete the previous lecture to unlock';
  else if (access === 'expired') {
    detail = lecture.completed
      ? `Completed · ${lecture.access_days ?? 7}-day viewing window ended`
      : `Viewing window ended ${formatLocalDate(lecture.access_expires_at)} · ask an administrator to reopen it`;
  } else if (lecture.completed) detail = `Completed · ${formatDuration(duration)}`;
  else if (duration > 0) detail = `${pct}% watched · ${formatDuration(duration)}`;
  else detail = 'Ready to watch';

  const icon = lecture.completed ? 'checkmark-circle' : ACCESS_ICONS[access];

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!playable} activeOpacity={0.7}>
      <Ionicons
        name={icon}
        size={32}
        color={lecture.completed ? colors.success : playable ? colors.primary : colors.textMuted}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{lecture.title}</Text>
        <Text style={styles.muted}>{detail}</Text>
        {playable && lecture.access_expires_at ? (
          <Text style={styles.windowText}>Available until {formatLocalDateTime(lecture.access_expires_at)}</Text>
        ) : null}
      </View>
      {playable ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

function LiveRow({ lecture }: { lecture: LearningClass }) {
  const online = lecture.class_type === 'online';
  return (
    <View style={styles.row}>
      <Ionicons name={online ? 'videocam-outline' : 'location-outline'} size={28} color={colors.primary} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{lecture.title}</Text>
        <Text style={styles.muted}>
          {formatLocalTimeRange(lecture.start_time, lecture.end_time)}
          {lecture.duration_minutes && !lecture.end_time ? ` · ${lecture.duration_minutes} min` : ''}
        </Text>
        {!online && lecture.location ? <Text style={styles.muted}>{lecture.location}</Text> : null}
        {lecture.minutes_attended != null ? (
          <Text style={styles.attended}>Attended {Math.round(Number(lecture.minutes_attended))} min</Text>
        ) : null}
      </View>
      {online && lecture.zoom_link ? (
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => Linking.openURL(lecture.zoom_link!).catch(() => Alert.alert('Error', 'Could not open the class link.'))}
          activeOpacity={0.75}
          accessibilityRole="link"
          accessibilityLabel={`Join ${lecture.title}`}
        >
          <Text style={styles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ExamRow({ exam, onPress }: { exam: Exam; onPress: () => void }) {
  const maxAttempts = exam.max_attempts ?? 1;
  const used = Number(exam.attempts_used) || 0;
  const minutes = exam.time_limit_seconds ? Math.round(exam.time_limit_seconds / 60) : null;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="document-text-outline" size={28} color={colors.primary} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{exam.title}</Text>
        <Text style={styles.muted}>
          {exam.question_count} questions{minutes ? ` · ${minutes} min` : ''} · Pass {exam.pass_percentage}%
        </Text>
        <Text style={styles.muted}>Attempts {used}/{maxAttempts}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  calendarBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  retryLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  indicators: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  indicator: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
  },
  indicatorValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  indicatorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  missing: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  attended: {
    fontSize: 13,
    color: colors.success,
    marginTop: 2,
  },
  windowText: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  joinBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  fullBtn: {
    marginTop: spacing.lg,
  },
  disabledBtn: {
    backgroundColor: colors.textMuted,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
