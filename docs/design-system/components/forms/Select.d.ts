/** Labelled native select with chevron. */
export interface SelectProps {
  label?: string;
  options?: Array<string | { value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
