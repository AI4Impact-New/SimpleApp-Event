// Pieces shared by the browser event pages (events, event detail, poll, leaderboards, materials):
// place/time wording, ranked rows and the points rules the backend applies, so every page says the same thing.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Event } from '@/types/event';
import { fonts, palette } from '@/theme/colors';

export type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;

export const ink = palette.navy850;
export const muted = palette.slate500;
export const body = palette.slate600;
export const line = palette.slate200;
export const lineSoft = palette.slate150;
export const TILES = [palette.navy800, '#2a3654', palette.teal600, palette.slate600, palette.slate700, palette.navy700];

/** Engagement points, mirroring shared/engagement/engagement_repository.py `_calculate_score`. */
export const POINTS = { join: 20, correctAnswer: 60, otherAnswer: 20, download: 20 } as const;

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const longDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function where(e: Event) {
  if (e.event_type === 'online') return 'Online';
  if (e.event_type === 'hybrid') return e.location ? `${e.location} and online` : 'In person and online';
  return e.location || 'In person';
}

export function when(e: Event, withDay = false) {
  if (!e.start_time) return 'Time to be announced';
  const s = new Date(e.start_time);
  if (Number.isNaN(s.getTime())) return 'Time to be announced';
  const en = e.end_time ? new Date(e.end_time) : null;
  const range = en && !Number.isNaN(en.getTime()) ? `${timeFmt.format(s)} – ${timeFmt.format(en)}` : timeFmt.format(s);
  return withDay ? `${dayFmt.format(s)} · ${range}` : range;
}

export function longDay(e: Event) {
  const s = e.start_time ? new Date(e.start_time) : null;
  return s && !Number.isNaN(s.getTime()) ? longDayFmt.format(s) : 'Date to be announced';
}

export function initials(name: string) {
  const p = name.split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : (p[0] ?? '?').slice(0, 2)).toUpperCase();
}

export const startOf = (e: Event) => (e.start_time ? new Date(e.start_time).getTime() : Number.POSITIVE_INFINITY);

export const STATUS_LABEL: Record<Event['status'], { text: string; color: string }> = {
  ongoing: { text: 'Live now', color: palette.teal600 },
  published: { text: 'Upcoming', color: ink },
  completed: { text: 'Ended', color: muted },
  cancelled: { text: 'Cancelled', color: '#b4321f' },
  draft: { text: 'Draft', color: muted },
};

export function DateTile({ event }: { event: Event }) {
  const start = event.start_time ? new Date(event.start_time) : null;
  const valid = start && !Number.isNaN(start.getTime());
  return (
    <View style={styles.dateTile}>
      <Text style={styles.dateMon}>{valid ? monthFmt.format(start!).toUpperCase() : 'TBA'}</Text>
      <Text style={styles.dateDay}>{valid ? String(start!.getDate()).padStart(2, '0') : '—'}</Text>
    </View>
  );
}

/** Events the learner has joined (server attendance records). */
export function useAttendance() {
  return useQuery({ queryKey: ['attendance'], queryFn: () => api.getAttendance() as Promise<{ id: string; event_id: string; timestamp?: string }[]> });
}

/** The learner's app user id; leaderboard rows carry this id (not the Cognito sub). */
export function useMyUserId() {
  const { data } = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile(), staleTime: 5 * 60_000 });
  return (data as { id?: string } | undefined)?.id ?? null;
}

export type Ranked = { user_id: string; score?: number; total_actions?: number; name?: string; display_name?: string };

export const rankedName = (s: Ranked) => (s.display_name ?? s.name ?? '').trim() || `Learner ${s.user_id.slice(0, 4)}`;

