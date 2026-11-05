// Back-button header shared by the learning screens.
// On web it renders as a page heading (back link above a display title) instead of an app bar.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { colors, fonts, spacing } from '@/theme/colors';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const { isWeb } = useWebLayout();

  if (isWeb) {
    return (
      <View style={styles.webHeader}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.webBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={styles.webBackText}>Back</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.webTitleRow}>
          <Text style={styles.webTitle} numberOfLines={2} accessibilityRole="header">{title}</Text>
          {right}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}
      <Text style={[styles.title, !onBack && styles.titleNoBack]} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  backBtn: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  titleNoBack: {
    paddingLeft: spacing.md,
  },
  webHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  webBack: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  webBackText: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  webTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  webTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
    color: colors.text,
  },
});
