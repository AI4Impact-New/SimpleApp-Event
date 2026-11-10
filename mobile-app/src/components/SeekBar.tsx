import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { SeekBarProps } from './SeekBar.types';
import { formatDuration } from '@/utils/datetime';

/** Native touch responder previews continuously and commits once on release. */
export function SeekBar({ position, duration, disabled, onSeek }: SeekBarProps) {
  const width = useRef(0);
  const target = useRef(position);
  const [preview, setPreview] = useState<number | null>(null);
  const value = preview ?? position;
  const percent = duration > 0 ? Math.max(0, Math.min(100, value * 100 / duration)) : 0;
  const update = (x: number) => {
    target.current = width.current > 0 ? Math.max(0, Math.min(1, x / width.current)) * duration : position;
    setPreview(target.current);
  };
  const enabled = !disabled && duration > 0;
  return <View accessibilityRole="adjustable" accessibilityLabel="Seek"
    accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(value), text: `${formatDuration(value)} of ${formatDuration(duration)}` }}
    accessibilityState={{ disabled: !enabled }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={e => { if (enabled) onSeek(Math.max(0, Math.min(duration, position + (e.nativeEvent.actionName === 'increment' ? 10 : -10)))); }}
    onLayout={e => { width.current = e.nativeEvent.layout.width; }} style={styles.root}
    onStartShouldSetResponder={() => enabled} onMoveShouldSetResponder={() => enabled}
    onResponderGrant={e => update(e.nativeEvent.locationX)} onResponderMove={e => update(e.nativeEvent.locationX)}
    onResponderRelease={e => { update(e.nativeEvent.locationX); onSeek(target.current); setPreview(null); }}
    onResponderTerminate={() => setPreview(null)}>
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
        <View style={[styles.thumb, { left: `${percent}%` }]} />
      </View>
    </View>;
}
const styles = StyleSheet.create({
  root: { height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: '#334155' },
  fill: { height: 4, backgroundColor: '#2dd4bf', borderRadius: 2 },
  thumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#f8fafc', transform: [{ translateX: -7 }] },
});
