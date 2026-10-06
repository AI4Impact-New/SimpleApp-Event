/** Navy site footer: dark logo, display tagline, fine print, mono-headed link columns, legal bar. */
export interface FooterProps {
  columns?: Array<{ title: string; links: string[] }>;
  tagline?: string;
  note?: string;
  legal?: string;
  legalRight?: string;
  basePath?: string;
  style?: React.CSSProperties;
}
export declare function Footer(props: FooterProps): JSX.Element;
