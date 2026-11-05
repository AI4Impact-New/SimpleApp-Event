// Browser-only lecture page (design: claude.ai/design "Lecture Player.dc.html").
// Purely presentational: playback, heartbeats and session renewal stay in LecturePlayerScreen,
// which renders this layout on web and its app layout on native.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, type VideoPlayer } from 'expo-video';
import { useLearningHome } from '@/hooks/useLearning';
import { useWebLayout } from '@/hooks/useWebLayout';
import { Spinner } from '@/components/web/Spinner';
import { SeekBar } from '@/components/SeekBar';
import { VideoWatermark } from '@/components/VideoWatermark';
import type { PlaybackWatermark, LearningClass, LectureProgress } from '@/types/learning';
import { colors, fonts, palette } from '@/theme/colors';
import { formatDuration, formatLocalDateTime } from '@/utils/datetime';

type PressState = { pressed: boolean; hovered?: boolean };

export type WebLoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  | { kind: 'blocked'; reason: 'locked' | 'expired'; message: string }
  | { kind: 'error'; message: string };

export interface WebLecturePlayerProps {
  watermark: PlaybackWatermark | null;
  classId: string;
  courseId?: string;
  title: string;
  player: VideoPlayer;
  videoViewRef: React.RefObject<VideoView | null>;
  loadState: WebLoadState;
  isPlaying: boolean;
  position: number;
  videoDuration: number;
  progress: LectureProgress | null;
  speed: number;
  speeds: number[];
  skipSeconds: number;
  completionThreshold: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onSpeed: (value: number) => void;
  onRetry: () => void;
  onBack: () => void;
  /** Switch to another lecture of this course (replaces the current player). */
  onPlayLecture?: (lecture: LearningClass) => void;
}

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;
const darkLine = palette.borderDark;

const minutes = (c: LearningClass) => {
  const secs = Number(c.duration_seconds) || (c.duration_minutes ? c.duration_minutes * 60 : 0);
  return secs > 0 ? `${Math.max(1, Math.round(secs / 60))} min` : '';
};

const shortDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : shortDate.format(d);
};

type RailKind = 'done' | 'current' | 'open' | 'locked' | 'expired' | 'pending' | 'live';

function railInfo(c: LearningClass, currentId: string): { kind: RailKind; sub: string } {
  const dur = minutes(c);
  if (c.class_type !== 'recorded') {
    return { kind: 'live', sub: [c.class_type === 'online' ? 'Live online' : 'In person', fmtShort(c.start_time)].filter(Boolean).join(' · ') };
  }
  if (c.id === currentId) return { kind: 'current', sub: ['Playing', dur].filter(Boolean).join(' · ') };
  if (c.completed) return { kind: 'done', sub: ['Watched', dur].filter(Boolean).join(' · ') };
  const state = c.access_state ?? 'available';
  if (state === 'locked') return { kind: 'locked', sub: 'Unlocks after the previous lecture' };
  if (state === 'expired') return { kind: 'expired', sub: 'Viewing window ended' };
  if (state === 'not_ready') return { kind: 'pending', sub: 'Not published yet' };
  const until = fmtShort(c.access_expires_at);
  return { kind: 'open', sub: [dur, until ? `until ${until}` : ''].filter(Boolean).join(' · ') };
}

const RAIL_ICON: Record<RailKind, { name: keyof typeof Ionicons.glyphMap; bg: string; fg: string; border: string }> = {
  done: { name: 'checkmark', bg: colors.primary, fg: '#ffffff', border: colors.primary },
  current: { name: 'play', bg: colors.primary, fg: '#ffffff', border: colors.primary },
  open: { name: 'play', bg: '#ffffff', fg: body, border: line },
  locked: { name: 'lock-closed', bg: '#ffffff', fg: palette.slate400, border: line },
  expired: { name: 'hourglass-outline', bg: '#ffffff', fg: palette.slate400, border: line },
  pending: { name: 'time-outline', bg: '#ffffff', fg: palette.slate400, border: line },
  live: { name: 'videocam-outline', bg: '#fff1dc', fg: '#e8931a', border: palette.amber500 },
};

