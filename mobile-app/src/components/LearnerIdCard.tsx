// Learner identity card: avatar, name, learner ID and current course. Used in the home sidebar and Programme+.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyProfile } from '@/hooks/useMyProfile';
import { initialsFor, learnerIdFromUuid } from '@/utils/learnerId';
import { fonts, palette } from '@/theme/colors';

const isWeb = Platform.OS === 'web';
const canCopy = isWeb && typeof navigator !== 'undefined' && !!navigator.clipboard;

export function LearnerIdCard({ name, courseTitle }: { name?: string | null; courseTitle?: string | null }) {
  const profile = useMyProfile();
  const [copied, setCopied] = useState(false);
  // Full profile name first; `name` (often just a first name) is only a fallback while the profile loads.
  const displayName = profile.data?.name || name || profile.data?.email || 'Learner';
  const learnerId = learnerIdFromUuid(profile.data?.id);

  const copy = async () => {
    if (!learnerId) return;
    try {
      await navigator.clipboard.writeText(learnerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked by the browser; the ID stays selectable.
    }
  };

  return (
    <View style={styles.card} accessibilityLabel={`Learner card. ${displayName}. Learner ID ${learnerId ?? 'loading'}`}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(displayName) || '?'}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.idRow}>
            <Text style={styles.id} selectable numberOfLines={1}>
              {learnerId ?? (profile.isLoading ? 'Loading ID…' : '—')}
            </Text>
            {canCopy && learnerId ? (
              <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copy learner ID" hitSlop={8}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color={copied ? palette.teal600 : palette.slate400} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {courseTitle ? (
        <Text style={styles.course} numberOfLines={2}>
          {courseTitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.slate100, borderWidth: 1, borderColor: palette.slate200, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.teal600, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: isWeb ? fonts.body : undefined, fontSize: 15, fontWeight: '700', color: '#ffffff' },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: isWeb ? fonts.body : undefined, fontSize: 15, fontWeight: '700', color: palette.navy850 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  id: { fontFamily: isWeb ? fonts.mono : Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, letterSpacing: 0.4, color: palette.slate600 },
  course: { fontFamily: isWeb ? fonts.body : undefined, fontSize: 13, lineHeight: 18, color: palette.slate600 },
});
