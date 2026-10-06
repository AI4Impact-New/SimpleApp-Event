/** "All tracks at a glance" comparison table in a rounded white card. */
export interface CompareTableColumn { key: string; label: string; align?: 'left' | 'right'; mono?: boolean; muted?: boolean; }
export interface CompareTableProps {
  columns?: CompareTableColumn[];
  rows?: Array<Record<string, React.ReactNode>>;
  style?: React.CSSProperties;
}
export declare function CompareTable(props: CompareTableProps): JSX.Element;
