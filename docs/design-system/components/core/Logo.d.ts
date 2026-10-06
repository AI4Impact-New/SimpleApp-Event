/** AI4Impact lockup (A4 tile + wordmark) from the supplied PNGs. */
export interface LogoProps {
  /** light = for light backgrounds (navy tile), dark = for navy backgrounds (white tile, teal "Impact") */
  variant?: 'light' | 'dark';
  /** px height, default 32 */
  height?: number;
  /** path from the page to the design-system root, e.g. "../../" */
  basePath?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;