export function WebLecturePlayer(props: WebLecturePlayerProps) {
  const { classId, courseId, title, player, videoViewRef, loadState, position, videoDuration, progress } = props;
  const { wide } = useWebLayout();
  const cardRef = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);
  // Fullscreen the whole stage and its controls, never the bare video (which drops the watermark).
  const toggleFullscreen = async () => {
    const element = cardRef.current as unknown as HTMLElement | null;
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setExpanded(false);
    } else {
      setExpanded(true);
      // Safari/iPhone without element fullscreen uses a viewport-filling stage instead.
      try { await element?.requestFullscreen?.(); } catch { /* Keep the viewport fallback. */ }
    }
  };
  const fullscreenRef = useRef(toggleFullscreen);
  fullscreenRef.current = toggleFullscreen;
  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) setExpanded(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('fullscreenchange', changed);
    window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('fullscreenchange', changed); window.removeEventListener('keydown', escape); };
  }, []);
  const home = useLearningHome(courseId ?? '');
  const ready = loadState.kind === 'ready';

  const classes = Array.isArray(home.data?.classes)
    ? [...home.data!.classes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];
  const recorded = classes.filter((c) => c.class_type === 'recorded');
  const index = recorded.findIndex((c) => c.id === classId);
  const current = index >= 0 ? recorded[index] : null;
  const prev = index > 0 ? recorded[index - 1] : null;
  const next = index >= 0 ? recorded[index + 1] ?? null : null;
  const canPlay = (c: LearningClass | null) => !!c && (c.access_state ?? 'available') === 'available';

  // Display-only view of the <video> element: expo-video web has no buffering state, and `player.duration` is read
  // at render time, so the controls would sit at 0:00 / 0:00 until playback advances.
  const media = useMediaElementState(videoViewRef, player, ready);
  // Play/pause follows the <video> element itself. expo-video web's playingChange can report "playing" while the
  // element is paused (e.g. Safari blocking the load-time autoplay), which left the toggle sending pause forever.
  const isPlaying = media.element ? !media.paused : props.isPlaying;
  const toggle = () => {
    if (!ready) return;
    if (isPlaying) player.pause();
    else player.play();
  };
  const shownDuration = videoDuration || media.duration;
  const showLoader = loadState.kind === 'loading' || (ready && media.buffering);

  const watchedPct = progress ? Math.min(100, Math.round(Number(progress.progress_percentage) || 0)) : 0;
  const completed = !!progress?.completed;
  const coursePct = Math.round(Number(home.data?.completion?.progress_percentage) || 0);

  const meta = [
    current ? `Lecture ${index + 1} of ${recorded.length}` : null,
    current ? minutes(current) : null,
    current?.access_expires_at ? `Available until ${formatLocalDateTime(current.access_expires_at)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Keyboard shortcuts: space/k play-pause, ←/→ skip, f full screen. Ignored while typing in a field.
  const handlers = useRef(props);
  handlers.current = props;
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const h = handlers.current;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggleRef.current();
      } else if (e.key === 'ArrowLeft') h.onSeek(h.position - h.skipSeconds);
      else if (e.key === 'ArrowRight') h.onSeek(h.position + h.skipSeconds);
      else if (e.key === 'f') { e.preventDefault(); fullscreenRef.current().catch(() => {}); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rail = (
    <View style={[styles.rail, wide && styles.railWide]}>
      <View style={styles.railHead}>
        <Pressable onPress={props.onBack} style={styles.backLink}>
          {(s: PressState) => (
            <>
              <Ionicons name="arrow-back" size={13} color={s.hovered ? colors.primary : muted} />
              <Text style={[styles.backText, s.hovered && { color: colors.primary }]} numberOfLines={1}>
                {home.data?.course?.title ?? 'Back to course'}
              </Text>
            </>
          )}
        </Pressable>
        <Text style={styles.railTitle}>Course content</Text>
        <View style={styles.railMetaRow}>
          <View style={[styles.trackLight, { flex: 1 }]}>
            <View style={[styles.fillPrimary, { width: `${coursePct}%` }]} />
          </View>
          <Text style={styles.railPct} accessibilityLabel={`${coursePct}% of lectures completed`}>{coursePct}% complete</Text>
        </View>
      </View>
      <ScrollView style={wide ? styles.railList : undefined}>
        {home.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          classes.map((c) => {
            const info = railInfo(c, classId);
            const icon = RAIL_ICON[info.kind];
            const isCurrent = info.kind === 'current';
            const playable = c.class_type === 'recorded' && !isCurrent && canPlay(c) && !!props.onPlayLecture;
            return (
              <Pressable
                key={c.id}
                disabled={!playable}
                onPress={() => props.onPlayLecture?.(c)}
                accessibilityState={{ selected: isCurrent, disabled: !playable }}
                style={(s: PressState) => [styles.railItem, isCurrent && styles.railItemCurrent, playable && s.hovered && styles.railItemHover]}
              >
                <View style={[styles.railIcon, { backgroundColor: icon.bg, borderColor: icon.border }]}>
                  <Ionicons name={icon.name} size={11} color={icon.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.railItemTitle, isCurrent && { fontWeight: '600' }]} numberOfLines={2}>
                    {c.title}
                  </Text>
                  {info.sub ? <Text style={styles.railItemSub}>{info.sub}</Text> : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const video = (
    <View ref={cardRef} testID="protected-video-stage" style={[styles.videoCard, expanded && styles.expandedCard]}>
      <View style={[styles.videoStage, expanded && styles.expandedStage]}>
        <VideoView
          ref={videoViewRef as React.RefObject<VideoView>}
          player={player}
          // A <video> ignores absolute insets; it needs an explicit size to fill the 16:9 stage (as the app layout does).
          style={styles.videoEl}
          nativeControls={false}
          contentFit="contain"
          allowsPictureInPicture={false}
          fullscreenOptions={{ enable: false }}
        />
        {props.watermark && ready ? <VideoWatermark identity={props.watermark} /> : null}
        {showLoader ? <StageLoader label={!ready ? 'Loading lecture…' : media.hasFrame ? 'Buffering…' : 'Loading video…'} /> : null}
        {ready ? (
          <Pressable onPress={toggle} style={styles.stageHit} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            {!isPlaying && !showLoader ? (
              <View style={[styles.bigPlay, !wide && styles.bigPlayNarrow]}>
                <Ionicons name="play" size={wide ? 26 : 20} color={ink} style={{ marginLeft: 3 }} />
              </View>
            ) : null}
          </Pressable>
        ) : loadState.kind === 'loading' ? null : (
          <View style={styles.overlay}>
            {loadState.kind === 'unavailable' ? (
              <Text style={styles.overlayText}>Recording not available yet</Text>
            ) : loadState.kind === 'blocked' ? (
              <>
                <Ionicons name={loadState.reason === 'locked' ? 'lock-closed' : 'hourglass-outline'} size={30} color={palette.textOnDark} />
                <Text style={styles.overlayText}>{loadState.message}</Text>
                <Pressable onPress={props.onBack} style={styles.overlayBtn}>
                  <Text style={styles.overlayBtnText}>Back to course</Text>
                </Pressable>
              </>
            ) : loadState.kind === 'error' ? (
              <>
                <Text style={styles.overlayText}>{loadState.message}</Text>
                <Pressable onPress={props.onRetry} style={styles.overlayBtn}>
                  <Ionicons name="refresh" size={16} color={ink} />
                  <Text style={styles.overlayBtnText}>Retry</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
      </View>

      <View style={[styles.controls, !ready && { opacity: 0.5 }]}>
        <SeekBar position={position} duration={shownDuration} onSeek={props.onSeek} disabled={!ready} />
        <View style={styles.controlRow}>
          <CtrlBtn icon={isPlaying ? 'pause' : 'play'} size={18} label={isPlaying ? 'Pause' : 'Play'} onPress={toggle} disabled={!ready} />
          <CtrlBtn icon="refresh" flip size={16} label={`Back ${props.skipSeconds} seconds`} onPress={() => props.onSeek(position - props.skipSeconds)} disabled={!ready} />
          <CtrlBtn icon="refresh" size={16} label={`Forward ${props.skipSeconds} seconds`} onPress={() => props.onSeek(position + props.skipSeconds)} disabled={!ready} />
          <Text style={styles.time}>
            {formatDuration(position)} / {formatDuration(shownDuration)}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={styles.speeds}>
            {props.speeds.map((v) => {
              const on = props.speed === v;
              return (
                <Pressable key={v} onPress={() => props.onSpeed(v)} style={[styles.speedBtn, on && styles.speedBtnOn]} accessibilityState={{ selected: on }}>
                  <Text style={[styles.speedText, on && styles.speedTextOn]}>{v}×</Text>
                </Pressable>
              );
            })}
          </View>
          <CtrlBtn
            icon="expand"
            size={16}
            label={expanded ? 'Exit full screen' : 'Full screen'}
            onPress={() => { toggleFullscreen().catch(() => {}); }}
            disabled={!ready}
          />
        </View>
      </View>
    </View>
  );

  const main = (
    <View style={[styles.main, wide && styles.mainWide]}>
      {video}

      <View style={styles.titleRow}>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={styles.h1} role="heading" aria-level={1}>
            {title}
          </Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {props.onPlayLecture && (prev || next) ? (
          <View style={styles.navBtns}>
            <Pressable
              disabled={!canPlay(prev)}
              onPress={() => prev && props.onPlayLecture?.(prev)}
              style={(s: PressState) => [styles.btnOutline, !canPlay(prev) && styles.btnDisabled, canPlay(prev) && s.hovered && { borderColor: palette.slate300 }]}
            >
              <Ionicons name="chevron-back" size={15} color={ink} />
              <Text style={styles.btnOutlineText}>Previous</Text>
            </Pressable>
            <Pressable
              disabled={!canPlay(next)}
              onPress={() => {
                if (!next) return;
                player.pause();
                props.onPlayLecture?.(next);
              }}
              style={(s: PressState) => [styles.btnPrimary, !canPlay(next) && styles.btnDisabled, canPlay(next) && s.hovered && { backgroundColor: palette.navy700 }]}
            >
              <Text style={styles.btnPrimaryText}>Next lecture</Text>
              <Ionicons name="chevron-forward" size={15} color="#ffffff" />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.credit}>
        <Ionicons name={completed ? 'checkmark-circle' : 'checkmark-circle-outline'} size={16} color={colors.primary} />
        <Text style={styles.creditText}>
          {completed
            ? 'This lecture counts as complete.'
            : `${watchedPct}% watched${progress ? ` (${formatDuration(progress.watched_seconds)} of ${formatDuration(progress.duration_seconds)} unique content)` : ''}. Watch ${props.completionThreshold}% to complete. The timeline shows playback position; skipped sections don't count. Up to ${Math.max(...props.speeds)}× playback is supported.`}
        </Text>
        {progress ? (
          <Text style={styles.creditPct}>
            {watchedPct}% / {props.completionThreshold}%
          </Text>
        ) : null}
      </View>

      {completed && next && !canPlay(next) ? (
        <Text style={styles.nextNote}>
          Up next: {next.title} —{' '}
          {next.access_state === 'not_ready'
            ? 'recording not published yet.'
            : next.access_state === 'expired'
              ? 'access expired. Contact course staff to reopen access.'
              : 'not unlocked yet. Check back on the course page.'}
        </Text>
      ) : null}

      <View style={styles.tabs}>
        <View style={styles.tabOn}>
          <Text style={styles.tabOnText}>Overview</Text>
        </View>
      </View>
      <View style={styles.overview}>
        <Text style={styles.overviewText}>
          {current?.description?.trim() || 'No description has been added for this lecture yet.'}
        </Text>
        {wide ? <Text style={styles.shortcuts}>Keyboard: Space to play or pause · ← → to skip {props.skipSeconds}s · F for full screen</Text> : null}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, wide && styles.contentWide]}>
      {wide ? (
        <>
          {rail}
          {main}
        </>
      ) : (
        <>
          {main}
          {rail}
        </>
      )}
    </ScrollView>
  );
}

