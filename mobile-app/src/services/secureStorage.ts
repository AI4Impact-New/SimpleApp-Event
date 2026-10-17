// Key-value storage for auth tokens: SecureStore on native, localStorage on web
// (expo-secure-store has no web implementation and throws there).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
