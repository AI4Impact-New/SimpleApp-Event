/** Numbered process step with display verb (Choose / Learn / Build / Prove / Move). Use inside CellGrid. */
export interface StepCellProps {
  number: string;
  /** one-word verb */
  title: string;
  subtitle: string;
  description: string;
  style?: React.CSSProperties;
}
export declare function StepCell(props: StepCellProps): JSX.Element;
