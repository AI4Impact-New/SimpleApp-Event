// Lecture Player Screen – signed MP4 playback with server-credited progress heartbeats
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { LectureProgress } from '@/types/learning';
import { colors, spacing, borderRadius } from '@/theme/colors';
import { formatDuration } from '@/utils/datetime';

interface LecturePlayerScreenProps {
  classId: string;
  title: string;
  onBack: () => void;
}

// Backend credits at most elapsed × 1.5 + 2s per heartbeat, so faster speeds would lose credit.
const SPEEDS = [0.75, 1, 1.25, 1.5];
const MAX_SPEED = 1.5;
const HEARTBEAT_MS = 20_000;
// Renew the signed URL/session this long before its expiry.
const RENEW_BEFORE_EXPIRY_MS = 2 * 60_000;
// Auto-renew the signed URL after a player error (e.g. CloudFront 403) at most once per this interval.
const AUTO_RENEW_COOLDOWN_MS = 60_000;

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

export function LecturePlayerScreen({ classId, title, onBack }: LecturePlayerScreenProps) {
  const queryClient = useQueryClient();
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [progress, setProgress] = useState<LectureProgress | null>(null);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 1;
  });

  const sessionRef = useRef<string | null>(null);
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
        pendingSeekRef.current = duration > 0 && start >= duration - 2 ? 0 : start;
        positionRef.current = pendingSeekRef.current;
        await player.replaceAsync({ uri: playback.url });
        player.playbackRate = speedRef.current;
        if (autoplay) player.play();
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
      while (queuedRef.current != null && sessionRef.current) {
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
            // Session expired or replaced: start a fresh one at the current position.
            if (mountedRef.current) await openSession(positionRef.current, playingRef.current);
          }
          // Offline/other errors: drop it. Never replay a backlog of heartbeats.
          queuedRef.current = null;
          break;
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [classId, openSession, enterBlocked]);

  const heartbeat = useCallback(() => {
    if (!sessionRef.current) return;
    queuedRef.current = positionRef.current;
    flushHeartbeats();
  }, [flushHeartbeats]);

  // Initial load + cleanup (final heartbeat on leaving the player)
  useEffect(() => {
    mountedRef.current = true;
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
    positionRef.current = currentTime;
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
    if (!isPlaying) heartbeat(); // final heartbeat on pause
  });

  useEventListener(player, 'playToEnd', () => {
    positionRef.current = player.duration || positionRef.current;
    heartbeat();
  });

  // Native controls may offer faster speeds; clamp them.
  useEventListener(player, 'playbackRateChange', ({ playbackRate }) => {
    if (playbackRate > MAX_SPEED) player.playbackRate = MAX_SPEED;
  });

  // Periodic heartbeat while actively playing
  useEffect(() => {
    const id = setInterval(() => {
      if (playingRef.current) heartbeat();
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [heartbeat]);

  // Heartbeat when backgrounding
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') heartbeat();
    });
    return () => sub.remove();
  }, [heartbeat]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    speedRef.current = value;
    player.playbackRate = value;
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
          player={player}
          style={styles.video}
          nativeControls
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
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
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
