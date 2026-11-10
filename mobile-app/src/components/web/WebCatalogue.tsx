// Browser-only course catalogue (design: "Catalogue.dc.html"): title, filter chips and a grid of course cards.
// Courses carry no category field, so filters come from the title and enrolment; chips with no courses are hidden.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorState, Skeleton, useShimmer } from '@/components/web/states';
import { useLinkBuilder } from '@react-navigation/native';
import { useCourses } from '@/hooks/useCourses';
import { useBillingCatalog } from '@/hooks/useBilling';
import { useWebLayout } from '@/hooks/useWebLayout';
import type { Course } from '@/types/course';
import type { CoursePrice } from '@/types/billing';
import { colors, fonts, palette } from '@/theme/colors';
import { formatPaise } from '@/utils/money';

type PressState = { pressed: boolean; hovered?: boolean };
type Filter = 'all' | 'eng' | 'data' | 'enrolled';

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;

/** Data tracks first ("Data & AI Platform Engineer" is a data track), then AI engineering. */
export function courseCategory(title: string): 'data' | 'eng' | null {
  if (/\b(data|analytics)\b/i.test(title)) return 'data';
  if (/\b(ai|ml|machine learning|agentic|generative|llm)\b/i.test(title)) return 'eng';
  return null;
}

const FILTERS: { id: Filter; label: string; test: (c: Course) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'eng', label: 'AI engineering', test: (c) => courseCategory(c.title) === 'eng' },
  { id: 'data', label: 'Data', test: (c) => courseCategory(c.title) === 'data' },
  { id: 'enrolled', label: 'Enrolled', test: (c) => !!c.learning_access },
];

function highlight(c: Course, re: RegExp) {
  return c.highlights?.find((h) => re.test(h.label))?.value?.trim() || null;
}

