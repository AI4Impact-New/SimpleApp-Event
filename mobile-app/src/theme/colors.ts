/**
 * AI4Impact app theme – colors and spacing.
 */
export const colors = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  /** Brand navy and amber, from the AI4Impact logo. */
  brandNavy: '#081328',
  brandAccent: '#fea92f',
  background: '#f9fafb',
  backgroundCard: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  error: '#dc2626',
  errorBg: '#fef2f2',
  success: '#16a34a',
  successBg: '#dcfce7',
  successMuted: '#22c55e',
  white: '#ffffff',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 20,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
} as const;
