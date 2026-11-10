/**
 * AI4Impact app theme – colors and spacing.
 * Mirrors the landing-page tokens (landing-page/src/styles/tokens) so the student portal reads as the same site.
 * Keep every color a 6-digit hex: screens append 2-digit alpha suffixes (e.g. `${colors.primary}14`).
 */
export const palette = {
  navy950: '#060f22',
  navy900: '#081328',
  navy850: '#0b1628',
  navy800: '#0e1e3b',
  navy750: '#101c36',
  navy700: '#18244a',
  slate700: '#3b4454',
  slate600: '#4f5869',
  slate500: '#6b7382',
  slate400: '#9aa3b2',
  slate300: '#c3c8ce',
  slate200: '#dce2e8',
  slate150: '#e6eaef',
  slate100: '#f2f6fb',
  slate50: '#fafcfe',
  teal700: '#016e5d',
  teal600: '#018a74',
  teal500: '#14a68c',
  teal400: '#31e3b9',
  teal100: '#d9eeeb',
  teal50: '#ebf6f4',
  amber500: '#fea92f',
  amber950: '#2c1304',
  textOnDark: '#f2f6fb',
  textOnDarkBody: '#a7b0c0',
  borderDark: '#1f2b47',
} as const;

export const colors = {
  primary: palette.teal600,
  primaryDark: palette.teal700,
  background: palette.slate50,
  backgroundAlt: palette.slate100,
  backgroundCard: '#ffffff',
  text: palette.navy850,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  border: palette.slate200,
  borderStrong: palette.slate300,
  ink: palette.navy800,
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

/** Web-only font stacks; loaded in src/utils/webDocument.ts. Native falls back to the system font. */
export const fonts = {
  display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  body: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Page width on desktop browsers, matching the landing page container. */
export const layout = {
  container: 1216,
  containerPad: 24,
  navHeight: 64,
  wideBreakpoint: 960,
} as const;
