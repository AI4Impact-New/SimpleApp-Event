// Browser-only course page (design: "Course Detail.dc.html"): dark hero with key facts, then outcomes, curriculum,
// audience and schedule beside a sticky enrol card. Presentational: CourseDetailScreen owns the queries and actions
// (register, interest, demo checkout, calendar), so web and native behave the same.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Spinner } from '@/components/web/Spinner';
import { apiErrorMessage } from '@/services/apiErrors';
import type { Course, CourseClass, CoursePhase } from '@/types/course';
import type { CoursePrice } from '@/types/billing';
import { colors, fonts, palette } from '@/theme/colors';
import { formatLocalTimeRange } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';
import { courseLandingUrl } from '@/utils/courseLanding';

type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const OUTCOME_ICONS: IconName[] = ['layers-outline', 'pulse-outline', 'shield-checkmark-outline', 'rocket-outline', 'analytics-outline', 'git-branch-outline'];

export interface WebCourseDetailProps {
  course?: Course;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onBack: () => void;
  price?: CoursePrice;
  priceError: boolean;
  priceFetching: boolean;
  onRetryPrice: () => void;
  hasAccess: boolean;
  interested: boolean;
  canSelfRegister: boolean;
  onOpenLearning: () => void;
  onRegister: () => void;
  registerPending: boolean;
  onInterest: () => void;
  interestPending: boolean;
  onCheckout: () => void;
  checkoutPending: boolean;
  onAddToCalendar: () => void;
}

/** "View all details": a real link to the course's page on ai4impact.in, opened in a new tab. */
function LandingLink({ course, tone }: { course: Course; tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  return (
    <Pressable
      {...({ href: courseLandingUrl(course), hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } } as any)}
      accessibilityRole="link"
      accessibilityLabel={`View all details for ${course.title} on ai4impact.in (opens in a new tab)`}
      style={(s: PressState) => [dark ? styles.landingDark : styles.landingLight, s.hovered && (dark ? styles.landingDarkHover : styles.landingLightHover)]}
    >
      <Text style={dark ? styles.landingDarkText : styles.landingLightText}>View all details</Text>
      <Ionicons name="open-outline" size={15} color={dark ? palette.textOnDark : ink} />
    </Pressable>
  );
}

