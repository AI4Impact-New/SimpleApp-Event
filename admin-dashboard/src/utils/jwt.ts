import { CurrentUser } from '@/types/auth';

/**
 * Decode JWT payload without verification (client-side; token came from Cognito).
 * Used to read cognito:groups for admin check.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const ADMINS_GROUP = 'Admins';

function extractGroups(payload: Record<string, unknown>): string[] {
  const raw = payload['cognito:groups'];
  if (Array.isArray(raw)) {
    return raw.map((g) => String(g).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return [];
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((g) => String(g).trim()).filter(Boolean);
        }
      } catch {
        // Fall through to CSV/single-value parsing.
      }
    }
    if (value.includes(',')) {
      return value.split(',').map((g) => g.trim()).filter(Boolean);
    }
    return [value];
  }
  return [];
}

export function isAdminFromToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const adminGroupLower = ADMINS_GROUP.toLowerCase();
  return extractGroups(payload).some((group) => group.toLowerCase() === adminGroupLower);
}

export function isIdToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  return payload?.token_use === 'id';
}

export function getCurrentUserFromToken(token: string): CurrentUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const groups = extractGroups(payload);
  const lower = groups.map((g) => g.toLowerCase());
  let role: CurrentUser['role'] = 'unknown';
  if (lower.includes('admins') || lower.includes('admin')) role = 'admin';
  else if (lower.includes('students') || lower.includes('student')) role = 'student';

  const sub = String(payload.sub || payload['cognito:username'] || '');
  if (!sub) return null;

  return {
    sub,
    email: payload.email ? String(payload.email) : undefined,
    username: payload['cognito:username'] ? String(payload['cognito:username']) : undefined,
    groups,
    role,
  };
}

export function isMarketingFromToken(token:string):boolean{
 const payload=decodeJwtPayload(token);return !!payload&&extractGroups(payload).some(g=>g.toLowerCase()==='marketing');
}
