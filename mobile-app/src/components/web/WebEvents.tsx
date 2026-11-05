// Browser-only events page (design: "Community.dc.html"): join by code, a live-event hero with its active poll,
// upcoming events and the live event's leaderboard. Presentational over the same queries as the native screens;
// the server decides attendance, poll eligibility and scores.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebLayout } from '@/hooks/useWebLayout';
import { useEventAnalytics, useEvents, useJoinEvent } from '@/hooks/useEvents';
import { useCastVote, usePollResults, usePolls } from '@/hooks/usePolls';
import { useMaterials } from '@/hooks/useMaterials';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { Event } from '@/types/event';
import type { Poll } from '@/types/poll';
import { colors, fonts, palette } from '@/theme/colors';

type PressState = { pressed: boolean; hovered?: boolean };

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const TILES = [palette.navy800, '#2a3654', palette.teal600, palette.slate600, palette.slate700, palette.navy700];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Event code box accepts the event ID or a join link, the same payloads the QR scanner understands. */
export function eventIdFromCode(input: string): string | null {
  let id = input.trim();
  for (const marker of ['/join/', '/events/', '/event/']) {
    if (id.includes(marker)) id = id.split(marker).pop() ?? id;
  }
  id = id.split(/[?#/]/)[0];
  return UUID.test(id) ? id : null;
}

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function where(e: Event) {
  if (e.event_type === 'online') return 'Online';
  if (e.event_type === 'hybrid') return e.location ? `${e.location} and online` : 'In person and online';
  return e.location || 'In person';
}

function when(e: Event, withDay = false) {
  if (!e.start_time) return 'Time to be announced';
  const s = new Date(e.start_time);
  if (Number.isNaN(s.getTime())) return 'Time to be announced';
  const en = e.end_time ? new Date(e.end_time) : null;
  const range = en && !Number.isNaN(en.getTime()) ? `${timeFmt.format(s)} – ${timeFmt.format(en)}` : timeFmt.format(s);
  return withDay ? `${dayFmt.format(s)} · ${range}` : range;
}

function initials(name: string) {
  const p = name.split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : (p[0] ?? '?').slice(0, 2)).toUpperCase();
}

const startOf = (e: Event) => (e.start_time ? new Date(e.start_time).getTime() : Number.POSITIVE_INFINITY);

export interface WebEventsProps {
  onEventPress: (event: Event) => void;
  onOpenEvent: (eventId: string) => void;
  onLeaderboardPress?: () => void;
}

export function WebEvents({ onEventPress, onOpenEvent, onLeaderboardPress }: WebEventsProps) {
  const { wide } = useWebLayout();
  const { data: events = [], isLoading, error, refetch, isFetching } = useEvents('global');
  const attendance = useQuery({ queryKey: ['attendance'], queryFn: () => api.getAttendance() as Promise<{ event_id: string }[]> });
  const joinedIds = new Set((attendance.data ?? []).map((a) => a.event_id));

  const list = events as Event[];
  const live = list.filter((e) => e.status === 'ongoing').sort((a, b) => startOf(a) - startOf(b))[0] ?? null;
  const now = Date.now();
  const upcoming = list
    .filter((e) => e.id !== live?.id && (e.status === 'published' || e.status === 'ongoing'))
    .filter((e) => !e.end_time || new Date(e.end_time).getTime() >= now)
    .sort((a, b) => startOf(a) - startOf(b));

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]}>
      <View style={styles.head}>
        <Text style={styles.h1} role="heading" aria-level={1}>
          Events
        </Text>
        <JoinByCode onJoined={onOpenEvent} />
      </View>

      {isLoading ? (
        <EventsSkeleton wide={wide} />
      ) : error ? (
        <Blank
          title="Could not load events"
          body={apiErrorMessage(error, 'Check your connection and try again.')}
          cta={isFetching ? 'Retrying…' : 'Try again'}
          onCta={() => refetch()}
        />
      ) : (
        <>
          {live ? <LiveHero event={live} wide={wide} onOpen={() => onEventPress(live)} /> : null}
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={[styles.section, wide && { flex: 1.4 }]}>
              <Text style={styles.h2} role="heading" aria-level={2}>
                Upcoming
              </Text>
              {upcoming.length === 0 ? (
                <Blank title="No upcoming events" body="New meetups, panels and live sessions will be listed here." />
              ) : (
                <View style={styles.card}>
                  {upcoming.map((e, i) => (
                    <UpcomingRow key={e.id} event={e} joined={joinedIds.has(e.id)} last={i === upcoming.length - 1} wide={wide} onPress={() => onEventPress(e)} />
                  ))}
                </View>
              )}
            </View>
            <View style={[styles.section, wide && { flex: 1 }]}>
              <Leaderboard event={live} onAll={onLeaderboardPress} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function JoinByCode({ onJoined }: { onJoined: (eventId: string) => void }) {
  const queryClient = useQueryClient();
  const join = useJoinEvent();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    const id = eventIdFromCode(code);
    if (!id) {
      setMessage('Enter the event code or join link shared by your host.');
      return;
    }
    setMessage(null);
    try {
      await join.mutateAsync(id);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message ?? err?.response?.data?.error ?? '');
      if (!/already (joined|checked into)/i.test(msg)) {
        setMessage(apiErrorMessage(err, 'Could not join this event. Check the code and try again.'));
        return;
      }
    }
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    setCode('');
    onJoined(id);
  };

  return (
    <View style={{ gap: 6, alignItems: 'flex-end', flexShrink: 1 }}>
      <View style={styles.joinRow}>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t);
            if (message) setMessage(null);
          }}
          onSubmitEditing={submit}
          placeholder="Event code"
          placeholderTextColor={palette.slate400}
          accessibilityLabel="Event code or join link"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.codeInput}
        />
        <Pressable
          onPress={submit}
          disabled={join.isPending}
          accessibilityRole="button"
          style={(s: PressState) => [styles.btnPrimary, (s.hovered || join.isPending) && styles.btnPrimaryHover]}
        >
          <Text style={styles.btnPrimaryText}>{join.isPending ? 'Joining…' : 'Join'}</Text>
        </Pressable>
      </View>
      {message ? (
        <Text style={styles.joinError} role="alert">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function LiveHero({ event, wide, onOpen }: { event: Event; wide: boolean; onOpen: () => void }) {
  const { data: materials } = useMaterials(event.id);
  const { data: analytics } = useEventAnalytics(event.id);
  const { data: polls } = usePolls(event.id);
  const activePoll = ((polls ?? []) as Poll[]).find((p) => p.status === 'active') ?? null;
  const materialCount = Array.isArray(materials) ? materials.length : 0;
  const joined = analytics?.attendance_count;

  return (
    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.heroMain, activePoll && (wide ? styles.heroDividerV : styles.heroDividerH)]}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live now{typeof joined === 'number' && joined > 0 ? ` · ${joined} joined` : ''}</Text>
        </View>
        <Text style={styles.heroTitle} role="heading" aria-level={2}>
          {event.name}
        </Text>
        <Text style={styles.heroMeta}>
          {where(event)} · {when(event)}
        </Text>
        <View style={styles.heroActions}>
          <Pressable onPress={onOpen} accessibilityRole="link" style={(s: PressState) => [styles.btnLight, s.hovered && { backgroundColor: '#ffffff' }]}>
            <Text style={styles.btnLightText}>Open event</Text>
          </Pressable>
          {materialCount > 0 ? (
            <Pressable onPress={onOpen} accessibilityRole="link" style={(s: PressState) => [styles.btnDark, s.hovered && { borderColor: '#3a4868' }]}>
              <Text style={styles.btnDarkText}>Materials · {materialCount}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {activePoll ? <LivePoll key={activePoll.id} poll={activePoll} /> : null}
    </View>
  );
}

function LivePoll({ poll }: { poll: Poll }) {
  const queryClient = useQueryClient();
  const { data: results, refetch } = usePollResults(poll.id);
  const vote = useCastVote();
  const [picked, setPicked] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = results?.results ?? [];
  const total = rows.reduce((sum: number, r: { votes: number }) => sum + (r.votes ?? 0), 0);
  const votesFor = (optionId: string, text: string) =>
    rows.find((r: { option_id?: string; option: string }) => (r.option_id ? r.option_id === optionId : r.option === text))?.votes ?? 0;

  const cast = async (optionId: string) => {
    if (answered || vote.isPending) return;
    setError(null);
    setPicked(optionId);
    try {
      await vote.mutateAsync({ pollId: poll.id, optionId });
      setAnswered(true);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message ?? err?.response?.data?.error ?? '');
      if (/already voted|already answered/i.test(msg)) setAnswered(true);
      else {
        setPicked(null);
        setError(apiErrorMessage(err, 'Join this event to answer its polls.'));
        return;
      }
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['polls', poll.id] });
  };

  return (
    <View style={styles.poll}>
      <Text style={styles.pollMeta}>Live poll · {answered ? `you answered · ${total} votes` : 'tap to answer'}</Text>
      <Text style={styles.pollQ}>{poll.question}</Text>
      {(poll.options ?? []).map((o) => {
        const pct = answered && total > 0 ? Math.round((votesFor(o.id, o.option_text) / total) * 100) : 0;
        const mine = picked === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => cast(o.id)}
            disabled={answered || vote.isPending}
            accessibilityRole="button"
            accessibilityState={{ selected: mine, disabled: answered }}
            style={(s: PressState) => [styles.opt, mine && styles.optMine, !answered && s.hovered && { borderColor: '#2f3d5e' }]}
          >
            <View style={[styles.optFill, { width: `${pct}%`, backgroundColor: mine ? palette.teal700 : '#1e2a45' }]} />
            <Text style={styles.optText}>{o.option_text}</Text>
            {answered ? <Text style={styles.optPct}>{pct}%</Text> : null}
          </Pressable>
        );
      })}
      {error ? <Text style={styles.pollError}>{error}</Text> : null}
    </View>
  );
}

