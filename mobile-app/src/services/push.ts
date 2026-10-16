// Native push registration (Expo). The inbox works without this; push only adds delivery.
// Backend returns 503 from POST /me/devices until its expo_project_id Terraform variable is set.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { userStore } from '@/utils/userStorage';

const OPT_OUT_KEY = 'push_opt_out';
const ANDROID_CHANNEL = 'default';

type StoredDevice = { deviceId: string; token: string };

export type PushRegistrationResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'opted_out' | 'not_device' | 'no_project' | 'permission_denied' | 'not_configured' | 'error';
      message?: string;
    };

// Show banners for notifications that arrive while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Real EAS project UUID: app.json `extra.eas.projectId` (set by `eas init`) or EXPO_PUBLIC_EAS_PROJECT_ID. */
function easProjectId(): string | null {
  const fromConfig =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  return fromConfig || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || null;
}

const deviceStore = () => userStore<StoredDevice>('push_device');

export async function isPushOptedOut(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPT_OUT_KEY)) === '1';
  } catch {
    return false;
  }
}

async function registerToken(token: string, projectId: string): Promise<PushRegistrationResult> {
  const devices = await deviceStore();
  const stored = await devices.read();
  if (stored?.token === token) return { ok: true };
  try {
    const device = await api.registerDevice({
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      project_id: projectId,
      token,
    });
    await devices.write({ deviceId: device.id, token });
    return { ok: true };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 503) return { ok: false, reason: 'not_configured', message: 'Push notifications are not enabled on the server yet.' };
    return { ok: false, reason: 'error', message: err?.response?.data?.error ?? 'Could not register this device.' };
  }
}

/**
 * Ask permission (once), fetch the Expo push token and register it for the signed-in user.
 * Safe to call on every app start; it is a no-op when the token is already registered.
 */
export async function registerForPush(options: { prompt?: boolean } = {}): Promise<PushRegistrationResult> {
  if (await isPushOptedOut()) return { ok: false, reason: 'opted_out' };
  if (!Device.isDevice || Platform.OS === 'web') return { ok: false, reason: 'not_device' };
  const projectId = easProjectId();
  if (!projectId) return { ok: false, reason: 'no_project' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Course updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && options.prompt !== false) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return { ok: false, reason: 'permission_denied' };

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return await registerToken(token, projectId);
  } catch (err: any) {
    return { ok: false, reason: 'error', message: err?.message };
  }
}

/** Re-register when Expo rotates the token. Returns an unsubscribe function. */
export function watchPushToken(): () => void {
  const sub = Notifications.addPushTokenListener(async () => {
    const projectId = easProjectId();
    if (!projectId || (await isPushOptedOut())) return;
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await registerToken(token, projectId);
    } catch {
      // next app start retries
    }
  });
  return () => sub.remove();
}

/** Remove this device's backend registration (logout or opt-out). Never throws. */
export async function unregisterPush(): Promise<void> {
  const devices = await deviceStore();
  const stored = await devices.read();
  if (!stored) return;
  try {
    await api.removeDevice(stored.deviceId);
  } catch (err: any) {
    // 404 = already gone; anything else, keep the record so a later attempt can retry
    if (err?.response?.status !== 404) return;
  }
  await devices.write(null);
}

export async function setPushOptOut(optOut: boolean): Promise<PushRegistrationResult> {
  try {
    if (optOut) await AsyncStorage.setItem(OPT_OUT_KEY, '1');
    else await AsyncStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // best-effort
  }
  if (optOut) {
    await unregisterPush();
    return { ok: true };
  }
  return registerForPush({ prompt: true });
}

/** Course ID from a tapped notification. The payload is only a navigation hint, never authorization. */
export function courseIdFromResponse(response: Notifications.NotificationResponse | null | undefined): string | null {
  const data = response?.notification.request.content.data as { course_id?: unknown } | undefined;
  return typeof data?.course_id === 'string' && data.course_id ? data.course_id : null;
}