/** Tracks the mounted <video>'s buffering and duration for display. Never controls playback. */
function useMediaElementState(videoViewRef: React.RefObject<VideoView | null>, player: VideoPlayer, ready: boolean) {
  const [buffering, setBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);
  const [paused, setPaused] = useState(true);
  const [element, setElement] = useState<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video: HTMLVideoElement | null = (videoViewRef.current as any)?.nativeRef?.current ?? null;
    if (!video) return;
    const sync = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setHasFrame(video.readyState >= 2);
      setPaused(video.paused);
      // Waiting for data: a source is set but the next frame isn't available (initial load, stall or seek).
      setBuffering(!!video.currentSrc && !video.error && (video.seeking || video.readyState < 3) && !video.ended);
    };
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.setAttribute('controlsList', 'nodownload noremoteplayback nofullscreen');
    const preventMenu = (e: Event) => e.preventDefault();
    video.addEventListener('contextmenu', preventMenu);
    setElement(video);
    const events = ['play', 'pause', 'loadstart', 'loadedmetadata', 'durationchange', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'stalled', 'seeking', 'seeked', 'progress', 'emptied', 'error', 'ended'];
    events.forEach((e) => video.addEventListener(e, sync));
    sync();
    return () => {
      events.forEach((e) => video.removeEventListener(e, sync));
      video.removeEventListener('contextmenu', preventMenu);
    };
  }, [videoViewRef, player, ready]);
  return { buffering, duration, hasFrame, paused, element };
}