export function WebCourseDetail(props: WebCourseDetailProps) {
  const { course, isLoading, error } = props;
  const { wide } = useWebLayout();

  if (error && !course) {
    const status = (error as any)?.response?.status;
    const gone = status === 404 || status === 403;
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <Breadcrumb onBack={props.onBack} light />
        <View style={styles.blank}>
          <View style={styles.blankIcon}>
            <Ionicons name={gone ? 'alert-circle-outline' : 'cloud-offline-outline'} size={18} color={gone ? body : '#b4321f'} />
          </View>
          <Text style={styles.blankTitle}>{gone ? 'This course is not available' : 'Could not load this course'}</Text>
          <Text style={styles.blankBody}>{gone ? 'It may have been unpublished. Browse other courses instead.' : apiErrorMessage(error, 'Check your connection and try again.')}</Text>
          <Pressable onPress={gone ? props.onBack : props.onRetry} style={(s: PressState) => [styles.btnPrimary, styles.btnSm, s.hovered && styles.btnPrimaryHover]}>
            <Text style={styles.btnPrimaryText}>{gone ? 'Back to courses' : 'Try again'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (isLoading || !course) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} aria-busy>
        <View style={[styles.hero, { minHeight: 260, justifyContent: 'center', alignItems: 'flex-start' }]}>
          <Spinner size={22} label="Loading course" />
        </View>
      </ScrollView>
    );
  }

  const highlights = (course.highlights ?? []).slice(0, 4);
  const phases = course.phases ?? [];
  const benefits = course.benefits ?? [];
  const audience = course.audience ?? [];
  const outcomes = course.career_outcomes ?? [];
  const classes = course.classes ?? [];
  const recorded = classes.filter((c) => c.class_type === 'recorded').length;
  const live = classes.filter((c) => c.class_type !== 'recorded');
  const curriculumMeta = [
    phases.length ? `${phases.length} module${phases.length === 1 ? '' : 's'}` : null,
    recorded ? `${recorded} recorded lecture${recorded === 1 ? '' : 's'}` : null,
    live.length ? `${live.length} live class${live.length === 1 ? '' : 'es'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={[styles.hero, wide && styles.heroWide]}>
        <Breadcrumb onBack={props.onBack} title={course.title} />
        <Text style={[styles.h1, !wide && styles.h1Narrow]} role="heading" aria-level={1}>
          {course.title}
        </Text>
        {course.short_description ? <Text style={styles.lead}>{course.short_description}</Text> : null}
        {highlights.length > 0 ? (
          <View style={styles.facts}>
            {highlights.map((h) => (
              <View key={h.id ?? h.label}>
                <Text style={styles.factLabel}>{h.label}</Text>
                <Text style={styles.factValue}>{h.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <LandingLink course={course} tone="dark" />
        </View>
      </View>

      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={styles.main}>
          {course.full_description ? (
            <Section title="About this course">
              <Text style={styles.prose}>{course.full_description}</Text>
            </Section>
          ) : null}

          {benefits.length > 0 ? (
            <Section title="What you get">
              <View style={[styles.card, styles.cellGrid]}>
                {benefits.map((b, i) => (
                  <View key={b.id ?? i} style={styles.cell}>
                    <Ionicons name={OUTCOME_ICONS[i % OUTCOME_ICONS.length]} size={18} color={palette.teal600} />
                    <Text style={styles.cellTitle}>{b.title}</Text>
                    {b.description ? <Text style={styles.cellBody}>{b.description}</Text> : null}
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {phases.length > 0 ? (
            <Section title="Curriculum" aside={curriculumMeta}>
              <Curriculum phases={phases} />
            </Section>
          ) : null}

          {audience.length > 0 ? (
            <Section title="Who it is for">
              <View style={styles.tileGrid}>
                {audience.map((a, i) => (
                  <View key={a.id ?? i} style={styles.tileCard}>
                    <Text style={styles.cellTitle}>{a.title}</Text>
                    {a.description ? <Text style={styles.cellBody}>{a.description}</Text> : null}
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {outcomes.length > 0 ? (
            <Section title="Career outcomes">
              <View style={[styles.card, { padding: 24, gap: 12 }]}>
                {outcomes.map((o, i) => (
                  <View key={o.id ?? i} style={styles.checkRow}>
                    <Ionicons name="checkmark" size={15} color={palette.teal600} style={{ marginTop: 3 }} />
                    <Text style={styles.checkText}>{o.text}</Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {live.length > 0 ? (
            <Section title="Live class schedule">
              <View style={styles.card}>
                {live.map((c, i) => (
                  <ScheduleRow key={c.id ?? i} item={c} last={i === live.length - 1} />
                ))}
              </View>
              {props.hasAccess ? (
                <Pressable onPress={props.onAddToCalendar} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
                  <Ionicons name="calendar-outline" size={15} color={ink} />
                  <Text style={styles.btnOutlineText}>Add to calendar (.ics)</Text>
                </Pressable>
              ) : null}
            </Section>
          ) : null}

          <Text style={styles.footnote}>Professional certificates are not academic degrees. Career support does not guarantee employment.</Text>
        </View>

        <EnrolCard {...props} course={course} recorded={recorded} liveCount={live.length} wide={wide} />
      </View>
    </ScrollView>
  );
}

function Breadcrumb({ onBack, title, light }: { onBack: () => void; title?: string; light?: boolean }) {
  return (
    <View style={styles.crumbs}>
      <Pressable onPress={onBack} accessibilityRole="link">
        {(s: PressState) => <Text style={[light ? styles.crumbLinkLight : styles.crumbLink, s.hovered && { color: light ? colors.primary : palette.textOnDark }]}>Courses</Text>}
      </Pressable>
      {title ? (
        <>
          <Ionicons name="chevron-forward" size={13} color="#7e8797" />
          <Text style={styles.crumbHere} numberOfLines={1}>
            {title}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.h2} role="heading" aria-level={2}>
          {title}
        </Text>
        {aside ? <Text style={styles.sectionAside}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Curriculum({ phases }: { phases: CoursePhase[] }) {
  const [open, setOpen] = useState(0);
  return (
    <View style={styles.card}>
      {phases.map((p, i) => {
        const items = p.phase_items ?? [];
        const isOpen = open === i;
        return (
          <View key={p.id ?? i} style={i < phases.length - 1 && styles.divider}>
            <Pressable
              onPress={() => setOpen(isOpen ? -1 : i)}
              accessibilityRole="button"
              aria-expanded={isOpen}
              style={(s: PressState) => [styles.modRow, s.hovered && { backgroundColor: palette.slate50 }]}
            >
              <Text style={styles.modIdx}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.modTitle}>{p.title}</Text>
                {p.subtitle ? <Text style={styles.modSub}>{p.subtitle}</Text> : null}
              </View>
              {items.length ? <Text style={styles.modMeta}>{items.length} topic{items.length === 1 ? '' : 's'}</Text> : null}
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={muted} />
            </Pressable>
            {isOpen && items.length > 0 ? (
              <View style={styles.lessons}>
                {items.map((it, j) => (
                  <View key={it.id ?? j} style={styles.lesson}>
                    <Ionicons name="play-circle-outline" size={14} color={palette.slate400} style={{ marginTop: 3 }} />
                    <Text style={styles.lessonText}>{it.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function ScheduleRow({ item, last }: { item: CourseClass; last: boolean }) {
  return (
    <View style={[styles.schedRow, !last && styles.divider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.schedTitle}>{item.title}</Text>
        <Text style={styles.schedMeta}>
          {item.start_time ? formatLocalTimeRange(item.start_time, item.end_time) : 'Time to be announced'}
          {item.class_type === 'in_person' && item.location ? ` · ${item.location}` : ''}
        </Text>
      </View>
      <Text style={styles.schedType}>{item.class_type === 'in_person' ? 'In person' : item.class_type === 'online' ? 'Online' : item.class_type.replace('_', ' ')}</Text>
    </View>
  );
}

function EnrolCard(props: WebCourseDetailProps & { course: Course; recorded: number; liveCount: number; wide: boolean }) {
  const { course, price, hasAccess, interested } = props;
  const includes = [
    props.recorded ? `${props.recorded} recorded lecture${props.recorded === 1 ? '' : 's'}` : null,
    props.liveCount ? `${props.liveCount} live class${props.liveCount === 1 ? '' : 'es'} with trainers` : null,
    course.phases?.length ? `${course.phases.length}-module curriculum` : null,
    course.certificate?.title || course.certificate?.provider ? course.certificate?.title || 'Professional certificate' : null,
  ].filter(Boolean) as string[];
  const hasPrice = !!price && price.marked_price_paise > 0;

  return (
    <View style={[styles.aside, props.wide && styles.asideWide]}>
      <View style={{ padding: 24, gap: 18 }}>
        {hasAccess ? (
          <View style={{ gap: 12 }}>
            <View style={styles.okBadge}>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            </View>
            <Text style={styles.asideTitle}>You are enrolled.</Text>
            <Text style={styles.asideBody}>Lectures, live classes and assessments are in your course workspace.</Text>
          </View>
        ) : hasPrice ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Text style={styles.price}>{formatPaise(price!.total_paise)}</Text>
              {price!.discount_paise > 0 ? (
                <>
                  <Text style={styles.priceMarked}>{formatPaise(price!.marked_price_paise)}</Text>
                  <Text style={styles.priceOff}>{Number(price!.discount_percentage)}% off</Text>
                </>
              ) : null}
            </View>
            <Text style={styles.priceNote}>Pay securely with Razorpay. Test checkout is currently restricted to authorized QA accounts.</Text>
          </View>
        ) : props.priceError ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.asideBody}>Could not load the course fee.</Text>
            <Pressable onPress={props.onRetryPrice} disabled={props.priceFetching} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
              <Text style={styles.btnOutlineText}>{props.priceFetching ? 'Retrying…' : 'Retry'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {hasAccess ? (
            <BigButton label="Go to course" icon="arrow-forward" onPress={props.onOpenLearning} />
          ) : (
            <>
              {props.canSelfRegister ? <BigButton label="Register for this course" icon="arrow-forward" onPress={props.onRegister} busy={props.registerPending} /> : null}
              {hasPrice ? (
                <BigButton
                  label="Checkout"
                  icon="card-outline"
                  onPress={props.onCheckout}
                  busy={props.checkoutPending}
                  variant={props.canSelfRegister ? 'outline' : 'primary'}
                />
              ) : null}
              {interested ? (
                <View style={styles.interested}>
                  <Ionicons name="heart" size={16} color={palette.teal700} />
                  <Text style={styles.interestedText}>Interested. We will be in touch.</Text>
                </View>
              ) : (
                <BigButton label="I'm interested" icon="heart-outline" onPress={props.onInterest} busy={props.interestPending} variant="outline" />
              )}
              {!props.canSelfRegister ? <Text style={styles.priceNote}>The AI4Impact team enrols learners. Choose I'm interested and we will contact you.</Text> : null}
            </>
          )}
          <LandingLink course={course} tone="light" />
        </View>

        {includes.length > 0 ? (
          <View style={styles.includes}>
            {includes.map((t) => (
              <View key={t} style={styles.checkRow}>
                <Ionicons name="checkmark" size={14} color={palette.teal600} style={{ marginTop: 2 }} />
                <Text style={styles.includeText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function BigButton({ label, icon, onPress, busy, variant = 'primary' }: { label: string; icon: IconName; onPress: () => void; busy?: boolean; variant?: 'primary' | 'outline' }) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={(s: PressState) => [primary ? styles.bigPrimary : styles.bigOutline, s.hovered && (primary ? styles.btnPrimaryHover : styles.btnOutlineHover)]}
    >
      {busy ? <Spinner size={16} track={primary ? '#2a3654' : palette.slate200} head={primary ? palette.teal400 : palette.teal600} /> : null}
      <Text style={primary ? styles.bigPrimaryText : styles.bigOutlineText}>{label}</Text>
      {!busy ? <Ionicons name={icon} size={16} color={primary ? '#ffffff' : ink} /> : null}
    </Pressable>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 40 },

  hero: { backgroundColor: palette.navy900, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, gap: 18 },
  heroWide: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  crumbLink: { ...text, fontSize: 13, color: palette.textOnDarkBody },
  crumbLinkLight: { ...text, fontSize: 13, color: body },
  crumbHere: { ...text, fontSize: 13, color: '#7e8797', flexShrink: 1 },
  h1: { ...display, maxWidth: 760, fontSize: 52, lineHeight: 53, fontWeight: '700', letterSpacing: -1.8, color: palette.textOnDark },
  h1Narrow: { fontSize: 34, lineHeight: 37, letterSpacing: -1 },
  lead: { ...text, maxWidth: 640, fontSize: 18, lineHeight: 30, color: palette.textOnDarkBody },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 32, rowGap: 16, marginTop: 8 },
  factLabel: { ...text, fontSize: 12, color: '#7e8797' },
  factValue: { ...text, marginTop: 4, fontSize: 14, color: palette.textOnDark },

  landingDark: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#2b3858', backgroundColor: palette.navy750 },
  landingDarkHover: { borderColor: '#3a4868', backgroundColor: palette.navy700 },
  landingDarkText: { ...text, fontSize: 14, fontWeight: '600', color: palette.textOnDark },
  landingLight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 8 },
  landingLightHover: { backgroundColor: palette.slate100 },
  landingLightText: { ...text, fontSize: 14, fontWeight: '600', color: ink, textDecorationLine: 'underline' },

  body: { gap: 40 },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 48 },
  main: { flex: 1, minWidth: 0, gap: 48 },
  section: { gap: 16 },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  h2: { ...display, fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.48, color: ink },
  sectionAside: { ...text, fontSize: 13, color: muted },
  prose: { ...text, fontSize: 15, lineHeight: 26, color: palette.slate700, maxWidth: 760 },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  cellGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexGrow: 1, flexBasis: 220, padding: 24, gap: 10, borderRightWidth: 1, borderRightColor: lineSoft, borderBottomWidth: 1, borderBottomColor: lineSoft, marginRight: -1, marginBottom: -1 },
  cellTitle: { ...display, fontSize: 16, fontWeight: '600', color: ink },
  cellBody: { ...text, fontSize: 14, lineHeight: 22, color: body },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tileCard: { flexGrow: 1, flexBasis: 240, backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, padding: 20, gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { ...text, flex: 1, fontSize: 14, lineHeight: 22, color: palette.slate700 },

  modRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 24 },
  modIdx: { ...mono, width: 24, fontSize: 12, fontWeight: '500', color: muted },
  modTitle: { ...display, fontSize: 16, fontWeight: '600', color: ink },
  modSub: { ...text, marginTop: 2, fontSize: 13, color: muted },
  modMeta: { ...text, fontSize: 13, color: muted },
  lessons: { paddingLeft: 64, paddingRight: 24, paddingBottom: 18, gap: 10 },
  lesson: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lessonText: { ...text, flex: 1, fontSize: 14, lineHeight: 21, color: body },

  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  schedTitle: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  schedMeta: { ...text, marginTop: 3, fontSize: 13, color: muted },
  schedType: { ...text, fontSize: 13, fontWeight: '500', color: body, textTransform: 'capitalize' },
  footnote: { ...text, fontSize: 12, lineHeight: 19, color: muted },

  aside: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  asideWide: { width: 380, flexShrink: 0, position: 'sticky' as any, top: 24 },
  asideTitle: { ...display, fontSize: 22, fontWeight: '700', color: ink },
  asideBody: { ...text, fontSize: 14, lineHeight: 22, color: body },
  okBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.teal600, alignItems: 'center', justifyContent: 'center' },
  price: { ...display, fontSize: 32, lineHeight: 34, fontWeight: '700', letterSpacing: -0.64, color: ink },
  priceMarked: { ...text, fontSize: 15, color: muted, textDecorationLine: 'line-through' },
  priceOff: { ...text, fontSize: 13, fontWeight: '600', color: palette.teal600 },
  priceNote: { ...text, marginTop: 6, fontSize: 12, lineHeight: 18, color: muted },
  interested: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 8, backgroundColor: palette.teal50 },
  interestedText: { ...text, fontSize: 14, fontWeight: '600', color: palette.teal700 },
  includes: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: lineSoft },
  includeText: { ...text, flex: 1, fontSize: 13, lineHeight: 19, color: body },

  bigPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 8, backgroundColor: palette.navy800 },
  bigPrimaryText: { ...text, fontSize: 15, fontWeight: '600', color: '#ffffff' },
  bigOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 8, borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },
  bigOutlineText: { ...text, fontSize: 15, fontWeight: '600', color: ink },

  blank: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  blankBody: { ...text, fontSize: 14, lineHeight: 22, color: body },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnSm: { height: 36, paddingHorizontal: 14 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnOutline: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderWidth: 1, borderColor: line, borderRadius: 8, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300 },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '500', color: ink },
});