/** Ranked rows: rank, initials tile, name (with "You"), optional action count, points. */
export function BoardRows({ students, meId, showActions = false, dense = false }: { students: Ranked[]; meId: string | null; showActions?: boolean; dense?: boolean }) {
  return (
    <>
      {students.map((s, i) => {
        const name = rankedName(s);
        const me = !!meId && s.user_id === meId;
        return (
          <View key={s.user_id} style={[styles.boardRow, dense && styles.boardRowDense, i < students.length - 1 && styles.divider, me && styles.boardRowMe]}>
            <Text style={[styles.rank, i < 3 && styles.rankTop]}>{String(i + 1).padStart(2, '0')}</Text>
            <View style={[styles.tile, { backgroundColor: TILES[i % TILES.length] }]}>
              <Text style={styles.tileText}>{initials(name)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.boardName} numberOfLines={1}>
                {name}
                {me ? <Text style={styles.you}>  You</Text> : null}
              </Text>
              {showActions ? <Text style={styles.boardSub}>{s.total_actions ?? 0} actions</Text> : null}
            </View>
            <Text style={styles.pts}>
              {(s.score ?? 0).toLocaleString()}
              <Text style={styles.ptsUnit}> pts</Text>
            </Text>
          </View>
        );
      })}
    </>
  );
}

export function fileIcon(fileType?: string): IconName {
  const t = (fileType ?? '').toLowerCase();
  if (t.includes('pdf')) return 'document-text-outline';
  if (t.includes('presentation') || t.includes('powerpoint') || t.includes('ppt')) return 'easel-outline';
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return 'grid-outline';
  if (t.includes('video')) return 'videocam-outline';
  if (t.includes('image')) return 'image-outline';
  if (t.includes('zip') || t.includes('archive')) return 'archive-outline';
  return 'document-outline';
}

/** Short human label for a MIME type or extension ("application/pdf" → "PDF"). */
export function fileLabel(fileType?: string) {
  if (!fileType) return 'File';
  const t = fileType.toLowerCase();
  if (t.includes('pdf')) return 'PDF';
  if (t.includes('presentation') || t.includes('powerpoint')) return 'Slides';
  if (t.includes('word') || t.includes('msword')) return 'Document';
  if (t.includes('sheet') || t.includes('excel')) return 'Spreadsheet';
  if (t.includes('zip')) return 'ZIP';
  const tail = t.split(/[/.]/).pop() ?? t;
  return tail.length <= 5 ? tail.toUpperCase() : 'File';
}

/** Breadcrumb link back to a parent page ("Events / …"). */
export function Crumb({ label, onPress, current }: { label: string; onPress: () => void; current?: string }) {
  return (
    <View style={styles.crumbRow}>
      <Pressable onPress={onPress} accessibilityRole="link">
        {(s: PressState) => <Text style={[styles.crumb, s.hovered && { color: palette.teal600 }]}>{label}</Text>}
      </Pressable>
      {current ? (
        <>
          <Text style={styles.crumbSep}>/</Text>
          <Text style={styles.crumbCurrent} numberOfLines={1}>
            {current}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

export const eventText = { text, display, mono };

const styles = StyleSheet.create({
  dateTile: { width: 56, borderWidth: 1, borderColor: line, borderRadius: 10, paddingVertical: 6, alignItems: 'center', backgroundColor: '#ffffff' },
  dateMon: { ...text, fontSize: 11, color: muted },
  dateDay: { ...display, fontSize: 18, lineHeight: 20, fontWeight: '700', color: ink },

  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20 },
  boardRowDense: { paddingVertical: 12 },
  boardRowMe: { backgroundColor: palette.teal50 },
  rank: { ...mono, width: 28, fontSize: 13, fontWeight: '500', color: muted },
  rankTop: { color: ink, fontWeight: '700' },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileText: { ...display, fontSize: 12, fontWeight: '600', color: '#ffffff' },
  boardName: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  you: { ...text, fontSize: 12, fontWeight: '600', color: palette.teal600 },
  boardSub: { ...text, marginTop: 2, fontSize: 12, color: muted },
  pts: { ...display, fontSize: 14, fontWeight: '600', color: ink },
  ptsUnit: { ...text, fontSize: 12, fontWeight: '400', color: muted },

  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  crumb: { ...text, fontSize: 13, color: muted },
  crumbSep: { ...text, fontSize: 13, color: palette.slate300 },
  crumbCurrent: { ...text, flexShrink: 1, fontSize: 13, color: ink },
});
