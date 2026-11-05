// Browser layout switch: the native app keeps its tab layout; the web portal gets a site layout.
import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '@/theme/colors';

export const isWeb = Platform.OS === 'web';

/** `wide` is a desktop/tablet browser window; narrow browsers still get the site chrome, stacked. */
export function useWebLayout() {
  const { width } = useWindowDimensions();
  const wide = isWeb && width >= layout.wideBreakpoint;
  return { isWeb, wide, width };
}
