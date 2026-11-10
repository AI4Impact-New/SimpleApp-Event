// Browser-only inbox (design: "Inbox.dc.html"): filters + message list on the left, reading pane on the right.
// Narrow browsers get the list alone; opening a message goes to the NotificationDetail screen as on native.
// Presentational over the same queries as NotificationsScreen: the server owns what is in the inbox and read state.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorState, Skeleton, useShimmer } from '@/components/web/states';
import { useWebLayout } from '@/hooks/useWebLayout';
import { useMarkNotificationRead, useMyLearning, useNotifications } from '@/hooks/useLearning';
import type { LearnerNotification } from '@/types/learning';
import { colors, fonts, palette } from '@/theme/colors';
import { formatLocalDateTime } from '@/utils/datetime';

type PressState = { pressed: boolean; hovered?: boolean };
type Filter = 'all' | 'unread' | 'course' | 'general';

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;

// The design's fourth tab is "Events", but notifications carry no category yet; course_id is the only split we have.
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'course', label: 'Courses' },
  { id: 'general', label: 'General' },
];

function matches(n: LearnerNotification, f: Filter) {
  if (f === 'unread') return !n.read_at;
  if (f === 'course') return !!n.course_id;
  if (f === 'general') return !n.course_id;
  return true;
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** List timestamp in the design's style: 12m · 2h · 3d · 12 Oct. */
export function relativeTime(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return shortDate.format(new Date(t));
}

export interface WebInboxProps {
  onOpenNotification: (notification: LearnerNotification) => void;
  onOpenCourse?: (courseId: string) => void;
}

export function WebInbox({ onOpenNotification, onOpenCourse }: WebInboxProps) {
  const { wide } = useWebLayout();
  const { data: notifications = [], isLoading, error, refetch, isFetching } = useNotifications();
  const { data: learning = [] } = useMyLearning();
  const markRead = useMarkNotificationRead();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const courseTitles = useMemo(() => new Map(learning.map((c) => [c.id, c.title])), [learning]);
  const senderOf = (n: LearnerNotification) => (n.course_id && courseTitles.get(n.course_id)) || 'AI4Impact';

  const list = notifications.filter((n) => matches(n, filter));
  // Keep the open message even when a filter hides it from the list (as in the design); else show the first.
  const current = notifications.find((n) => n.id === selectedId) ?? list[0] ?? null;

  const open = (n: LearnerNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (wide) setSelectedId(n.id);
    else onOpenNotification(n);
  };

  let content: React.ReactNode;
  if (isLoading) {
    content = <InboxSkeleton wide={wide} />;
  } else if (error) {
    content = (
      <ErrorState title="Could not load your inbox" error={error} onRetry={() => refetch()} retrying={isFetching} />
    );
  } else if (notifications.length === 0) {
    content = (
      <EmptyState
        icon="mail-outline"
        title="No messages yet"
        body="Course updates, live class reminders and certificates will show up here."
      />
    );
  } else {
    const filters = (
      <View style={styles.filters} role="tablist">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              role="tab"
              aria-selected={active}
              onPress={() => setFilter(f.id)}
              style={(s: PressState) => [styles.filter, active ? styles.filterActive : s.hovered && styles.filterHover]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );

    const rows =
      list.length === 0 ? (
        <Text style={styles.listEmpty}>{filter === 'unread' ? 'You are all caught up.' : 'Nothing here yet.'}</Text>
      ) : (
        list.map((n) => (
          <MessageRow key={n.id} item={n} from={senderOf(n)} selected={wide && current?.id === n.id} onPress={() => open(n)} />
        ))
      );

    content = wide ? (
      <View style={styles.panes}>
        <View style={styles.listPane}>
          {filters}
          <ScrollView style={{ flex: 1 }}>{rows}</ScrollView>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.reader}>
          {current ? <Reader item={current} from={senderOf(current)} onOpenCourse={onOpenCourse} /> : null}
        </ScrollView>
      </View>
    ) : (
      <View style={styles.card}>
        {filters}
        {rows}
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]}>
      <Text style={styles.h1} role="heading" aria-level={1}>
        Inbox
      </Text>
      {content}
    </ScrollView>
  );
}

