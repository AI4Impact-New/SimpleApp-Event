// Course Detail Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCourse, useRegisterCourse, useMarkCourseInterest } from '@/hooks/useCourses';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { api } from '@/services/api';
import type { CoursePhase, CourseClass } from '@/types/course';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  android: {
    elevation: 2,
  },
});

interface CourseDetailScreenProps {
  courseId: string;
  onBack: () => void;
  onOpenLearning: (courseId: string) => void;
}

export function CourseDetailScreen({ courseId, onBack, onOpenLearning }: CourseDetailScreenProps) {
  const { data: course, isLoading, error, refetch, isRefetching } = useCourse(courseId);
  const registerCourse = useRegisterCourse();
  const markInterest = useMarkCourseInterest();
  const [registered, setRegistered] = useState(false);
  const [interested, setInterested] = useState(false);

  const handleRegister = async () => {
    try {
      await registerCourse.mutateAsync(courseId);
      setRegistered(true);
      Alert.alert('Registered', 'You now have access to this course.', [
        { text: 'Open course', onPress: () => onOpenLearning(courseId) },
        { text: 'Later' },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to register for course.';
      Alert.alert('Error', msg);
    }
  };

  const handleInterest = async () => {
    try {
      await markInterest.mutateAsync(courseId);
      setInterested(true);
      Alert.alert('Done', "You're marked as interested. We'll be in touch.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to mark interest.';
      Alert.alert('Error', msg);
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const ics = await api.getCourseCalendarIcs(courseId);
      await Share.share({
        message: ics,
        title: `${course?.title ?? 'Course'} schedule`,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not load calendar. Try again later.');
    }
  };

  if (isLoading || !course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Failed to load course.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const highlights = course.highlights ?? [];
  const phases = course.phases ?? [];
  const benefits = course.benefits ?? [];
  const audience = course.audience ?? [];
  const careerOutcomes = course.career_outcomes ?? [];
  const certificate = course.certificate;
  const hasAccess = !!course.learning_access || registered;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {(course.short_description || course.full_description) && (
          <View style={styles.introBlock}>
            {course.short_description ? (
              <Text style={styles.shortDesc}>{course.short_description}</Text>
            ) : null}
            {course.full_description ? (
              <Text style={styles.fullDesc}>{course.full_description}</Text>
            ) : null}
          </View>
        )}

        {highlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.highlightGrid}>
              {highlights.map((h: { label: string; value: string }, i: number) => (
                <View key={i} style={styles.highlightItem}>
                  <Text style={styles.highlightLabel}>{h.label}</Text>
                  <Text style={styles.highlightValue}>{h.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {phases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phases / Modules</Text>
            {phases.map((phase: CoursePhase, i: number) => (
              <View key={phase.id ?? i} style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>{phase.title}</Text>
                {phase.subtitle ? <Text style={styles.phaseSubtitle}>{phase.subtitle}</Text> : null}
                {phase.phase_items && phase.phase_items.length > 0 && (
                  <View style={styles.phaseItems}>
                    {phase.phase_items.map((item: { text: string }, j: number) => (
                      <Text key={j} style={styles.phaseItemText}>• {item.text}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <View style={styles.benefitsCard}>
              {benefits.map((b: { title: string; description?: string }, i: number) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bulletTitle}>{b.title}</Text>
                  {b.description ? <Text style={styles.bulletDesc}>{b.description}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {audience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who should attend</Text>
            <View style={styles.benefitsCard}>
              {audience.map((a: { title: string; description?: string }, i: number) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bulletTitle}>{a.title}</Text>
                  {a.description ? <Text style={styles.bulletDesc}>{a.description}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {careerOutcomes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Career outcomes</Text>
            <View style={styles.outcomesCard}>
              {careerOutcomes.map((c: { text: string }, i: number) => (
                <Text key={i} style={styles.bulletText}>• {c.text}</Text>
              ))}
            </View>
          </View>
        )}

        {certificate && (certificate.title || certificate.provider) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certificate</Text>
            <View style={styles.certCard}>
              {certificate.title ? <Text style={styles.bulletTitle}>{certificate.title}</Text> : null}
              {certificate.provider ? <Text style={styles.bulletDesc}>Provider: {certificate.provider}</Text> : null}
            </View>
          </View>
        )}

        {(course as any).classes?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Class schedule</Text>
            <View style={styles.benefitsCard}>
              {((course as any).classes as CourseClass[]).map((cl: CourseClass, i: number) => (
                <View key={cl.id ?? i} style={[styles.bulletItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: cl.class_type === 'recorded' ? '#e9d5ff' : cl.class_type === 'online' ? '#dbeafe' : '#fef3c7',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                        {cl.class_type.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.bulletTitle}>{cl.title}</Text>
                    {cl.duration_minutes != null && (
                      <Text style={[styles.bulletDesc, { marginLeft: 4 }]}>{cl.duration_minutes} min</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.registerBtn, { marginTop: 12, backgroundColor: colors.border }]}
              onPress={handleAddToCalendar}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.registerBtnText, { color: colors.text }]}>Add to Calendar (.ics)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.registerSection}>
          {hasAccess ? (
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => onOpenLearning(courseId)}
              activeOpacity={0.75}
            >
              <Ionicons name="play-circle-outline" size={22} color={colors.white} />
              <Text style={styles.registerBtnText}>Open course</Text>
            </TouchableOpacity>
          ) : interested ? (
            <View style={[styles.registerBtn, styles.registeredBtn, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="heart" size={22} color="#1d4ed8" />
              <Text style={[styles.registeredText, { color: '#1d4ed8' }]}>Interested – we&apos;ll be in touch</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.registerBtn, { marginBottom: 10 }]}
                onPress={handleRegister}
                disabled={registerCourse.isPending}
                activeOpacity={0.75}
              >
                {registerCourse.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="book-outline" size={22} color={colors.white} />
                    <Text style={styles.registerBtnText}>Register to this course</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.registerBtn, { backgroundColor: colors.border }]}
                onPress={handleInterest}
                disabled={markInterest.isPending}
                activeOpacity={0.75}
              >
                {markInterest.isPending ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="heart-outline" size={22} color={colors.text} />
                    <Text style={[styles.registerBtnText, { color: colors.text }]}>I&apos;m Interested</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  introBlock: {
    marginBottom: spacing.xl,
  },
  shortDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  fullDesc: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  highlightItem: {
    minWidth: '45%',
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  highlightLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  highlightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  phaseCard: {
    padding: spacing.lg,
    paddingLeft: spacing.lg + 2,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  phaseSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  phaseItems: {
    marginTop: spacing.md,
    paddingLeft: spacing.xs,
  },
  phaseItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  benefitsCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  outcomesCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  certCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  bulletItem: {
    marginBottom: spacing.md,
  },
  bulletTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  bulletDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  registerSection: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl + 2,
    ...cardShadow,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  registeredBtn: {
    backgroundColor: colors.successBg,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  registeredText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
});
