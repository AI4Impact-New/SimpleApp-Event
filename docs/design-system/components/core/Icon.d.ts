/** Lucide icon (loaded from CDN on first use). Names are kebab-case Lucide ids, e.g. "arrow-right", "arrow-up-right", "log-in", "sparkles", "circle-play", "hammer", "messages-square", "calendar-clock", "database", "check", "chevron-right". */
export interface IconProps {
  name: string;
  /** px, default 16 */
  size?: number;
  /** default 2 */
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
