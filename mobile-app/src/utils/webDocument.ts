// Browser document setup: brand fonts and a few page-level styles React Native Web cannot express.
import { Platform } from 'react-native';
import { colors, fonts } from '@/theme/colors';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&family=Space+Grotesk:wght@500;600;700&display=swap';

const PAGE_CSS = `
html, body { background: ${colors.background}; }
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
input, textarea, select, button { font-family: ${fonts.body}; }
[role="button"]:focus-visible, [role="tab"]:focus-visible, a:focus-visible {
  outline: 2px solid ${colors.primary}; outline-offset: 2px;
}
`;

export function setupWebDocument() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('ai4-fonts')) return;

  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = 'anonymous';

  const fontLink = document.createElement('link');
  fontLink.id = 'ai4-fonts';
  fontLink.rel = 'stylesheet';
  fontLink.href = FONTS_HREF;

  const style = document.createElement('style');
  style.textContent = PAGE_CSS;

  document.head.append(preconnect, fontLink, style);
}