function UpcomingRow({ event, joined, last, wide, onPress }: { event: Event; joined: boolean; last: boolean; wide: boolean; onPress: () => void }) {
  const start = event.start_time ? new Date(event.start_time) : null;
  const valid = start && !Number.isNaN(start.getTime());
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${event.name}, ${when(event, true)}`}
      style={(s: PressState) => [styles.upRow, !wide && styles.upRowNarrow, !last && styles.divider, s.hovered && { backgroundColor: palette.slate50 }]}
    >
      <View style={styles.dateTile}>
        <Text style={styles.dateMon}>{valid ? monthFmt.format(start!).toUpperCase() : 'TBA'}</Text>
        <Text style={styles.dateDay}>{valid ? String(start!.getDate()).padStart(2, '0') : '—'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.upTitle} numberOfLines={2}>
          {event.name}
        </Text>
        <Text style={styles.upMeta} numberOfLines={1}>
          {where(event)} · {when(event)}
        </Text>
      </View>
      <Text style={[styles.upStatus, joined && { color: palette.teal600 }]}>{joined ? 'Joined' : event.status === 'ongoing' ? 'Live' : 'View'}</Text>
    </Pressable>
  );
}

function Leaderboard({ event, onAll }: { event: Event | null; onAll?: () => void }) {
  const { data: analytics, isLoading } = useEventAnalytics(event?.id ?? '');
  const top = (analytics?.top_students ?? []).slice(0, 6) as { user_id: string; score: number; name?: string; display_name?: string }[];

  return (
    <>
      <View style={styles.boardHead}>
        <Text style={styles.h2} role="heading" aria-level={2}>
          Leaderboard
        </Text>
        {onAll ? (
          <Pressable onPress={onAll} accessibilityRole="link">
            {(s: PressState) => <Text style={[styles.boardSub, s.hovered && { color: colors.primary }]}>{event ? `${event.name} · all boards` : 'All boards'}</Text>}
          </Pressable>
        ) : null}
      </View>
      <View style={styles.card}>
        {event && isLoading ? (
          <Text style={styles.boardNote}>Loading rankings…</Text>
        ) : top.length === 0 ? (
          <Text style={styles.boardNote}>
            {event ? 'Rankings appear once attendees start answering polls.' : 'Rankings show for live events. Open All boards to see events you have joined.'}
          </Text>
        ) : (
          top.map((s, i) => {
            const name = (s.display_name ?? s.name ?? '').trim() || `Learner ${s.user_id.slice(0, 4)}`;
            return (
              <View key={s.user_id} style={[styles.boardRow, styles.divider]}>
                <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={[styles.tile, { backgroundColor: TILES[i % TILES.length] }]}>
                  <Text style={styles.tileText}>{initials(name)}</Text>
                </View>
                <Text style={styles.boardName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.pts}>{(s.score ?? 0).toLocaleString()}</Text>
              </View>
            );
          })
        )}
        {top.length > 0 ? <Text style={styles.boardNote}>Points come from attendance and poll answers at this event.</Text> : null}
      </View>
    </>
  );
}

function Blank({ title, body: text, cta, onCta }: { title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <View style={styles.blank}>
      <View style={styles.blankIcon}>
        <Ionicons name="calendar-outline" size={18} color={body} />
      </View>
      <Text style={styles.blankTitle}>{title}</Text>
      <Text style={styles.blankBody}>{text}</Text>
      {cta && onCta ? (
        <Pressable onPress={onCta} style={(s: PressState) => [styles.btnPrimary, { height: 36 }, s.hovered && styles.btnPrimaryHover]}>
          <Text style={styles.btnPrimaryText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

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

function EventsSkeleton({ wide }: { wide: boolean }) {
  const color = useShimmer();
  const sk = (w: number | `${number}%`, h: number) => <Animated.View style={{ width: w, height: h, borderRadius: 4, backgroundColor: color }} />;
  return (
    <View style={[styles.columns, wide && styles.columnsWide]} aria-busy>
      <View style={[styles.section, wide && { flex: 1.4 }]}>
        {sk(120, 22)}
        <View style={styles.card}>
          {[0, 1, 2].map((k) => (
            <View key={k} style={[styles.upRow, k < 2 && styles.divider]}>
              {sk(56, 48)}
              <View style={{ flex: 1, gap: 8 }}>
                {sk('70%', 14)}
                {sk('45%', 10)}
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.section, wide && { flex: 1 }]}>
        {sk(140, 22)}
        <View style={[styles.card, { padding: 20, gap: 14 }]}>
          {[0, 1, 2, 3].map((k) => (
            <View key={k}>{sk('85%', 14)}</View>
          ))}
        </View>
      </View>
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 32 },
  pageContentWide: { paddingTop: 24 },

  head: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-end' },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },
  h2: { ...display, fontSize: 22, lineHeight: 26, fontWeight: '700', letterSpacing: -0.44, color: ink },

  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: {
    ...mono,
    width: 200,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1.1,
    color: ink,
    backgroundColor: '#ffffff',
  },
  joinError: { ...text, fontSize: 12, color: '#b4321f', maxWidth: 320, textAlign: 'right' },

  hero: { backgroundColor: palette.navy900, borderRadius: 20, overflow: 'hidden' },
  heroWide: { flexDirection: 'row' },
  heroMain: { flex: 1.1, padding: 32, gap: 14 },
  heroDividerV: { borderRightWidth: 1, borderRightColor: palette.borderDark },
  heroDividerH: { borderBottomWidth: 1, borderBottomColor: palette.borderDark },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.teal400 },
  liveText: { ...text, fontSize: 13, color: palette.teal400 },
  heroTitle: { ...display, fontSize: 28, lineHeight: 31, fontWeight: '700', letterSpacing: -0.56, color: palette.textOnDark },
  heroMeta: { ...text, fontSize: 14, color: palette.textOnDarkBody },
  heroActions: { marginTop: 'auto' as any, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12 },
  btnLight: { height: 40, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', backgroundColor: palette.textOnDark },
  btnLightText: { ...text, fontSize: 14, fontWeight: '600', color: ink },
  btnDark: { height: 40, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: '#2b3858', backgroundColor: palette.navy750 },
  btnDarkText: { ...text, fontSize: 14, fontWeight: '500', color: palette.textOnDark },

  poll: { flex: 1, padding: 32, gap: 12 },
  pollMeta: { ...text, fontSize: 13, color: '#7e8797' },
  pollQ: { ...display, fontSize: 17, lineHeight: 23, fontWeight: '600', color: palette.textOnDark },
  opt: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderDark,
    backgroundColor: palette.navy750,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  optMine: { borderColor: palette.teal400 },
  optFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optText: { ...text, fontSize: 14, color: palette.textOnDark, flexShrink: 1 },
  optPct: { ...mono, fontSize: 12, fontWeight: '500', color: palette.textOnDarkBody },
  pollError: { ...text, fontSize: 13, color: '#f4a28c' },

  columns: { gap: 24 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  section: { gap: 16, minWidth: 0 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },

  upRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 18, paddingHorizontal: 24 },
  upRowNarrow: { gap: 14, paddingHorizontal: 16 },
  dateTile: { width: 56, borderWidth: 1, borderColor: line, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  dateMon: { ...text, fontSize: 11, color: muted },
  dateDay: { ...display, fontSize: 18, lineHeight: 20, fontWeight: '700', color: ink },
  upTitle: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  upMeta: { ...text, marginTop: 3, fontSize: 13, color: muted },
  upStatus: { ...text, fontSize: 13, fontWeight: '500', color: ink },

  boardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  boardSub: { ...text, fontSize: 13, color: muted },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  rank: { ...mono, width: 28, fontSize: 13, fontWeight: '500', color: muted },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileText: { ...display, fontSize: 12, fontWeight: '600', color: '#ffffff' },
  boardName: { ...text, flex: 1, fontSize: 14, fontWeight: '500', color: ink },
  pts: { ...display, fontSize: 14, fontWeight: '600', color: ink },
  boardNote: { ...text, paddingVertical: 14, paddingHorizontal: 20, fontSize: 12, lineHeight: 18, color: muted },

  blank: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  blankBody: { ...text, fontSize: 14, lineHeight: 22, color: body },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