function MessageRow({ item, from, selected, onPress }: { item: LearnerNotification; from: string; selected: boolean; onPress: () => void }) {
  const unread = !item.read_at;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-current={selected || undefined}
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}, from ${from}`}
      style={(s: PressState) => [styles.row, selected ? styles.rowSelected : s.hovered && styles.rowHover]}
    >
      <View style={[styles.dot, unread && styles.dotUnread]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowFrom} numberOfLines={1}>
          {from}
        </Text>
        <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={1}>
          {item.body}
        </Text>
      </View>
      <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
    </Pressable>
  );
}

function Reader({ item, from, onOpenCourse }: { item: LearnerNotification; from: string; onOpenCourse?: (courseId: string) => void }) {
  return (
    <View style={styles.article}>
      <Text style={styles.meta}>
        {from} · {formatLocalDateTime(item.created_at)}
      </Text>
      <Text style={styles.h2} role="heading" aria-level={2}>
        {item.title}
      </Text>
      <Text style={styles.full}>{item.body}</Text>
      {item.course_id && onOpenCourse ? (
        <Pressable
          onPress={() => onOpenCourse(item.course_id!)}
          accessibilityRole="link"
          style={(s: PressState) => [styles.btnPrimary, s.hovered && styles.btnPrimaryHover]}
        >
          <Text style={styles.btnPrimaryText}>Open course</Text>
          <Ionicons name="arrow-forward" size={15} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function InboxSkeleton({ wide }: { wide: boolean }) {
  const color = useShimmer();
  const rows = [0, 1, 2, 3, 4].map((k) => (
    <View key={k} style={[styles.row, { gap: 12 }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton w={120} h={10} color={color} />
        <Skeleton w="80%" h={14} color={color} />
        <Skeleton w="95%" h={10} color={color} />
      </View>
    </View>
  ));
  return (
    <View style={wide ? styles.panes : styles.card} aria-busy>
      {wide ? (
        <>
          <View style={styles.listPane}>{rows}</View>
          <View style={[styles.reader, { gap: 16 }]}>
            <Skeleton w={200} h={12} color={color} />
            <Skeleton w="60%" h={24} color={color} />
            <Skeleton w="90%" h={14} color={color} />
            <Skeleton w="80%" h={14} color={color} />
          </View>
        </>
      ) : (
        rows
      )}
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, padding: 16, paddingBottom: 96, gap: 20 },
  pageContentWide: { paddingTop: 16, paddingBottom: 48 },
  h1: { ...display, fontSize: 32, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8, color: ink },
  h2: { ...display, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.52, color: ink },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  panes: {
    flex: 1,
    minHeight: 560,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: line,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listPane: { width: 360, flexShrink: 0, borderRightWidth: 1, borderRightColor: line },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 12, borderBottomWidth: 1, borderBottomColor: line },
  filter: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7 },
  filterHover: { backgroundColor: palette.slate100 },
  filterActive: { backgroundColor: palette.navy800 },
  filterText: { ...text, fontSize: 13, fontWeight: '500', color: body },
  filterTextActive: { color: '#ffffff' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: lineSoft,
    backgroundColor: '#ffffff',
  },
  rowHover: { backgroundColor: palette.slate50 },
  // Design: selected row is tinted with a 2px teal bar on its leading edge.
  rowSelected: { backgroundColor: palette.slate100, boxShadow: `inset 2px 0 0 ${palette.teal600}` } as any,
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, backgroundColor: 'transparent' },
  dotUnread: { backgroundColor: palette.amber500 },
  rowFrom: { ...text, fontSize: 12, color: muted },
  rowTitle: { ...text, marginTop: 2, fontSize: 14, fontWeight: '500', color: ink },
  rowTitleUnread: { fontWeight: '600' },
  rowBody: { ...text, marginTop: 2, fontSize: 13, color: muted },
  rowTime: { ...text, fontSize: 12, color: muted, marginTop: 1 },
  listEmpty: { ...text, padding: 24, fontSize: 14, color: muted },

  reader: { paddingVertical: 32, paddingHorizontal: 40 },
  article: { maxWidth: 760, gap: 16 },
  meta: { ...text, fontSize: 13, color: muted },
  full: { ...text, fontSize: 15, lineHeight: 26, color: palette.slate700 },


  btnPrimary: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: palette.navy800,
  },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
