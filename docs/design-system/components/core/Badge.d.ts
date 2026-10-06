/** Small pill label, e.g. "Flagship". Neutral by default; promo (amber) only for a single time-limited offer per page. */
export interface BadgeProps {
  tone?: 'neutral' | 'promo' | 'accent' | 'dark';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
