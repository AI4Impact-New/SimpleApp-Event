// Browser event materials (design: "Event Materials.dc.html"): every file shared at an event, each with a download
// that earns engagement points. `MaterialRows` + `useMaterialDownload` are reused by event detail.
// The server issues short-lived download links, enforces registration and records the download for scoring.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent } from '@/hooks/useEvents';
import { useMaterials } from '@/hooks/useMaterials';
import { useWebLayout } from '@/hooks/useWebLayout';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import { Button, EmptyState, ErrorState, InlineError, Skeleton, useShimmer } from '@/components/web/states';
import { Crumb, POINTS, eventText, fileIcon, fileLabel, ink, line, lineSoft, muted, useAttendance } from '@/components/web/eventParts';
import type { Material } from '@/types/material';
import { colors, palette } from '@/theme/colors';

const { text, display } = eventText;
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const added = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `Added ${dateFmt.format(d)}` : '';
};

export const materialsOf = (data: unknown): Material[] =>
  Array.isArray(data) ? data : ((data as { materials?: Material[] } | undefined)?.materials ?? []);

/**
 * Opens a material in a new tab. On web the tab is opened before the request so popup blockers allow it
 * (they only trust windows opened directly from the click), then pointed at the signed URL.
 */
export function useMaterialDownload(eventId: string) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const download = async (m: Material) => {
    if (busy) return;
    setBusy(m.id);
    setErrors(({ [m.id]: _drop, ...rest }) => rest);
    const tab = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    try {
      const res = await api.getDownloadUrl(m.id);
      const url: string | undefined = res?.download_url;
      if (!url) throw new Error('missing url');
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        await Linking.openURL(url);
      }
      setDone((s) => new Set(s).add(m.id));
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'analytics'] });
    } catch (err: any) {
      tab?.close();
      setErrors((e) => ({ ...e, [m.id]: apiErrorMessage(err, 'Could not get this file. Try again.') }));
    } finally {
      setBusy(null);
    }
  };

  return { download, busy, done, errors };
}

export function MaterialRows({
  materials,
  dl,
  joined,
  wide,
}: {
  materials: Material[];
  dl: ReturnType<typeof useMaterialDownload>;
  joined: boolean;
  wide: boolean;
}) {
  return (
    <View style={styles.card}>
      {materials.map((m, i) => {
        const got = dl.done.has(m.id);
        return (
          <View key={m.id} style={[styles.row, !wide && styles.rowNarrow, i < materials.length - 1 && styles.divider]}>
            <View style={styles.fileIcon}>
              <Ionicons name={fileIcon(m.file_type)} size={18} color={ink} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.title} numberOfLines={2}>
                {m.title || 'Untitled file'}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {[fileLabel(m.file_type), added(m.created_at)].filter(Boolean).join(' · ')}
              </Text>
              <InlineError message={dl.errors[m.id]} style={{ marginTop: 4 }} />
            </View>
            {wide ? (
              <Text style={[styles.points, got && { color: palette.teal600 }]}>{got ? 'Downloaded' : joined ? `+${POINTS.download} pts` : ''}</Text>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              icon={got ? 'checkmark' : 'download-outline'}
              label={got ? 'Open again' : 'Download'}
              accessibilityLabel={`${got ? 'Open again' : 'Download'} ${m.title}`}
              loading={dl.busy === m.id}
              loadingLabel="Preparing…"
              disabled={!!dl.busy && dl.busy !== m.id}
              onPress={() => dl.download(m)}
            />
          </View>
        );
      })}
    </View>
  );
}

export interface WebEventMaterialsProps {
  eventId: string;
  onBack: () => void;
  onOpenEvent: () => void;
}

export function WebEventMaterials({ eventId, onBack, onOpenEvent }: WebEventMaterialsProps) {
  const { wide } = useWebLayout();
  const { data: event } = useEvent(eventId);
  const { data, isLoading, error, refetch, isFetching } = useMaterials(eventId);
  const attendance = useAttendance();
  const joined = (attendance.data ?? []).some((a) => a.event_id === eventId);
  const dl = useMaterialDownload(eventId);
  const materials = materialsOf(data);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && { paddingTop: 24 }]}>
      <View style={{ gap: 12 }}>
        <Crumb label={event?.name ?? 'Event'} onPress={onBack} current="Materials" />
        <View style={styles.head}>
          <Text style={styles.h1} role="heading" aria-level={1}>
            Materials
          </Text>
          {!isLoading && !error && materials.length > 0 ? (
            <Text style={styles.count}>
              {materials.length} {materials.length === 1 ? 'file' : 'files'}
            </Text>
          ) : null}
        </View>
      </View>

      {!attendance.isLoading && !joined ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={palette.navy800} />
          <Text style={styles.noticeText}>Join this event to download its materials and earn points.</Text>
          <Button size="sm" variant="outline" label="Go to event" onPress={onOpenEvent} />
        </View>
      ) : joined ? (
        <Text style={styles.lead}>Each file you download adds {POINTS.download} points to your score on this event's leaderboard.</Text>
      ) : null}

      {isLoading ? (
        <MaterialsSkeleton />
      ) : error ? (
        <ErrorState title="Could not load materials" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : materials.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No materials yet" body="Slides, handouts and recordings your host shares will appear here." />
      ) : (
        <MaterialRows materials={materials} dl={dl} joined={joined} wide={wide} />
      )}
    </ScrollView>
  );
}

function MaterialsSkeleton() {
  const color = useShimmer();
  return (
    <View style={styles.card} aria-busy>
      {[0, 1, 2, 3].map((k) => (
        <View key={k} style={[styles.row, k < 3 && styles.divider]}>
          <Skeleton w={40} h={40} r={10} color={color} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton w="55%" h={14} color={color} />
            <Skeleton w="30%" h={10} color={color} />
          </View>
          <Skeleton w={110} h={36} r={8} color={color} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 24 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  h1: { ...display, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9, color: ink },
  count: { ...text, fontSize: 14, color: muted },
  lead: { ...text, fontSize: 14, lineHeight: 21, color: palette.slate600 },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: line, borderRadius: 14, backgroundColor: palette.slate100 },
  noticeText: { ...text, flex: 1, minWidth: 200, fontSize: 14, color: ink },

  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  rowNarrow: { gap: 12, paddingHorizontal: 16 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.slate50 },
  title: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  sub: { ...text, fontSize: 13, color: muted },
  points: { ...text, width: 90, textAlign: 'right', fontSize: 13, fontWeight: '500', color: muted },
});
