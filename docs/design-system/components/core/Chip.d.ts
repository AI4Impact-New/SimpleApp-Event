/** Small inline token: outline pill (journey steps), dark mono tag (deliverables), code step (pipeline stage). */
export interface ChipProps {
  variant?: 'outline' | 'tag' | 'code' | 'code-amber';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
