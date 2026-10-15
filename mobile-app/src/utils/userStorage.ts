// Best-effort JSON values in AsyncStorage, scoped to the signed-in user
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/auth';

/** Resolve the per-user key once, then read/write through the returned handle. */
export async function userStore<T>(prefix: string, suffix?: string) {
  const current = await authService.getCurrentUser();
  const key = `${prefix}:${current.user?.id ?? 'anon'}${suffix ? `:${suffix}` : ''}`;
  return {
    async read(): Promise<T | null> {
      try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    },
    async write(value: T | null) {
      try {
        if (value) await AsyncStorage.setItem(key, JSON.stringify(value));
        else await AsyncStorage.removeItem(key);
      } catch {
        // best-effort
      }
    },
  };
}
