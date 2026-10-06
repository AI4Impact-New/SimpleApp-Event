/** Labelled text field. Site forms sit on dark navy panels, so theme defaults to dark. */
export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  type?: string;
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
