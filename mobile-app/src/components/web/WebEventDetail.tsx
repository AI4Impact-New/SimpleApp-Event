// Browser event page (design: "Event Detail.dc.html"): event facts and description, a join card, the event's polls
// answered in place, its first materials and the top of its leaderboard. Attendance comes from the server
// (attendance list), never from local state, so a reload or a second tab shows the same joined state.
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent, useEventAnalytics, useJoinEvent } from '@/hooks/useEvents';
import { usePolls } from '@/hooks/usePolls';
import { useMaterials } from '@/hooks/useMaterials';
import { useWebLayout } from '@/hooks/useWebLayout';
import { apiErrorMessage } from '@/services/apiErrors';
import { Button, EmptyState, ErrorState, InlineError, Skeleton, SkeletonCard, StateCard, useShimmer } from '@/components/web/states';
import {
  BoardRows,
  Crumb,
  POINTS,
  STATUS_LABEL,
  eventText,
  ink,
  line,
  lineSoft,
  longDay,
  muted,
  useAttendance,
  useMyUserId,
  when,
  where,
  type Ranked,
} from '@/components/web/eventParts';
import { PollPanel } from '@/components/web/WebPoll';
import { MaterialRows, materialsOf, useMaterialDownload } from '@/components/web/WebEventMaterials';
import type { Event } from '@/types/event';
import type { Poll } from '@/types/poll';
import { colors, palette } from '@/theme/colors';

const { text, display } = eventText;
const MATERIALS_PREVIEW = 3;
const BOARD_PREVIEW = 5;
const POLL_ORDER: Record<Poll['status'], number> = { active: 0, closed: 1, draft: 2 };
const TYPE_LABEL: Record<Event['event_type'], string> = { offline: 'In person', online: 'Online', hybrid: 'Hybrid' };

export interface WebEventDetailProps {
  eventId: string;
  onBack: () => void;
  onOpenPoll: (pollId: string) => void;
  onOpenMaterials: () => void;
  onOpenLeaderboard: () => void;
}

export function WebEventDetail({ eventId, onBack, onOpenPoll, onOpenMaterials, onOpenLeaderboard }: WebEventDetailProps) {
  const { wide } = useWebLayout();
  const { data: event, isLoading, error, refetch, isFetching } = useEvent(eventId);
  const attendance = useAttendance();
  const joined = (attendance.data ?? []).some((a) => a.event_id === eventId);
  const status = (error as any)?.response?.status;

  if (isLoading) return <DetailSkeleton wide={wide} />;
  if (status === 401 || status === 403 || status === 404 || (!error && !event)) {
    return (
      <Page wide={wide}>
        <Crumb label="Events" onPress={onBack} />
        <StateCard
          centered
          icon={status === 404 || !status ? 'calendar-clear-outline' : 'lock-closed-outline'}
          title={status === 404 || !status ? 'Event not found' : 'You do not have access to this event'}
          body={status === 404 || !status ? 'It may have been removed, or the link is incomplete.' : 'This event is private. Ask your host for its code and join from the events page.'}
          secondary={{ label: 'Back to events', onPress: onBack }}
        />
      </Page>
    );
  }
  if (error) {
    return (
      <Page wide={wide}>
        <Crumb label="Events" onPress={onBack} />
        <ErrorState centered title="Could not load this event" error={error} onRetry={() => refetch()} retrying={isFetching} />
      </Page>
    );
  }

  const ev = event as Event;
  const statusLabel = STATUS_LABEL[ev.status] ?? STATUS_LABEL.published;

  return (
    <Page wide={wide}>
      <View style={{ gap: 14 }}>
        <Crumb label="Events" onPress={onBack} current={ev.name} />
        <View style={styles.statusRow}>
          {ev.status === 'ongoing' ? <View style={styles.liveDot} /> : null}
          <Text style={[styles.statusText, { color: statusLabel.color }]}>{statusLabel.text}</Text>
        </View>
        <Text style={styles.h1} role="heading" aria-level={1}>
          {ev.name}
        </Text>
      </View>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.main, wide && styles.mainWide]}>
          <View style={[styles.card, styles.facts, !wide && styles.factsNarrow]}>
            <Fact icon="calendar-outline" label="When" value={longDay(ev)} sub={when(ev)} wide={wide} />
            <Fact icon="location-outline" label="Where" value={where(ev)} divider wide={wide} />
            <Fact icon="pricetag-outline" label="Format" value={TYPE_LABEL[ev.event_type] ?? '—'} divider wide={wide} />
          </View>
          {!wide ? <JoinCard eventId={eventId} event={ev} joined={joined} checking={attendance.isLoading} /> : null}
          {ev.description ? (
            <Section title="About this event">
              <Text style={styles.description}>{ev.description}</Text>
            </Section>
          ) : null}
          <PollsSection eventId={eventId} onOpenPoll={onOpenPoll} />
          <MaterialsSection eventId={eventId} joined={joined} wide={wide} onOpenMaterials={onOpenMaterials} />
        </View>

        <View style={[styles.aside, wide && styles.asideWide]}>
          {wide ? <JoinCard eventId={eventId} event={ev} joined={joined} checking={attendance.isLoading} /> : null}
          <LeaderboardPreview eventId={eventId} onOpenLeaderboard={onOpenLeaderboard} />
        </View>
      </View>
    </Page>
  );
}

