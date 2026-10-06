/** Programme+ module cell: display title, description, optional fine-print note. Use inside CellGrid. */
export interface ModuleCellProps {
  title: string;
  description: string;
  note?: string;
  style?: React.CSSProperties;
}
export declare function ModuleCell(props: ModuleCellProps): JSX.Element;