export function WebCatalogue({ onCoursePress }: { onCoursePress: (course: Course) => void }) {
  const { wide } = useWebLayout();
  const { data, isLoading, error, refetch, isFetching } = useCourses();
  const { data: prices } = useBillingCatalog();
  const [filter, setFilter] = useState<Filter>('all');

  const all = (Array.isArray(data) ? (data as Course[]) : []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const chips = FILTERS.filter((f) => f.id === 'all' || all.some(f.test));
  const active = chips.find((f) => f.id === filter) ?? chips[0];
  const shown = all.filter(active.test);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]}>
      <View style={{ gap: 10 }}>
        <Text style={styles.h1} role="heading" aria-level={1}>
          Courses
        </Text>
        <Text style={styles.lead}>Pick a role, not a topic. Every track ends with projects that look like the job.</Text>
      </View>

      {isLoading ? (
        <CatalogueSkeleton wide={wide} />
      ) : error ? (
        <ErrorState title="Could not load courses" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : all.length === 0 ? (
        <EmptyState icon="book-outline" title="No courses yet" body="Published career tracks will appear here." />
      ) : (
        <>
          <View style={styles.filterRow}>
            {chips.length > 1
              ? chips.map((f) => {
                  const on = f.id === active.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setFilter(f.id)}
                      accessibilityRole="button"
                      aria-pressed={on}
                      style={(s: PressState) => [styles.chip, on ? styles.chipOn : s.hovered && styles.chipHover]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
                    </Pressable>
                  );
                })
              : null}
            <Text style={styles.count}>
              {shown.length} course{shown.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.grid}>
            {shown.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                index={all.indexOf(c)}
                price={prices?.find((p) => p.id === c.id)}
                wide={wide}
                onPress={() => onCoursePress(c)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function CourseCard({ course, index, price, wide, onPress }: { course: Course; index: number; price?: CoursePrice; wide: boolean; onPress: () => void }) {
  const { buildHref } = useLinkBuilder();
  const href = buildHref('Courses', { screen: 'CourseDetail', params: { courseId: course.id } } as never) ?? undefined;
  const duration = highlight(course, /duration|length|weeks/i);
  const effort = highlight(course, /effort|hours|commitment|time/i);
  const projects = highlight(course, /project/i);
  const modules = course.phases?.length ?? 0;
  const len = [duration, effort].filter(Boolean).join(' · ');
  const build = projects ?? (modules ? `${modules} module${modules === 1 ? '' : 's'}` : null);
  const hasPrice = !!price && price.marked_price_paise > 0;

  return (
    <Pressable
      // A real link: Cmd/Ctrl-click opens the course in a new tab; a plain click stays in the app.
      {...({ href } as any)}
      onPress={(e: any) => {
        if (href && (e?.metaKey || e?.ctrlKey || e?.shiftKey || (e?.button != null && e.button !== 0))) return;
        e?.preventDefault?.();
        onPress();
      }}
      accessibilityRole="link"
      accessibilityLabel={`${course.title}${course.learning_access ? ', enrolled' : ''}`}
      style={(s: PressState) => [styles.card, wide && styles.cardWide, s.hovered && styles.cardHover]}
    >
      {(s: PressState) => (
        <>
          <View style={styles.cardTop}>
            <Text style={styles.idx}>{String(index + 1).padStart(2, '0')}</Text>
            {course.learning_access ? (
              <View style={styles.enrolled}>
                <Text style={styles.enrolledText}>Enrolled</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{course.title}</Text>
          {course.short_description ? (
            <Text style={styles.desc} numberOfLines={3}>
              {course.short_description}
            </Text>
          ) : null}
          {len || build ? (
            <View style={styles.facts}>
              {len ? (
                <View style={styles.fact}>
                  <Ionicons name="time-outline" size={14} color={palette.teal600} />
                  <Text style={styles.factText}>{len}</Text>
                </View>
              ) : null}
              {build ? (
                <View style={styles.fact}>
                  <Ionicons name="hammer-outline" size={14} color={palette.teal600} />
                  <Text style={styles.factText}>{build}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.footer}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {hasPrice ? (
                <>
                  <Text style={styles.price}>{formatPaise(price!.total_paise)}</Text>
                  {price!.discount_paise > 0 ? (
                    <Text style={styles.priceSub}>
                      <Text style={{ textDecorationLine: 'line-through' }}>{formatPaise(price!.marked_price_paise)}</Text> · {Number(price!.discount_percentage)}% off
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.priceSub}>{course.learning_access ? 'Open your course' : 'View course details'}</Text>
              )}
            </View>
            <View style={[styles.arrow, s.hovered && styles.arrowHover]}>
              <Ionicons name="arrow-forward" size={16} color={s.hovered ? '#ffffff' : ink} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

function CatalogueSkeleton({ wide }: { wide: boolean }) {
  const color = useShimmer();
  const sk = (w: number | `${number}%`, h: number) => <Skeleton w={w} h={h} color={color} />;
  return (
    <View style={styles.grid} aria-busy>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <View key={k} style={[styles.card, wide && styles.cardWide, { gap: 14 }]}>
          {sk(24, 12)}
          {sk('75%', 20)}
          {sk('95%', 12)}
          {sk('80%', 12)}
          <View style={[styles.footer, { marginTop: 18 }]}>{sk(90, 20)}</View>
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
  pageContent: { padding: 16, paddingBottom: 96, gap: 28 },
  pageContentWide: { paddingTop: 24 },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },
  lead: { ...text, maxWidth: 620, fontSize: 16, lineHeight: 26, color: body },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff', justifyContent: 'center' },
  chipHover: { borderColor: palette.slate300 },
  chipOn: { backgroundColor: palette.navy800, borderColor: palette.navy800 },
  chipText: { ...text, fontSize: 13, fontWeight: '500', color: palette.slate700 },
  chipTextOn: { color: '#ffffff' },
  count: { ...text, marginLeft: 'auto' as any, fontSize: 13, color: muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    flexGrow: 1,
    flexBasis: 320,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: line,
    borderRadius: 20,
    padding: 28,
    gap: 14,
  },
  // Three columns on desktop; a lone last-row card keeps its column width.
  cardWide: { maxWidth: 'calc((100% - 32px) / 3)' as any, minWidth: 280 },
  cardHover: { borderColor: palette.slate400 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  idx: { ...mono, fontSize: 12, fontWeight: '500', color: muted },
  enrolled: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: palette.teal50 },
  enrolledText: { ...text, fontSize: 12, fontWeight: '600', color: palette.teal700 },
  title: { ...display, fontSize: 21, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2, color: ink },
  desc: { ...text, fontSize: 14, lineHeight: 23, color: body },
  facts: { gap: 6, marginTop: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factText: { ...text, flex: 1, fontSize: 13, color: body },
  footer: { marginTop: 'auto' as any, paddingTop: 18, borderTopWidth: 1, borderTopColor: lineSoft, flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { ...display, fontSize: 20, fontWeight: '700', color: ink },
  priceSub: { ...text, marginTop: 2, fontSize: 12, color: muted },
  arrow: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  arrowHover: { backgroundColor: palette.navy800, borderColor: palette.navy800 },

});