function Page({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && { paddingTop: 24 }]}>
      {children}
    </ScrollView>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.h2} role="heading" aria-level={2}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Fact({ icon, label, value, sub, divider, wide }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub?: string; divider?: boolean; wide: boolean }) {
  return (
    <View style={[styles.fact, wide && styles.factWide, divider && (wide ? styles.factDivider : styles.factDividerNarrow)]}>
      <View style={styles.factLabelRow}>
        <Ionicons name={icon} size={14} color={muted} />
        <Text style={styles.factLabel}>{label}</Text>
      </View>
      <Text style={styles.factValue}>{value}</Text>
      {sub ? <Text style={styles.factSub}>{sub}</Text> : null}
    </View>
  );
}

function JoinCard({ eventId, event, joined, checking }: { eventId: string; event: Event; joined: boolean; checking: boolean }) {
  const queryClient = useQueryClient();
  const join = useJoinEvent();
  const [error, setError] = React.useState<string | null>(null);
  const shimmer = useShimmer();
  const closed = event.status === 'completed' || event.status === 'cancelled';

  const submit = async () => {
    setError(null);
    try {
      await join.mutateAsync(eventId);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message ?? err?.response?.data?.error ?? '');
      if (!/already (joined|checked into)/i.test(msg)) {
        setError(apiErrorMessage(err, 'Could not join this event. Try again.'));
        return;
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['events', eventId, 'analytics'] });
  };

  return (
    <View style={[styles.card, styles.join]}>
      {checking ? (
        <Skeleton w="70%" h={16} color={shimmer} />
      ) : joined ? (
        <>
          <View style={styles.joinedRow}>
            <Ionicons name="checkmark-circle" size={20} color={palette.teal600} />
            <Text style={styles.joinTitle}>You are attending</Text>
          </View>
          <Text style={styles.joinBody}>Answer polls and download materials to climb this event's leaderboard.</Text>
        </>
      ) : closed ? (
        <>
          <Text style={styles.joinTitle}>{event.status === 'cancelled' ? 'This event was cancelled' : 'This event has ended'}</Text>
          <Text style={styles.joinBody}>Joining is closed.</Text>
        </>
      ) : (
        <>
          <Text style={styles.joinTitle}>Join this event</Text>
          <Text style={styles.joinBody}>Joining checks you in, unlocks polls and materials, and adds {POINTS.join} points to your score.</Text>
          <Button block label="Join event" loadingLabel="Joining…" loading={join.isPending} onPress={submit} />
          <InlineError message={error} />
        </>
      )}
    </View>
  );
}

