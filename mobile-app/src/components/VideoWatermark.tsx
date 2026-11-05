// Identity is issued by the enrollment-gated playback API, never entered by the viewer.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PlaybackWatermark } from '@/types/learning';

// Corners/centre avoid a fixed crop; the measured label always stays inside the video stage.
const POSITIONS = [[0.04, 0.08], [0.92, 0.12], [0.12, 0.78], [0.88, 0.72], [0.45, 0.4]];
export function VideoWatermark({ identity }: { identity: PlaybackWatermark }) {
  const [slot, setSlot] = useState(() => Math.floor(Math.random() * POSITIONS.length));
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [label, setLabel] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const timer = setInterval(() => setSlot(current =>
      (current + 1 + Math.floor(Math.random() * (POSITIONS.length - 1))) % POSITIONS.length
    ), Math.max(20, Math.min(40, identity.move_interval_seconds || 25)) * 1000);
    return () => clearInterval(timer);
  }, [identity.student_id, identity.move_interval_seconds]);
  return (
    <View pointerEvents="none" style={styles.stage} onLayout={e => setStage(e.nativeEvent.layout)}>
      <View testID="video-watermark" onLayout={e => setLabel(e.nativeEvent.layout)} style={[styles.label, {
        maxWidth: '92%',
        left: Math.max(0, stage.width - label.width) * POSITIONS[slot][0],
        top: Math.max(0, stage.height - label.height) * POSITIONS[slot][1],
      }]}>
        <Text style={styles.company}>{identity.company}</Text>
        <Text style={styles.id}>Student ID: {identity.student_id}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  stage: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  label: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.48)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4 },
  company: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  id: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
});