function StageLoader({ label }: { label: string }) {
  // States design, "Video buffering": a 36px ring on the dark stage, no text.
  return (
    <View style={styles.loader} pointerEvents="none">
      <Spinner size={36} thickness={3} track={palette.borderDark} head={palette.teal400} label={label} />
    </View>
  );
}

function CtrlBtn({
  icon,
  size,
  label,
  onPress,
  disabled,
  flip,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  flip?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(s: PressState) => [styles.ctrl, s.hovered && !disabled && { backgroundColor: palette.navy700 }]}
    >
      <Ionicons name={icon} size={size} color={palette.textOnDark} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />
    </Pressable>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  expandedCard: { position: 'fixed' as any, top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, borderRadius: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column' },
  expandedStage: { flex: 1, aspectRatio: undefined },
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 72, gap: 24 },
  contentWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 32, paddingTop: 24, paddingBottom: 96 },

  rail: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  railWide: {
    width: 300,
    flexShrink: 0,
    position: 'sticky' as any,
    top: 24,
    maxHeight: 'calc(100vh - 136px)' as any,
  },
  railHead: { paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: line, gap: 10 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { ...text, fontSize: 13, color: muted, flexShrink: 1 },
  railTitle: { ...display, fontSize: 16, fontWeight: '600', color: ink },
  railMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  railPct: { ...text, fontSize: 12, color: muted },
  trackLight: { height: 4, borderRadius: 2, backgroundColor: lineSoft, overflow: 'hidden' },
  fillPrimary: { height: '100%', backgroundColor: colors.primary },
  railList: { flexGrow: 0, flexShrink: 1 },
  railItem: { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: lineSoft, backgroundColor: '#ffffff' },
  railItemCurrent: { backgroundColor: palette.teal50, boxShadow: `inset 2px 0 0 ${colors.primary}` } as any,
  railItemHover: { backgroundColor: palette.slate50 },
  railIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  railItemTitle: { ...text, fontSize: 13, lineHeight: 18, fontWeight: '500', color: ink },
  railItemSub: { ...text, fontSize: 12, color: muted, marginTop: 3 },

  main: { gap: 24 },
  mainWide: { flex: 1, minWidth: 0 },

  videoCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: palette.navy950 },
  videoStage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: palette.navy900 },
  videoEl: { width: '100%', height: '100%', display: 'block' } as any,
  stageHit: { ...StyleSheet.absoluteFillObject, cursor: 'pointer' } as any,
  bigPlay: {
    position: 'absolute',
    left: '6%',
    bottom: '9%',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.textOnDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayNarrow: { width: 52, height: 52, borderRadius: 26 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: 'rgba(8,19,40,0.82)',
  },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,15,34,0.35)', zIndex: 2 },
  overlayText: { ...text, color: palette.textOnDark, fontSize: 15, textAlign: 'center', maxWidth: 460 },
  overlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 16, borderRadius: 8, backgroundColor: palette.textOnDark },
  overlayBtnText: { ...text, fontSize: 14, fontWeight: '600', color: ink },

  controls: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: palette.navy850, gap: 10 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ctrl: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  time: { ...mono, fontSize: 12, fontWeight: '500', color: palette.textOnDarkBody, marginLeft: 8 },
  speeds: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: 7, backgroundColor: palette.navy750, borderWidth: 1, borderColor: darkLine },
  speedBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 5 },
  speedBtnOn: { backgroundColor: palette.textOnDark },
  speedText: { ...mono, fontSize: 12, fontWeight: '500', color: palette.textOnDarkBody },
  speedTextOn: { color: ink },

  titleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
  h1: { ...display, fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, color: ink },
  meta: { ...text, marginTop: 8, fontSize: 14, color: muted },
  navBtns: { flexDirection: 'row', gap: 8 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: line, borderRadius: 8, backgroundColor: '#ffffff' },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnDisabled: { opacity: 0.45 },

  credit: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: line, borderRadius: 12, backgroundColor: '#ffffff' },
  creditText: { ...text, flex: 1, fontSize: 13, color: body },
  creditPct: { ...mono, fontSize: 12, fontWeight: '500', color: ink },
  nextNote: { ...text, fontSize: 13, color: muted },

  tabs: { flexDirection: 'row', gap: 28, borderBottomWidth: 1, borderBottomColor: line },
  tabOn: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: colors.primary, marginBottom: -1 },
  tabOnText: { ...text, fontSize: 14, fontWeight: '600', color: ink },
  overview: { gap: 16, maxWidth: 760 },
  overviewText: { ...text, fontSize: 15, lineHeight: 26, color: body },
  shortcuts: { ...text, fontSize: 12, color: muted },
});
