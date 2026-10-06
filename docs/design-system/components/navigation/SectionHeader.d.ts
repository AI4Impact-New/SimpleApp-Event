/** Eyebrow + display H2 + lead paragraph, with optional right-aligned aside (e.g. "Compare all tracks" button). */
export interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowTone?: 'accent' | 'onDark' | 'promo' | 'muted';
  title: React.ReactNode;
  lead?: React.ReactNode;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  aside?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SectionHeader(props: SectionHeaderProps): JSX.Element;
