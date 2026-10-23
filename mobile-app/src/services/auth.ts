// Authentication service using AWS Amplify (Cognito)
import {
  signIn,
  confirmSignIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import * as SecureStore from '@/utils/secureStorage';

export type SignUpOptions = { givenName?: string; familyName?: string };

const TOKEN_KEY = 'auth_token';
const ID_TOKEN_KEY = 'auth_id_token';
const USER_KEY = 'user_data';

type UnauthorizedCallback = () => void;

export type StoredUserData = {
  id: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  user_type?: 'student' | 'professional';
  university?: string;
  course?: string;
  year_of_study?: string;
  city?: string;
  state?: string;
  designation?: string;
  company?: string;
};

export type LoginResult = {
  success: boolean;
  user?: StoredUserData;
  error?: string;
  needsConfirmation?: boolean;
  needsNewPassword?: boolean;
  needsPasswordReset?: boolean;
};

class AuthService {
  private onUnauthorized: UnauthorizedCallback | null = null;

  private beforeSignOut: (() => Promise<void>) | null = null;
  private signingOut = false;

  /** Runs before every sign-out (manual or forced) while the session can still authenticate requests. */
  setBeforeSignOut(callback: (() => Promise<void>) | null) {
    this.beforeSignOut = callback;
  }

  setOnUnauthorized(callback: UnauthorizedCallback | null) {
    this.onUnauthorized = callback;
  }

  async login(rawEmail: string, password: string): Promise<LoginResult> {
    const email = rawEmail.trim();
    try {
      const signInResult = await signIn({
        username: email,
        password,
      });
      const step = signInResult.nextStep?.signInStep;
      // Amplify v6 reports an unverified email as a next step rather than an error
      if (step === 'CONFIRM_SIGN_UP') {
        return {
          success: false,
          needsConfirmation: true,
          error: 'Please verify your email before signing in. Enter the code we emailed you.',
        };
      }
      // Admin-created accounts sign in with a temporary password and must choose their own.
      if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        return {
          success: false,
          needsNewPassword: true,
          error: 'Your account needs a new password. Choose one to finish signing in.',
        };
      }
      if (step === 'RESET_PASSWORD') {
        return {
          success: false,
          needsPasswordReset: true,
          error: 'Your password must be reset. We will email you a reset code.',
        };
      }
      if (step && step !== 'DONE') {
        console.warn('[Auth] unsupported sign-in step:', step);
        return {
          success: false,
          error: `This account needs an extra sign-in step the app does not support yet (${step}). Contact support.`,
        };
      }

      return await this.finishSignIn(email);
    } catch (error: unknown) {
      // Log full error for debugging (Cognito/Amplify often wrap the real cause)
      console.error('[Auth] login error:', error);
      const err = error as Record<string, unknown>;
      if (err && typeof err === 'object') {
        try {
          console.error('[Auth] error name:', err.name, 'code:', err.code, 'message:', err.message);
          if (err.underlyingError) console.error('[Auth] underlyingError:', err.underlyingError);
          if (err.cause) console.error('[Auth] cause:', err.cause);
          // Amplify can put the real message in a nested structure
          const safeKeys = Object.keys(err).filter((k) => typeof (err as Record<string, unknown>)[k] !== 'function');
          console.error('[Auth] error keys:', safeKeys.join(', '));
        } catch (_) {}
      }

      const msg = error instanceof Error ? (error as Error & { name?: string; code?: string }).message ?? '' : '';
      const name = error instanceof Error ? (error as Error & { name?: string }).name ?? '' : '';
      const code = error instanceof Error ? (error as Error & { code?: string }).code ?? '' : '';
      const underlyingMsg = typeof err?.underlyingError === 'object' && err?.underlyingError !== null && 'message' in err.underlyingError
        ? String((err.underlyingError as { message?: unknown }).message ?? '') : '';

      let message = 'Login failed. Please try again.';
      let needsConfirmation = false;
      if (/already a signed in user|already signed in/i.test(msg) || /already a signed in user|already signed in/i.test(underlyingMsg)) {
        try {
          const session = await fetchAuthSession();
          const idToken = session.tokens?.idToken?.toString();
          if (idToken) {
            await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
            await SecureStore.setItemAsync(TOKEN_KEY, idToken);
            const user = await getCurrentUser();
            const userData = await this.buildUserData(user?.userId ?? '', user?.signInDetails?.loginId ?? email);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
            return { success: true, user: userData };
          }
        } catch (_) {}
        message = 'You are already signed in. Please close and reopen the app, or sign out first.';
      } else if (/expo go|doesn't seem to be linked|not using Expo Go/i.test(underlyingMsg) || /expo go|doesn't seem to be linked|not using Expo Go/i.test(msg)) {
        message = 'Sign-in does not work in Expo Go. Use a development build instead: run "npx expo run:ios" (or "npx expo run:android") from the mobile-app folder, then open the app from the simulator or device.';
      } else if (/temporary password has expired/i.test(msg)) {
        message = 'Your temporary password has expired. Ask the AI4Impact team to send you a new invitation.';
      } else if (/attempts exceeded/i.test(msg)) {
        message = 'Too many failed sign-in attempts. Please wait a few minutes or reset your password.';
      } else if (name === 'UserNotFoundException' || code === 'UserNotFoundException' || /user.*not.*found/i.test(msg)) {
        // Same wording as a wrong password so the form does not reveal which emails have accounts
        message = 'Email or password is incorrect. Please try again.';
      } else if (name === 'NotAuthorizedException' || code === 'NotAuthorizedException' || /not authorized|incorrect.*password/i.test(msg)) {
        message = 'Email or password is incorrect. Please try again.';
      } else if (name === 'UserNotConfirmedException' || code === 'UserNotConfirmedException' || /user.*not confirmed|confirm.*sign.?up/i.test(msg)) {
        message = 'Please verify your email before signing in. Enter the code we emailed you.';
        needsConfirmation = true;
      } else if (name === 'NetworkError' || code === 'NetworkError' || /network|fetch|failed to load/i.test(msg)) {
        message = 'Network error. Check your connection and try again.';
      } else if (/unknown error|occurred/i.test(msg)) {
        message = 'Sign-in failed. Cognito often returns this for an incorrect password. Try again or use "Forgot password" if you’re unsure.';
      } else if (msg && msg !== 'Login failed') {
        message = msg;
      }

      return {
        success: false,
        needsConfirmation,
        error: message,
      };
    }
  }

  async signUp(email: string, password: string, options?: SignUpOptions) {
    try {
      const userAttributes: Record<string, string> = { email };
      if (options?.givenName) userAttributes.given_name = options.givenName;
      if (options?.familyName) userAttributes.family_name = options.familyName;

      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: userAttributes,
        },
      });

      const nextStep = result.nextStep?.signUpStep;
      const destination = (result.nextStep as { codeDeliveryDetails?: { destination?: string } })?.codeDeliveryDetails?.destination;
      return {
        success: true,
        userId: result.userId,
        nextStep: nextStep ?? 'CONFIRM_SIGN_UP',
        destination: destination ?? undefined,
      };
    } catch (error: unknown) {
      console.error('[Auth] signUp error:', error);
      const msg = error instanceof Error ? (error as Error & { name?: string; code?: string }).message ?? '' : '';
      const name = error instanceof Error ? (error as Error & { name?: string }).name ?? '' : '';
      const code = (error as Error & { code?: string }).code ?? '';

      let message = 'Sign up failed. Please try again.';
      if (name === 'UsernameExistsException' || code === 'UsernameExistsException' || /already exists|already registered/i.test(msg)) {
        message = 'An account with this email already exists. Sign in or use a different email.';
      } else if (/InvalidPasswordException|password/i.test(msg) || /too short|uppercase|lowercase|number|symbol/i.test(msg)) {
        message = 'Password must be at least 8 characters with uppercase, lowercase, a number, and a symbol.';
      } else if (/InvalidParameterException|invalid/i.test(msg)) {
        message = 'Please enter a valid email address.';
      } else if (msg && msg !== 'Sign up failed. Please try again.') {
        message = msg;
      }
      return { success: false, error: message };
    }
  }

  async confirmSignUp(email: string, confirmationCode: string) {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode.trim(),
      });
      return { success: true };
    } catch (error: unknown) {
      console.error('[Auth] confirmSignUp error:', error);
      const msg = error instanceof Error ? (error as Error & { name?: string; code?: string }).message ?? '' : '';
      const name = (error as Error & { name?: string }).name ?? '';
      const code = (error as Error & { code?: string }).code ?? '';

      let message = 'Verification failed. Please check the code and try again.';
      if (name === 'ExpiredCodeException' || code === 'ExpiredCodeException') {
        message = 'This code has expired. Please request a new code.';
      } else if (name === 'CodeMismatchException' || code === 'CodeMismatchException' || /invalid.*code|code.*invalid/i.test(msg)) {
        message = 'Invalid code. Please check the code from your email or request a new one.';
      } else if (msg && !msg.includes('Verification failed')) {
        message = msg;
      }
      return { success: false, error: message };
    }
  }

  async resendSignUpCode(email: string) {
    try {
      const result = await resendSignUpCode({ username: email });
      const destination = (result as { codeDeliveryDetails?: { destination?: string } })?.codeDeliveryDetails?.destination;
      return { success: true, destination };
    } catch (error: unknown) {
      console.error('[Auth] resendSignUpCode error:', error);
      const msg = error instanceof Error ? (error as Error & { name?: string }).message ?? '' : '';
      const name = (error as Error & { name?: string }).name ?? '';
      let message = 'Could not resend code. Please try again.';
      if (name === 'LimitExceededException' || /limit|too many/i.test(msg)) {
        message = 'Too many attempts. Please wait a few minutes before requesting another code.';
      } else if (msg) message = msg;
      return { success: false, error: message };
    }
  }

  /** After Cognito reports DONE: store the ID token and user. */
  private async finishSignIn(email: string): Promise<LoginResult> {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      return {
        success: false,
        error: 'Could not obtain ID token from Cognito session',
      };
    }

    await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
    await SecureStore.setItemAsync(TOKEN_KEY, idToken);

    const user = await getCurrentUser();
    const userData = await this.buildUserData(user?.userId ?? '', user?.signInDetails?.loginId ?? email);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

    return { success: true, user: userData };
  }

  /** Answer the NEW_PASSWORD_REQUIRED challenge from the sign-in that was just attempted. */
  async completeNewPassword(email: string, newPassword: string): Promise<LoginResult> {
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      const step = result.nextStep?.signInStep;
      if (step && step !== 'DONE') {
        return { success: false, error: `Additional sign-in step required (${step}). Contact support.` };
      }
      return await this.finishSignIn(email);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      const name = (error as Error & { name?: string }).name ?? '';
      let message = 'Could not set the new password. Please try again.';
      if (name === 'InvalidPasswordException' || /password/i.test(msg)) {
        message = 'Password must be at least 8 characters with uppercase, lowercase, a number, and a symbol.';
      } else if (/session|expired|no.*sign.?in/i.test(msg)) {
        message = 'This sign-in attempt expired. Sign in again with your temporary password.';
      } else if (msg) message = msg;
      return { success: false, error: message };
    }
  }

  /** Email a password-reset code. Cognito does not reveal whether the account exists beyond its own errors. */
  async requestPasswordReset(email: string) {
    try {
      const result = await resetPassword({ username: email.trim() });
      const destination = (result.nextStep as { codeDeliveryDetails?: { destination?: string } })?.codeDeliveryDetails?.destination;
      return { success: true, destination };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      const name = (error as Error & { name?: string }).name ?? '';
      let message = 'Could not send a reset code. Please try again.';
      if (name === 'UserNotFoundException') message = 'We could not send a reset code. Check the email address and try again.';
      else if (name === 'LimitExceededException' || /limit|too many/i.test(msg)) {
        message = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (name === 'InvalidParameterException') {
        message = 'This account has no verified email. Please contact support.';
      } else if (msg) message = msg;
      return { success: false, error: message };
    }
  }

  async confirmPasswordReset(email: string, code: string, newPassword: string) {
    try {
      await confirmResetPassword({ username: email.trim(), confirmationCode: code.trim(), newPassword });
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      const name = (error as Error & { name?: string }).name ?? '';
      let message = 'Could not reset the password. Please try again.';
      if (name === 'CodeMismatchException') message = 'Incorrect code. Check the code from your email.';
      else if (name === 'ExpiredCodeException') message = 'This code has expired. Request a new one.';
      else if (name === 'InvalidPasswordException' || /password/i.test(msg)) {
        message = 'Password must be at least 8 characters with uppercase, lowercase, a number, and a symbol.';
      } else if (name === 'LimitExceededException') {
        message = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (msg) message = msg;
      return { success: false, error: message };
    }
  }

  async logout() {
    await this.clearStorage();
    return { success: true };
  }

  async clearStorage() {
    // A request made by beforeSignOut can 401 and land back here; don't recurse.
    if (this.signingOut) return;
    this.signingOut = true;
    try {
      await this.beforeSignOut?.();
    } catch (_) {
      // best-effort
    }
    try {
      await signOut();
    } catch (_) {
      // ignore — may already be signed out
    }
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (_) {
      // ignore
    }
    this.signingOut = false;
    this.onUnauthorized?.();
  }

  /** Build user payload with id, email, and name attributes from Cognito. */
  private async buildUserData(id: string, email: string): Promise<StoredUserData> {
    const existing = await this.getStoredUserData();
    const data: StoredUserData = {
      ...(existing ?? {}),
      id,
      email,
    };
    try {
      const attrs = await fetchUserAttributes();
      const given = attrs?.given_name ?? attrs?.['given_name'];
      const family = attrs?.family_name ?? attrs?.['family_name'];
      const name = attrs?.name ?? attrs?.['name'];
      if (given) data.given_name = given;
      if (family) data.family_name = family;
      if (name) data.name = name;
      else if (given || family) data.name = [given, family].filter(Boolean).join(' ').trim();
    } catch (_) {
      // attributes optional
    }
    return data;
  }

  private async getStoredUserData(): Promise<StoredUserData | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) as StoredUserData : null;
    } catch {
      return null;
    }
  }

  async updateStoredUserData(patch: Partial<StoredUserData>): Promise<StoredUserData> {
    const current = await this.getStoredUserData();
    // `id` is the Cognito sub and keys per-user stores (push device, exam answers); profile data never changes it.
    const { id: _ignored, ...rest } = patch;
    const next = {
      ...(current ?? {}),
      ...rest,
    } as StoredUserData;
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
    return next;
  }

  /**
   * Older builds overwrote the stored id with the database user id. Restore the Cognito sub so per-user
   * stores (push device, saved exam answers) resolve to the right key again. Cheap no-op when it matches.
   */
  async repairStoredUserId(): Promise<void> {
    try {
      const stored = await this.getStoredUserData();
      if (!stored) return;
      const { userId } = await getCurrentUser();
      if (userId && stored.id !== userId) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify({ ...stored, id: userId }));
      }
    } catch {
      // signed out or offline: the next sign-in rebuilds the record
    }
  }

  async getCurrentUser() {
    try {
      const userData = await this.getStoredUserData();
      if (userData) {
        return { success: true, user: userData };
      }
      const user = await getCurrentUser();
      if (user) {
        const data = await this.buildUserData(user.userId, user.signInDetails?.loginId ?? '');
        return { success: true, user: data };
      }
      return { success: false, user: null };
    } catch {
      return { success: false, user: null };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(ID_TOKEN_KEY) ?? await SecureStore.getItemAsync(TOKEN_KEY);
      return !!token;
    } catch {
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
      if (idToken) return idToken;
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Current ID token for requests made outside axios. Amplify returns its cached session and only
   * refreshes when the token has expired, so this is cheap when the token is still valid.
   */
  async getFreshToken(): Promise<string | null> {
    try {
      const idToken = (await fetchAuthSession()).tokens?.idToken?.toString();
      if (!idToken) return this.getToken();
      if (idToken !== (await this.getToken())) {
        await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
        await SecureStore.setItemAsync(TOKEN_KEY, idToken);
      }
      return idToken;
    } catch {
      return this.getToken();
    }
  }

  /** Refresh Cognito session and persist new tokens. Returns true if a valid session was restored. */
  async refreshSession(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) return false;
      await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);
      const user = await getCurrentUser();
      const userData = await this.buildUserData(user?.userId ?? '', user?.signInDetails?.loginId ?? '');
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;
