// Browser leaderboards (design: "Leaderboards.dc.html"): events the learner joined on the left, the selected
// event's full board on the right. Narrow browsers show one pane at a time (list, then board).
// Rankings and scores come from the event analytics endpoint; the client only orders what it is given.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEventAnalytics, useEvents } from '@/hooks/useEvents';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Button, EmptyState, ErrorState, Skeleton, SkeletonList, useShimmer } from '@/components/web/states';
import {
  BoardRows,
  Crumb,
  DateTile,
  POINTS,
  STATUS_LABEL,
  eventText,
  ink,
  line,
  lineSoft,
  muted,
  startOf,
  useAttendance,
  useMyUserId,
  when,
  type PressState,
  type Ranked,
} from '@/components/web/eventParts';
import type { Event } from '@/types/event';
import { colors, palette } from '@/theme/colors';

const { text, display } = eventText;

export interface WebLeaderboardsProps {
  /** Board to show; when absent, wide layouts show the most recent joined event and narrow ones show the list. */
  eventId?: string;
  onSelect: (eventId: string) => void;
  onOpenEvents: () => void;
  onOpenEvent: (eventId: string) => void;
  /** Narrow board view: back to the list. */
  onBackToList?: () => void;
}

export function WebLeaderboards({ eventId, onSelect, onOpenEvents, onOpenEvent, onBackToList }: WebLeaderboardsProps) {
  const { wide } = useWebLayout();
  const attendance = useAttendance();
  const events = useEvents();
  const byId = new Map(((events.data ?? []) as Event[]).map((e) => [e.id, e]));
  const joined = (attendance.data ?? [])
    .map((a) => byId.get(a.event_id))
    .filter((e): e is Event => !!e)
    .sort((a, b) => startOf(b) - startOf(a));

  const loading = attendance.isLoading || events.isLoading;
  const error = attendance.error ?? events.error;
  const selectedId = eventId ?? (wide ? joined[0]?.id : undefined);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const showList = wide || !eventId;
  const showBoard = !!selectedId && (wide || !!eventId);

  const retry = () => {
    attendance.refetch();
    events.refetch();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && { paddingTop: 24 }]}>
      {!wide && eventId ? (
        <Crumb label="Leaderboards" onPress={onBackToList ?? onOpenEvents} current={selected?.name} />
      ) : (
        <View style={{ gap: 6 }}>
          <Text style={styles.h1} role="heading" aria-level={1}>
            Leaderboards
          </Text>
          <Text style={styles.lead}>Rankings for the events you have joined.</Text>
        </View>
      )}

      {loading ? (
        <View style={[styles.columns, wide && styles.columnsWide]}>
          {showList ? <SkeletonList count={4} avatar={false} style={wide ? styles.aside : undefined} /> : null}
          {wide || eventId ? <BoardSkeleton /> : null}
        </View>
      ) : error ? (
        <ErrorState title="Could not load your events" error={error} onRetry={retry} retrying={attendance.isFetching || events.isFetching} />
      ) : joined.length === 0 && !eventId ? (
        <EmptyState
          icon="podium-outline"
          title="No joined events yet"
          body="Join an event with its code or from the events page. Its leaderboard will show up here."
          action={{ label: 'Browse events', onPress: onOpenEvents }}
        />
      ) : (
        <View style={[styles.columns, wide && styles.columnsWide]}>
          {showList ? (
            <View style={[styles.card, wide && styles.aside]} aria-label="Joined events">
              {joined.map((e, i) => {
                const active = e.id === selectedId;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => onSelect(e.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${e.name} leaderboard`}
                    style={(s: PressState) => [styles.evRow, i < joined.length - 1 && styles.divider, active && styles.evRowActive, !active && s.hovered && { backgroundColor: palette.slate50 }]}
                  >
                    <DateTile event={e} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.evTitle} numberOfLines={2}>
                        {e.name}
                      </Text>
                      <Text style={[styles.evMeta, { color: STATUS_LABEL[e.status]?.color ?? muted }]}>{STATUS_LABEL[e.status]?.text ?? e.status}</Text>
                    </View>
                    {!wide ? <Ionicons name="chevron-forward" size={16} color={muted} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {showBoard ? <Board eventId={selectedId!} event={selected} onOpenEvent={() => onOpenEvent(selectedId!)} /> : null}
        </View>
      )}
    </ScrollView>
  );
}

function Board({ eventId, event, onOpenEvent }: { eventId: string; event: Event | null; onOpenEvent: () => void }) {
  const { data: analytics, isLoading, error, refetch, isFetching } = useEventAnalytics(eventId);
  const meId = useMyUserId();
  const students = (analytics?.top_students ?? []) as Ranked[];
  const myIndex = meId ? students.findIndex((s) => s.user_id === meId) : -1;
  const me = myIndex >= 0 ? students[myIndex] : null;

  if (isLoading) return <BoardSkeleton />;
  if (error) return <ErrorState style={{ flex: 1 }} title="Could not load this leaderboard" error={error} onRetry={() => refetch()} retrying={isFetching} />;

  return (
    <View style={styles.board}>
      <View style={styles.boardHead}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.h2} role="heading" aria-level={2} numberOfLines={2}>
            {event?.name ?? 'Leaderboard'}
          </Text>
          {event ? <Text style={styles.evMeta}>{when(event, true)}</Text> : null}
        </View>
        <Button size="sm" variant="outline" label="Open event" onPress={onOpenEvent} />
      </View>

      <View style={[styles.card, styles.stats]}>
        <Stat label="Attendees" value={(analytics?.attendance_count ?? 0).toLocaleString()} />
        <Stat label="Ranked" value={students.length.toLocaleString()} divider />
        <Stat label="Your rank" value={me ? `#${myIndex + 1}` : '—'} note={me ? `${(me.score ?? 0).toLocaleString()} pts` : 'Take part to rank'} divider />
      </View>

      <View style={styles.card}>
        {students.length === 0 ? (
          <Text style={styles.note}>No rankings yet. Scores appear once attendees join, answer polls and download materials.</Text>
        ) : (
          <BoardRows students={students} meId={meId} showActions />
        )}
      </View>
      <Text style={styles.rules}>
        How points work: joining +{POINTS.join} · correct poll answer +{POINTS.correctAnswer} · other answers +{POINTS.otherAnswer} · each material download +{POINTS.download}.
      </Text>
    </View>
  );
}

function Stat({ label, value, note, divider }: { label: string; value: string; note?: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

function BoardSkeleton() {
  const color = useShimmer();
  return (
    <View style={styles.board} aria-busy>
      <Skeleton w="50%" h={24} color={color} />
      <View style={[styles.card, styles.stats]}>
        {[0, 1, 2].map((k) => (
          <View key={k} style={[styles.stat, { gap: 10 }]}>
            <Skeleton w="60%" h={12} color={color} />
            <Skeleton w="40%" h={24} color={color} />
          </View>
        ))}
      </View>
      <SkeletonList count={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 24 },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44, color: ink },
  lead: { ...text, fontSize: 15, color: palette.slate600 },

  columns: { gap: 24 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  aside: { width: 320, flexShrink: 0, position: 'sticky' as any, top: 24 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },

  evRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  evRowActive: { backgroundColor: palette.slate50, borderLeftColor: palette.teal500 },
  evTitle: { ...text, fontSize: 14, fontWeight: '600', color: ink },
  evMeta: { ...text, marginTop: 3, fontSize: 13, color: muted },

  board: { flex: 1, minWidth: 0, gap: 16 },
  boardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, paddingVertical: 18, paddingHorizontal: 20 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: lineSoft },
  statLabel: { ...text, fontSize: 13, color: muted },
  statValue: { ...display, marginTop: 8, fontSize: 24, lineHeight: 28, fontWeight: '700', color: ink },
  statNote: { ...text, marginTop: 4, fontSize: 12, color: muted },
  note: { ...text, padding: 20, fontSize: 14, lineHeight: 21, color: muted },
  rules: { ...text, fontSize: 12, lineHeight: 18, color: muted },
});
