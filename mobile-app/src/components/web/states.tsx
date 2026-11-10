// Shared loading, empty, error and button states for the browser portal (design: "States.dc.html").
// Rule from the design: page loads show skeletons in the final layout's shape; spinners are only for actions
// the user started (a button press, a vote). Screens compose these instead of copying the styles.
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spinner } from '@/components/web/Spinner';
import { apiErrorMessage } from '@/services/apiErrors';
import { fonts, palette } from '@/theme/colors';

export { Spinner };

type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;
type Size = number | `${number}%`;

const ink = palette.navy850;
const body = palette.slate600;
const line = palette.slate200;
const errorInk = '#b4321f';

// ---- Skeletons ----

/** One pulsing colour for every bone in a skeleton. Call once per skeleton so its bones pulse together. */
export function useShimmer() {
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

export type ShimmerColor = ReturnType<typeof useShimmer>;

/** A single placeholder bar. `color` comes from `useShimmer()`. */
export function Skeleton({ w, h, r = 4, color, style }: { w: Size; h: number; r?: number; color: ShimmerColor; style?: StyleProp<ViewStyle> }) {
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: color }, style]} />;
}

/** A white card of stacked bars, e.g. `rows={[['30%', 12], ['90%', 20]]}` for a label above a title. */
export function SkeletonCard({ rows, style }: { rows: [Size, number][]; style?: StyleProp<ViewStyle> }) {
  const color = useShimmer();
  return (
    <View style={[styles.card, styles.skCard, style]} aria-busy>
      {rows.map(([w, h], i) => (
        <Skeleton key={i} w={w} h={h} color={color} />
      ))}
    </View>
  );
}

/** A card holding a divided list: optional leading circle, two text lines, trailing meta. */
export function SkeletonList({ count = 4, avatar = true, trailing = true, style }: { count?: number; avatar?: boolean; trailing?: boolean; style?: StyleProp<ViewStyle> }) {
  const color = useShimmer();
  return (
    <View style={[styles.card, style]} aria-busy>
      {Array.from({ length: count }, (_, k) => (
        <View key={k} style={[styles.skRow, k < count - 1 && styles.skRowDivider]}>
          {avatar ? <Skeleton w={28} h={28} r={14} color={color} /> : null}
          <View style={styles.skRowText}>
            <Skeleton w="65%" h={14} color={color} />
            <Skeleton w="40%" h={10} color={color} />
          </View>
          {trailing ? <Skeleton w={44} h={12} color={color} /> : null}
        </View>
      ))}
    </View>
  );
}

