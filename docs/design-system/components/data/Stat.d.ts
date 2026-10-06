/** Hero proof-point: big display value + short lowercase label. */
export interface StatProps {
  value: React.ReactNode;
  label: React.ReactNode;
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}
export declare function Stat(props: StatProps): JSX.Element;
