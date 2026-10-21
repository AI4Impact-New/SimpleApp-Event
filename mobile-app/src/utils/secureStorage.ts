// Key/value storage for auth data: Keychain/Keystore on native, localStorage on web
// (expo-secure-store has no web implementation).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getItemAsync(key: string): Promise<string | null> {
  if (!isWeb) return SecureStore.getItemAsync(key);
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (!isWeb) return SecureStore.setItemAsync(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage blocked (private mode); session still works in memory via Amplify
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (!isWeb) return SecureStore.deleteItemAsync(key);
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // best-effort
  }
}
