import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playbackSpeedLabel, type PlaybackSettingsProps } from './PlaybackSettings.types';

export function PlaybackSettings({ speed, speeds, disabled, onSpeed }: PlaybackSettingsProps) {
  const [page, setPage] = useState<'settings' | 'speeds' | null>(null);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Settings" disabled={disabled} onPress={() => setPage('settings')} style={styles.gear}>
      <Ionicons name="settings-outline" size={21} color="#f8fafc" />
    </Pressable>
    <Modal visible={!!page} transparent animationType="fade" onRequestClose={() => setPage(null)}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close settings" style={StyleSheet.absoluteFillObject} onPress={() => setPage(null)} />
        <View style={styles.sheet}>
          <Pressable onPress={() => page === 'speeds' ? setPage('settings') : setPage(null)} style={styles.row} accessibilityRole="button" accessibilityLabel={page === 'speeds' ? 'Back to settings' : 'Close settings'}>
            <Text style={styles.title}>{page === 'speeds' ? '‹ Playback speed' : 'Settings'}</Text>
            {page === 'settings' ? <Ionicons name="close" color="#f8fafc" size={22} /> : null}
          </Pressable>
          <ScrollView>
            {page === 'settings' ? <Pressable style={styles.row} accessibilityRole="button" onPress={() => setPage('speeds')}>
              <Text style={styles.text}>Playback speed</Text><Text style={styles.text}>{playbackSpeedLabel(speed)} ›</Text>
            </Pressable> : speeds.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === speed }} style={styles.row} onPress={() => { onSpeed(value); setPage(null); }}>
              <Text style={styles.text}>{playbackSpeedLabel(value)}</Text>
              {value === speed ? <Ionicons name="checkmark" size={20} color="#2dd4bf" /> : null}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  gear: { padding: 8 }, backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, maxHeight: '80%', backgroundColor: '#13223a', borderRadius: 14, paddingVertical: 8 },
  row: { paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { fontSize: 15, color: '#f8fafc' }, title: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
});
