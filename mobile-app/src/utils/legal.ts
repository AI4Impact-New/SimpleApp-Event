import { Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://www.ai4impact.in/privacy/';
/** Published website policy last updated 1 October 2026; existing consents are retained. */
export const PRIVACY_POLICY_VERSION = '2026-10-01';
export const openPrivacyPolicy = () => Linking.openURL(PRIVACY_POLICY_URL);
