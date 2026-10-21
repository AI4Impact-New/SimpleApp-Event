// Authentication service using AWS Amplify
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { configureAuth } from '@/app/amplify-config';

class AuthService {
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

  async logout() {
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
