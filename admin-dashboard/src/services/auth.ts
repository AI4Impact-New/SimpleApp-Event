import { browserSessionExpired, STAFF_IDLE_KEY, STAFF_IDLE_MS, writeBrowserActivity } from "../../../mobile-app/src/utils/browserIdle";
import { decodeJwtPayload, isIdToken } from "@/utils/jwt";
// Authentication service using AWS Amplify
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { configureAuth } from '@/app/amplify-config';

class AuthService {
  private signingOut = false;
  private refreshing: Promise<string | null> | null = null;

  async login(email: string, password: string) {
    try {
      const result = await signIn({
        username: email,
        password,
      });
      
      // Use ID token for API so backend gets cognito:groups for admin role checks
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (idToken) {
        localStorage.setItem('auth_token', idToken);
        localStorage.setItem('auth_id_token', idToken);
        writeBrowserActivity(STAFF_IDLE_KEY);
      } else {
        return {
          success: false,
          error: 'Could not obtain ID token from Cognito session'
        };
      }
      
      return { success: true, user: result };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  /** Remove all auth-related keys from localStorage (ours + Amplify/Cognito). */
  clearAuthStorage() {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === 'auth_token' ||
        key === 'auth_id_token' ||
        key === 'current_user' ||
        key === 'authToken' ||
        key === 'idToken' ||
        key === 'refresh_token' ||
        key.startsWith('CognitoIdentityServiceProvider.')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  async getUsableToken(): Promise<string | null> {
    if (typeof window === "undefined" || browserSessionExpired(STAFF_IDLE_KEY, STAFF_IDLE_MS)) return null;
    const token = this.getToken();
    if (!token || !isIdToken(token)) return null;
    const expiresAt = Number(decodeJwtPayload(token)?.exp || 0) * 1000;
    if (expiresAt > Date.now() + 15_000) return token;
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          configureAuth();
          const session = await fetchAuthSession({ forceRefresh: true });
          const fresh = session.tokens?.idToken?.toString();
          if (browserSessionExpired(STAFF_IDLE_KEY, STAFF_IDLE_MS)) return null;
          if (this.getToken() !== token) return this.getToken();
          if (fresh && isIdToken(fresh)) {
            localStorage.setItem('auth_id_token', fresh);
            localStorage.setItem('auth_token', fresh);
            return fresh;
          }
        } catch {
          // A valid token can still be used if a refresh was temporarily unavailable.
        }
        return this.getToken() === token && expiresAt > Date.now() ? token : null;
      })().finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async logout() {
    if (this.signingOut) return { success: true };
    this.signingOut = true;
    if (typeof window !== "undefined") writeBrowserActivity(STAFF_IDLE_KEY, 0);
    // Old hosted-UI sessions must also sign out without an external navigation.
    configureAuth();
    try {
      await signOut();
    } catch (_) {}
    if (typeof window !== 'undefined') {
      this.clearAuthStorage();
      sessionStorage.removeItem('post_login_path');
      window.location.replace('/login');
    }
    return { success: true };
  }

  async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return { success: true, user };
    } catch (error) {
      return { success: false, user: null };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_id_token') || localStorage.getItem('auth_token');
    }
    return null;
  }
}

export const authService = new AuthService();
export default authService;
