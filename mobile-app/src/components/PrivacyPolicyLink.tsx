import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import { PRIVACY_POLICY_URL, openPrivacyPolicy } from '@/utils/legal';

export function PrivacyPolicyLink({ children = 'Privacy Policy' }: { children?: React.ReactNode }) {
  if (Platform.OS === 'web') return <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#078573', textDecoration: 'underline' }}>{children}</a>;
  return <Text style={styles.link} accessibilityRole="link" onPress={() => { openPrivacyPolicy(); }}>{children}</Text>;
}
const styles = StyleSheet.create({ link: { color: '#078573', textDecorationLine: 'underline' } });
