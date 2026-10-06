/** Quiet sentence-case kicker above a heading (Inter 500, 14px, body colour). Optional — not every heading needs one. */
export interface EyebrowProps {
  /** accent/muted on light, onDark/promo on navy (all neutral — no accent colour) */
  tone?: 'accent' | 'onDark' | 'promo' | 'muted';
  /** short leading rule, default false */
  line?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Eyebrow(props: EyebrowProps): JSX.Element;
