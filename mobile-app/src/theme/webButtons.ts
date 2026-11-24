// Browser button sizing. Screens shared with the native app stack full-width buttons, which on a
// desktop page stretch across the whole content column. In a wide browser window, buttons size to
// their label and sit on one row; phones (native or narrow browser) keep full-width stacked buttons.
import type { ViewStyle } from 'react-native';
import { useWebLayout } from '@/hooks/useWebLayout';

/** Wide web: the button hugs its label, left-aligned, at a consistent height. */
const fit: ViewStyle = { alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 0, height: 44 };
/** Wide web: a wrapping row of fitted buttons, primary first. */
const row: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' };

export function useWebButtons() {
  const { wide } = useWebLayout();
  return { fitButton: wide ? fit : null, actionRow: wide ? row : null, wide };
}
