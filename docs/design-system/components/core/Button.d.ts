/**
 * AI4Impact button. Navy primary for in-page actions, outline as its secondary, light (near-white) as the primary on dark heroes, dark-ghost as secondary on dark, promo (amber) only in the announcement bar.
 * @startingPoint section="Core" subtitle="Primary, outline, light, dark-ghost, promo, link" viewport="700x260"
 */
export interface ButtonProps {
  variant?: 'primary' | 'outline' | 'light' | 'dark-ghost' | 'promo' | 'link';
  /** sm 30px (cards), md 38px, lg 46px (hero) */
  size?: 'sm' | 'md' | 'lg';
  /** trailing Lucide icon, usually "arrow-right" or "arrow-up-right" */
  icon?: string;
  /** leading Lucide icon, e.g. "log-in" */
  leadingIcon?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
