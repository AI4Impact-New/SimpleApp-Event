// Legacy bookmarked route: use the canonical published policy instead of a second policy copy.
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { PRIVACY_POLICY_URL, openPrivacyPolicy } from '@/utils/legal';
import { PrivacyPolicyLink } from '@/components/PrivacyPolicyLink';
export { PRIVACY_POLICY_VERSION } from '@/utils/legal';

export function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    if (Platform.OS === 'web') window.location.replace(PRIVACY_POLICY_URL);
    else openPrivacyPolicy();
  }, []);
  return <View style={{ padding: 24, gap: 16 }}>
    <Text>Read the AI4Impact Privacy Policy on our website.</Text>
    <PrivacyPolicyLink />
    <Text>{PRIVACY_POLICY_URL}</Text>
    <TouchableOpacity onPress={onBack}><Text>Back</Text></TouchableOpacity>
  </View>;
}
