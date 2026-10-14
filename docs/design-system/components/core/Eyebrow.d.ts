/** Kicker above a heading. Optional — not every heading needs one.
 *  `mono` (default): JetBrains Mono 12px, uppercase, 0.22em tracking, teal, 24px leading rule.
 *  `sentence`: quiet sentence-case Inter 500, 14px, neutral colour. */
export interface EyebrowProps {
  /** sentence: accent/muted on light, onDark/promo on navy (all neutral).
   *  mono: accent = teal-600, onDark = teal-400, promo = amber-500, muted = slate (inside cards). */
  tone?: 'accent' | 'onDark' | 'promo' | 'muted';
  /** default 'mono' */
  variant?: 'sentence' | 'mono';
  /** short leading rule; default false for sentence, true for mono */
  line?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Eyebrow(props: EyebrowProps): JSX.Element;
