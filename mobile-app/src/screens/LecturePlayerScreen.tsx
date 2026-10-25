// Lecture Player Screen – signed MP4 playback with server-credited progress heartbeats
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Pressable,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from '@/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { LearningClass, LectureProgress } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatDuration } from '@/utils/datetime';

interface LecturePlayerScreenProps {
  classId: string;
  courseId?: string;
  title: string;
  onBack: () => void;
  onPlayNext?: (lecture: LearningClass) => void;
}

// Backend credits at most elapsed × 1.5 + 2s per heartbeat, so faster speeds would lose credit.
const SPEEDS = [0.75, 1, 1.25, 1.5];
const MAX_SPEED = 1.5;
const HEARTBEAT_MS = 20_000;
// Renew the signed URL/session this long before its expiry.
const RENEW_BEFORE_EXPIRY_MS = 2 * 60_000;
// Auto-renew the signed URL after a player error (e.g. CloudFront 403) at most once per this interval.
const AUTO_RENEW_COOLDOWN_MS = 60_000;
const SKIP_SECONDS = 10;

/** Map access-window errors (playback or heartbeat) to a terminal state. */
function blockedState(err: any): LoadState | null {
  const status = err?.response?.status;
  if (status === 403) {
    return { kind: 'blocked', reason: 'locked', message: apiErrorMessage(err, 'Complete the previous lecture to unlock this one.') };
  }
  if (status === 410) {
    return { kind: 'blocked', reason: 'expired', message: apiErrorMessage(err, 'The viewing window for this lecture has ended.') };
  }
  return null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  // Server-enforced access window: 403 locked behind an earlier lecture, 410 seven-day window over. Retrying won't help.
  | { kind: 'blocked'; reason: 'locked' | 'expired'; message: string }
  | { kind: 'error'; message: string };

/** Next recorded lecture after `classId` by sort order — whatever its server-reported access state. */
function findNextRecorded(classes: LearningClass[], classId: string): LearningClass | null {
  const recorded = classes
    .filter((c) => c.class_type === 'recorded')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const index = recorded.findIndex((c) => c.id === classId);
  return index >= 0 ? recorded[index + 1] ?? null : null;
}

export function LecturePlayerScreen({ classId, courseId, title, onBack, onPlayNext }: LecturePlayerScreenProps) {
  const queryClient = useQueryClient();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [progress, setProgress] = useState<LectureProgress | null>(null);
  // Next lecture as reported by the server after this one completes; null = none / not fetched.
  const [nextLecture, setNextLecture] = useState<LearningClass | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  // Mirrors of player state for the app's own control bar (native controls differ per platform and hide on web)
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const videoViewRef = useRef<VideoView>(null);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 1;
  });

  const sessionRef = useRef<string | null>(null);
  const creditDurationRef = useRef(0);
  const positionRef = useRef(0);
  const playingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const renewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const lastAutoRenewRef = useRef(0);

  /** Access window closed or lecture locked: stop playback and heartbeats for good. */
  const enterBlocked = useCallback(
    (state: LoadState) => {
      sessionRef.current = null;
      if (!mountedRef.current) return;
      player.pause();
      setLoadState(state);
    },
    [player]
  );

  // Heartbeats are serialized: one request in flight, and only the newest queued position is sent next,
  // so an older position can never arrive after a newer one.
  const inFlightRef = useRef(false);
  const queuedRef = useRef<number | null>(null);
  // Set when a heartbeat fails without a response; heartbeats pause until progress can be re-read.
  const offlineRef = useRef(false);
  const reconnectingRef = useRef(false);

  /** Re-read this lecture's server-credited progress (after a session conflict or reconnecting). Throws on failure. */
  const refreshProgress = useCallback(async () => {
    if (!courseId) return;
    const result = await api.getCourseProgress(courseId);
    const row = result.classes?.find((c) => c.id === classId);
    if (!row || !mountedRef.current) return;
    const duration = Number(row.duration_seconds) || 0;
    const watched = Number(row.watched_seconds) || 0;
    setProgress({
      class_id: row.id,
      completed: !!row.completed,
      watched_seconds: watched,
      duration_seconds: duration,
      progress_percentage: duration > 0 ? (watched * 100) / duration : 0,
    });
  }, [courseId, classId]);

  /** Fetch a fresh signed URL + session and (re)load it at `seekTo` (defaults to server resume position). */
  const openSession = useCallback(
    async (seekTo?: number, autoplay = false) => {
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      try {
        const playback = await api.getPlayback(classId);
        if (!mountedRef.current) return;
        sessionRef.current = playback.session_id;
        const start = seekTo ?? playback.resume_seconds ?? 0;
        // Restart from the beginning when resuming at the very end.
        const duration = playback.duration_seconds || 0;
        creditDurationRef.current = duration;
        pendingSeekRef.current = duration > 0 && start >= duration - 2 ? 0 : start;
        positionRef.current = pendingSeekRef.current;
        await player.replaceAsync({ uri: playback.url });
        player.playbackRate = speedRef.current;
        if (autoplay) player.play();
        else player.pause();
        offlineRef.current = false;
        setLoadState({ kind: 'ready' });
        // expires_in may be shortened by the lecture's access window; renew ahead of it either way.
        const ttlMs = playback.expires_in * 1000;
        renewTimerRef.current = setTimeout(
          () => openSession(positionRef.current, playingRef.current),
          Math.max(5_000, ttlMs - Math.min(RENEW_BEFORE_EXPIRY_MS, ttlMs / 4))
        );
      } catch (err: any) {
        if (!mountedRef.current) return;
        const blocked = blockedState(err);
        if (blocked) enterBlocked(blocked);
        else if (err?.response?.status === 409) setLoadState({ kind: 'unavailable' });
        else setLoadState({ kind: 'error', message: apiErrorMessage(err, 'Could not load this lecture.') });
      }
    },
    [classId, player, enterBlocked]
  );

  const flushHeartbeats = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      while (queuedRef.current != null && sessionRef.current && !offlineRef.current) {
        const position = queuedRef.current;
        queuedRef.current = null;
        try {
          const result = await api.sendLectureProgress(classId, sessionRef.current, position);
          if (mountedRef.current) setProgress(result);
        } catch (err: any) {
          const status = err?.response?.status;
          const blocked = blockedState(err);
          if (blocked) enterBlocked(blocked);
          else if (status === 409) {
            // Session expired or replaced: start a fresh one at the current position, then re-read progress.
            if (mountedRef.current) {
              await openSession(positionRef.current, playingRef.current);
              refreshProgress().catch(() => {});
            }
          } else if (!err?.response) {
            // Offline: stop sending until progress can be re-read.
            offlineRef.current = true;
            player.pause();
            if (mountedRef.current) setLoadState({ kind: 'error', message: 'Connection lost. Playback is paused while we reconnect.' });
          }
          // Never replay a backlog of heartbeats.
          queuedRef.current = null;
          break;
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [classId, openSession, enterBlocked, refreshProgress, player]);

  const heartbeat = useCallback(() => {
    if (!sessionRef.current || offlineRef.current) return;
    queuedRef.current = positionRef.current;
    flushHeartbeats();
  }, [flushHeartbeats]);

  // Initial load + cleanup (final heartbeat on leaving the player)
  useEffect(() => {
    mountedRef.current = true;
    offlineRef.current = false;
    queuedRef.current = null;
    openSession();
    return () => {
      mountedRef.current = false;
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      queuedRef.current = positionRef.current;
      // Refresh course progress once the final heartbeat has landed, not before.
      flushHeartbeats().finally(() => {
        queryClient.invalidateQueries({ queryKey: ['learning'] });
        queryClient.invalidateQueries({ queryKey: ['me', 'learning'] });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    // Media metadata can include a fractional tail beyond the server's integer duration.
    positionRef.current = Math.min(currentTime, creditDurationRef.current || currentTime);
    setPosition(currentTime);
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'readyToPlay' && pendingSeekRef.current != null) {
      player.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
    if (status === 'error') {
      // Typically an expired/forbidden signed URL (CloudFront 403) or a network failure.
      // Fetch a fresh signed URL once; if that also fails, show the retry state.
      const now = Date.now();
      if (now - lastAutoRenewRef.current > AUTO_RENEW_COOLDOWN_MS) {
        lastAutoRenewRef.current = now;
        setLoadState({ kind: 'loading' });
        openSession(positionRef.current || undefined, playingRef.current);
      } else {
        setLoadState({ kind: 'error', message: error?.message ?? 'Playback failed.' });
      }
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    playingRef.current = isPlaying;
    setIsPlaying(isPlaying);
    if (!isPlaying) heartbeat(); // final heartbeat on pause
  });

  useEventListener(player, 'playToEnd', () => {
    positionRef.current = Math.min(
      player.duration || positionRef.current,
      creditDurationRef.current || Infinity
    );
    heartbeat();
  });

  // Native controls may offer faster speeds; clamp them.
  useEventListener(player, 'playbackRateChange', ({ playbackRate }) => {
    if (playbackRate > MAX_SPEED) player.playbackRate = MAX_SPEED;
  });

  // Periodic heartbeat while actively playing; while offline, probe by re-reading progress instead
  useEffect(() => {
    const id = setInterval(() => {
      if (offlineRef.current && !reconnectingRef.current) {
        reconnectingRef.current = true;
        refreshProgress()
          // Restart credit at the paused position; never credit disconnected time.
          .then(() => { if (mountedRef.current) return openSession(positionRef.current, false); })
          .catch((err) => {
            const blocked = blockedState(err);
            if (blocked) { offlineRef.current = false; enterBlocked(blocked); }
          })
          .finally(() => { reconnectingRef.current = false; });
      } else if (playingRef.current) heartbeat();
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [heartbeat, refreshProgress, openSession, enterBlocked]);

  // Heartbeat when backgrounding
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') heartbeat();
    });
    return () => sub.remove();
  }, [heartbeat]);

  // Once the server marks this lecture complete, refetch course progress for the next lecture's real access state.
  const completed = !!progress?.completed;
  useEffect(() => {
    if (!completed || !courseId) return;
    let cancelled = false;
    setNextLoading(true);
    api
      .getCourseProgress(courseId)
      .then((result) => {
        if (!cancelled) setNextLecture(findNextRecorded(result.classes ?? [], classId));
      })
      .catch(() => {
        if (!cancelled) setNextLecture(null);
      })
      .finally(() => {
        if (!cancelled) setNextLoading(false);
      });
    queryClient.invalidateQueries({ queryKey: ['learning', 'course', courseId] });
    return () => {
      cancelled = true;
    };
  }, [completed, courseId, classId, queryClient]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    speedRef.current = value;
    player.playbackRate = value;
  };

  const ready = loadState.kind === 'ready';
  const videoDuration = player.duration || progress?.duration_seconds || 0;

  const togglePlay = () => {
    if (!ready) return;
    if (player.playing) player.pause();
    else player.play();
  };

  /** Seeking moves the playhead only; the server never credits skipped time. */
  const seekTo = (seconds: number) => {
    if (!ready) return;
    const target = Math.max(0, videoDuration > 0 ? Math.min(seconds, videoDuration - 0.5) : seconds);
    player.currentTime = target;
    positionRef.current = target;
    setPosition(target);
  };

  const seekFromBar = (event: GestureResponderEvent) => {
    if (barWidth <= 0 || videoDuration <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / barWidth));
    seekTo(ratio * videoDuration);
  };

  const retry = () => {
    setLoadState({ kind: 'loading' });
    openSession(positionRef.current || undefined);
  };

  const duration = progress?.duration_seconds ?? 0;
  const watchedPct = progress ? Math.min(100, Math.round(Number(progress.progress_percentage) || 0)) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} onBack={onBack} />

      <View style={styles.videoWrap}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={styles.video}
          nativeControls
          contentFit="contain"
          // App is portrait-locked; fullscreen rotates to landscape and exits when rotated back.
          fullscreenOptions={{ enable: true, orientation: 'landscape', autoExitOnRotate: true }}
        />
        {loadState.kind !== 'ready' ? (
          <View style={styles.overlay}>
            {loadState.kind === 'loading' ? (
              <ActivityIndicator size="large" color={colors.white} />
            ) : loadState.kind === 'unavailable' ? (
              <Text style={styles.overlayText}>Recording not available yet</Text>
            ) : loadState.kind === 'blocked' ? (
              <>
                <Ionicons
                  name={loadState.reason === 'locked' ? 'lock-closed' : 'hourglass-outline'}
                  size={32}
                  color={colors.white}
                />
                <Text style={styles.overlayText}>{loadState.message}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={onBack} activeOpacity={0.75}>
                  <Text style={styles.retryText}>Back to course</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.overlayText}>{loadState.message}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.75}>
                  <Ionicons name="refresh" size={18} color={colors.white} />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.controls, !ready && styles.controlsDisabled]}>
        <Pressable
          style={styles.seekBar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          onPress={seekFromBar}
          disabled={!ready}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
          accessibilityValue={{ min: 0, max: Math.round(videoDuration), now: Math.round(position) }}
        >
          <View style={styles.seekTrack}>
            <View
              style={[
                styles.seekFill,
                { width: `${videoDuration > 0 ? Math.min(100, (position / videoDuration) * 100) : 0}%` },
              ]}
            />
          </View>
        </Pressable>
        <View style={styles.controlRow}>
          <Text style={styles.timeText}>
            {formatDuration(position)} / {formatDuration(videoDuration)}
          </Text>
          <View style={styles.controlButtons}>
            <TouchableOpacity
              onPress={() => seekTo(position - SKIP_SECONDS)}
              disabled={!ready}
              style={styles.controlBtn}
              accessibilityRole="button"
              accessibilityLabel={`Back ${SKIP_SECONDS} seconds`}
            >
              <Ionicons name="play-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={togglePlay}
              disabled={!ready}
              style={[styles.controlBtn, styles.playBtn]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => seekTo(position + SKIP_SECONDS)}
              disabled={!ready}
              style={styles.controlBtn}
              accessibilityRole="button"
              accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
            >
              <Ionicons name="play-forward" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => videoViewRef.current?.enterFullscreen().catch(() => {})}
            disabled={!ready}
            style={styles.controlBtn}
            accessibilityRole="button"
            accessibilityLabel="Full screen"
          >
            <Ionicons name="expand" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Playback speed</Text>
        <View style={styles.speedRow}>
          {SPEEDS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.speedChip, speed === s && styles.speedChipActive]}
              onPress={() => changeSpeed(s)}
              activeOpacity={0.75}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{s}×</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.progressCard}>
          {progress?.completed ? (
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.completedText}>Lecture completed</Text>
            </View>
          ) : (
            <Text style={styles.progressTitle}>Watch at least 90% of the lecture to complete it.</Text>
          )}
          {progress && duration > 0 ? (
            <Text style={styles.muted}>
              {formatDuration(progress.watched_seconds)} of {formatDuration(duration)} watched ({watchedPct}%)
            </Text>
          ) : null}
          <Text style={styles.muted}>Skipped or repeated sections don't count toward completion.</Text>
        </View>

        {completed && onPlayNext && (nextLoading || nextLecture) ? (
          <View style={styles.nextCard}>
            {nextLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : nextLecture ? (
              <>
                <Text style={styles.muted}>Up next</Text>
                <Text style={styles.progressTitle}>{nextLecture.title}</Text>
                {(nextLecture.access_state ?? 'available') === 'available' ? (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => {
                      player.pause();
                      onPlayNext(nextLecture);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="play" size={18} color={colors.white} />
                    <Text style={styles.retryText}>Play next lecture</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.muted}>
                    {nextLecture.access_state === 'not_ready'
                      ? 'Recording not published yet.'
                      : nextLecture.access_state === 'expired'
                        ? 'Access expired. Contact course staff to reopen access.'
                        : 'Not unlocked yet. Check back on the course page.'}
                  </Text>
                )}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  overlayText: {
    color: colors.white,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
  controls: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  controlsDisabled: {
    opacity: 0.5,
  },
  seekBar: {
    paddingVertical: spacing.sm,
  },
  seekTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  seekFill: {
    height: 4,
    backgroundColor: colors.primary,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlBtn: {
    padding: spacing.sm,
  },
  playBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  timeText: {
    color: colors.white,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 90,
  },
  body: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  speedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speedChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  speedChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  speedTextActive: {
    color: colors.white,
  },
  progressCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
  nextCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