// ---- Buttons ----

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Shows a spinner and blocks presses; pass `loadingLabel` to change the text while busy (e.g. "Saving…"). */
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  /** Stretch to the parent's width (forms, narrow layouts). */
  block?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const BUTTON_TONES: Record<ButtonVariant, { bg: string; bgHover: string; border: string; borderHover: string; fg: string; spinTrack: string }> = {
  primary: { bg: palette.navy800, bgHover: palette.navy700, border: palette.navy800, borderHover: palette.navy700, fg: '#ffffff', spinTrack: '#2a3654' },
  outline: { bg: '#ffffff', bgHover: '#ffffff', border: line, borderHover: palette.slate300, fg: ink, spinTrack: palette.slate200 },
  ghost: { bg: 'transparent', bgHover: palette.slate100, border: 'transparent', borderHover: 'transparent', fg: ink, spinTrack: palette.slate200 },
  danger: { bg: '#ffffff', bgHover: '#fdf3f1', border: '#f1c7bf', borderHover: '#e6a397', fg: errorInk, spinTrack: '#f1c7bf' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  block = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const tone = BUTTON_TONES[variant];
  const inert = disabled || loading;
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={(s: PressState) => [
        styles.btn,
        sm && styles.btnSm,
        block && styles.btnBlock,
        { backgroundColor: tone.bg, borderColor: tone.border },
        !inert && s.hovered && { backgroundColor: tone.bgHover, borderColor: tone.borderHover },
        disabled && !loading && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <Spinner size={14} track={tone.spinTrack} head={variant === 'primary' ? palette.teal400 : tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={sm ? 15 : 16} color={tone.fg} />
      ) : null}
      <Text style={[styles.btnText, sm && styles.btnTextSm, { color: tone.fg }]} numberOfLines={1}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

// ---- Empty and error ----

export interface StateCardProps {
  icon: IconName;
  title: string;
  body: string;
  tone?: 'neutral' | 'error';
  /** Main action, rendered as a small primary button. */
  action?: { label: string; onPress: () => void; loading?: boolean; loadingLabel?: string };
  /** Optional second action, rendered as an outline button. */
  secondary?: { label: string; onPress: () => void };
  /** Centre the card in its column (full-page states) instead of filling the width. */
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The design's bordered empty/error card: icon tile, title, body, then up to two actions. */
export function StateCard({ icon, title, body: text, tone = 'neutral', action, secondary, centered, style }: StateCardProps) {
  const error = tone === 'error';
  return (
    <View style={[styles.card, styles.state, centered && styles.stateCentered, style]} role={error ? 'alert' : undefined}>
      <View style={[styles.stateIcon, error && styles.stateIconError]}>
        <Ionicons name={icon} size={18} color={error ? errorInk : body} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{text}</Text>
      {action || secondary ? (
        <View style={styles.stateActions}>
          {action ? (
            <Button size="sm" label={action.label} onPress={action.onPress} loading={action.loading} loadingLabel={action.loadingLabel} />
          ) : null}
          {secondary ? <Button size="sm" variant="outline" label={secondary.label} onPress={secondary.onPress} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Nothing to show yet. Keep the copy specific: say what will appear here and how to get it. */
export function EmptyState(props: Omit<StateCardProps, 'tone'>) {
  return <StateCard {...props} tone="neutral" />;
}

/**
 * A failed load. Pass the query `error` and the copy is derived from the shared HTTP policy (offline, 429, 5xx,
 * server message); `retrying` keeps the button busy while a refetch runs.
 */
export function ErrorState({
  title = 'Something went wrong',
  error,
  fallback = 'Check your connection and try again.',
  onRetry,
  retrying = false,
  secondary,
  icon = 'cloud-offline-outline',
  centered,
  style,
}: {
  title?: string;
  error?: unknown;
  fallback?: string;
  onRetry?: () => void;
  retrying?: boolean;
  secondary?: { label: string; onPress: () => void };
  icon?: IconName;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <StateCard
      tone="error"
      icon={icon}
      title={title}
      body={apiErrorMessage(error, fallback)}
      action={onRetry ? { label: 'Try again', onPress: onRetry, loading: retrying, loadingLabel: 'Retrying…' } : undefined}
      secondary={secondary}
      centered={centered}
      style={style}
    />
  );
}

/** One-line error under a field or action, announced to screen readers. Renders nothing without a message. */
export function InlineError({ message, style }: { message?: string | null; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  return (
    <View style={[styles.inline, style]} role="alert">
      <Ionicons name="alert-circle-outline" size={14} color={errorInk} />
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },

  skCard: { padding: 24, gap: 12 },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24 },
  skRowDivider: { borderBottomWidth: 1, borderBottomColor: palette.slate150 },
  skRowText: { flex: 1, gap: 8 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 8, height: 40, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1 },
  btnSm: { height: 36, paddingHorizontal: 14, gap: 6 },
  btnBlock: { alignSelf: 'stretch' },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...text, fontSize: 14, fontWeight: '600' },
  btnTextSm: { fontSize: 13 },

  state: { paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  stateCentered: { alignSelf: 'center', width: '100%', maxWidth: 480, marginTop: 48 },
  stateIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  stateIconError: { borderColor: '#f1c7bf', backgroundColor: '#fdf3f1' },
  stateTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  stateBody: { ...text, fontSize: 14, lineHeight: 22, color: body },
  stateActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },

  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  inlineText: { ...text, flex: 1, fontSize: 13, lineHeight: 18, color: errorInk },
});