function PollsSection({ eventId, onOpenPoll }: { eventId: string; onOpenPoll: (pollId: string) => void }) {
  const { data, isLoading, error, refetch, isFetching } = usePolls(eventId);
  const polls = ((Array.isArray(data) ? data : []) as Poll[])
    .filter((p) => p.status !== 'draft')
    .sort((a, b) => POLL_ORDER[a.status] - POLL_ORDER[b.status]);

  return (
    <Section title="Polls" action={polls.length > 0 ? <Text style={styles.sectionNote}>{polls.filter((p) => p.status === 'active').length} open</Text> : undefined}>
      {isLoading ? (
        <SkeletonCard rows={[[70, 20], ['75%', 20], ['100%', 44], ['100%', 44]]} />
      ) : error ? (
        <ErrorState title="Could not load polls" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : polls.length === 0 ? (
        <EmptyState icon="bar-chart-outline" title="No polls yet" body="When your host opens a poll it appears here. Answer it to earn points." />
      ) : (
        polls.map((p) => <PollPanel key={p.id} poll={p} onOpen={() => onOpenPoll(p.id)} />)
      )}
    </Section>
  );
}

function MaterialsSection({ eventId, joined, wide, onOpenMaterials }: { eventId: string; joined: boolean; wide: boolean; onOpenMaterials: () => void }) {
  const { data, isLoading, error, refetch, isFetching } = useMaterials(eventId);
  const dl = useMaterialDownload(eventId);
  const materials = materialsOf(data);
  const more = materials.length > MATERIALS_PREVIEW;

  return (
    <Section
      title="Materials"
      action={materials.length > 0 ? <Button size="sm" variant="ghost" label={more ? `View all ${materials.length}` : 'Open materials'} onPress={onOpenMaterials} /> : undefined}
    >
      {isLoading ? (
        <SkeletonCard rows={[['55%', 14], ['30%', 10]]} />
      ) : error ? (
        <ErrorState title="Could not load materials" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : materials.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No materials yet" body="Slides and handouts your host shares will appear here." />
      ) : (
        <MaterialRows materials={materials.slice(0, MATERIALS_PREVIEW)} dl={dl} joined={joined} wide={wide} />
      )}
    </Section>
  );
}

function LeaderboardPreview({ eventId, onOpenLeaderboard }: { eventId: string; onOpenLeaderboard: () => void }) {
  const { data: analytics, isLoading } = useEventAnalytics(eventId);
  const meId = useMyUserId();
  const top = ((analytics?.top_students ?? []) as Ranked[]).slice(0, BOARD_PREVIEW);
  const shimmer = useShimmer();

  return (
    <Section title="Leaderboard" action={<Button size="sm" variant="ghost" label="Full board" onPress={onOpenLeaderboard} />}>
      <View style={styles.card}>
        {isLoading ? (
          <View style={{ padding: 20, gap: 14 }} aria-busy>
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} w="85%" h={14} color={shimmer} />
            ))}
          </View>
        ) : top.length === 0 ? (
          <Text style={styles.note}>Rankings appear once attendees start taking part.</Text>
        ) : (
          <BoardRows students={top} meId={meId} dense />
        )}
        {typeof analytics?.attendance_count === 'number' && analytics.attendance_count > 0 ? (
          <Text style={[styles.note, styles.noteTop]}>
            {analytics.attendance_count} {analytics.attendance_count === 1 ? 'attendee' : 'attendees'} so far
          </Text>
        ) : null}
      </View>
    </Section>
  );
}

function DetailSkeleton({ wide }: { wide: boolean }) {
  const color = useShimmer();
  return (
    <Page wide={wide}>
      <View style={{ gap: 14 }} aria-busy>
        <Skeleton w={160} h={12} color={color} />
        <Skeleton w={wide ? '45%' : '80%'} h={34} color={color} />
      </View>
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.main, wide && styles.mainWide]}>
          <SkeletonCard rows={[['40%', 12], ['70%', 18], ['30%', 12]]} />
          <SkeletonCard rows={[[70, 20], ['75%', 20], ['100%', 44], ['100%', 44]]} />
        </View>
        <View style={[styles.aside, wide && styles.asideWide]}>
          <SkeletonCard rows={[['60%', 18], ['90%', 12], ['100%', 40]]} />
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 28 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.teal500 },
  statusText: { ...text, fontSize: 13, fontWeight: '600' },
  h1: { ...display, fontSize: 36, lineHeight: 41, fontWeight: '700', letterSpacing: -0.9, color: ink },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44, color: ink },

  columns: { gap: 28 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { gap: 32 },
  mainWide: { flex: 1, minWidth: 0 },
  aside: { gap: 28 },
  asideWide: { width: 340, flexShrink: 0 },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  facts: { flexDirection: 'row' },
  factsNarrow: { flexDirection: 'column' },
  fact: { paddingVertical: 16, paddingHorizontal: 20, gap: 4 },
  factWide: { flex: 1, paddingVertical: 18 },
  factDivider: { borderLeftWidth: 1, borderLeftColor: lineSoft },
  factDividerNarrow: { borderTopWidth: 1, borderTopColor: lineSoft },
  factLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factLabel: { ...text, fontSize: 12, color: muted },
  factValue: { ...text, marginTop: 4, fontSize: 15, fontWeight: '600', color: ink },
  factSub: { ...text, fontSize: 13, color: muted },

  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionNote: { ...text, fontSize: 13, color: muted },
  description: { ...text, fontSize: 15, lineHeight: 25, color: palette.slate600 },

  join: { padding: 24, gap: 12 },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  joinTitle: { ...display, fontSize: 18, fontWeight: '600', color: ink },
  joinBody: { ...text, fontSize: 14, lineHeight: 21, color: palette.slate600 },

  note: { ...text, padding: 20, fontSize: 13, lineHeight: 19, color: muted },
  noteTop: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: lineSoft },
});
