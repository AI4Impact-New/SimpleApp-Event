/** Faux editor/terminal window (three grey dots + mono filename) used to show real-looking work artefacts on dark sections. */
export interface CodeWindowProps {
  /** mono title, e.g. "dags/transactions_daily.py" or "POST /v1/score" */
  title?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}
export declare function CodeWindow(props: CodeWindowProps): JSX.Element;
