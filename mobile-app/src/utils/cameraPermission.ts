// Camera permission with a way out when the user has permanently denied it (the OS prompt no longer appears)
import { Alert, Linking } from 'react-native';
import type { PermissionResponse } from 'expo-camera';

export async function ensureCameraPermission(
  permission: PermissionResponse | null,
  requestPermission: () => Promise<PermissionResponse>
): Promise<boolean> {
  if (permission?.granted) return true;
  if (permission && !permission.canAskAgain) {
    showCameraSettingsAlert();
    return false;
  }
  const next = await requestPermission();
  if (!next.granted && !next.canAskAgain) showCameraSettingsAlert();
  return next.granted;
}

export function showCameraSettingsAlert() {
  Alert.alert('Camera access is off', 'Allow camera access for AI4Impact in your device settings to scan QR codes.', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open settings', onPress: () => Linking.openSettings().catch(() => {}) },
  ]);
}
