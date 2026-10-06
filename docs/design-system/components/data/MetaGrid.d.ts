/** Label/value spec grid: mono uppercase label over a body value. */
export interface MetaGridProps {
  items?: Array<{ label: string; value: React.ReactNode }>;
  columns?: number;
  theme?: 'light' | 'dark';
  style?: React.CSSProperties;
}
export declare function MetaGrid(props: MetaGridProps): JSX.Element;
