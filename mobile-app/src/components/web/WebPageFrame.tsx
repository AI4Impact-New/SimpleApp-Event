// Centers a signed-in screen in the site's content column on web. Native renders the screen untouched.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useWebLayout } from '@/hooks/useWebLayout';
import { colors, layout } from '@/theme/colors';

// Forms, reading and single-task pages read better in a narrower column than the full container.
const READING_ROUTES = new Set([
  'EditProfile',
  'PrivacyPolicy',
  'Checkout',
  'Exam',
  'NotificationDetail',
  'VerifyCertificate',
  'Poll',
  'QRScanner',
  'InboxMain',
  'ProfileMain',
  'Purchases',
  'Certificates',
]);

export function WebPageFrame({ routeName, children }: { routeName: string; children: React.ReactNode }) {
  const { isWeb, wide } = useWebLayout();
  if (!isWeb) return <>{children}</>;
  return (
    <View style={styles.page}>
      <View
        style={[
          styles.column,
          wide && styles.columnWide,
          wide && READING_ROUTES.has(routeName) && styles.columnReading,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: layout.container,
    // Screens pad themselves by ~16-20px; together this lands on the landing page's 24px+ gutter.
    paddingHorizontal: layout.containerPad - 16,
    paddingTop: 16,
  },
  columnReading: {
    maxWidth: 880,
  },
});
