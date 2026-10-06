/** Feature cell: neutral Lucide icon, display title, short description. Use inside CellGrid. */
export interface FeatureCellProps {
  /** Lucide name, e.g. "circle-play", "hammer", "messages-square", "calendar-clock" */
  icon: string;
  title: string;
  description: string;
  style?: React.CSSProperties;
}
export declare function FeatureCell(props: FeatureCellProps): JSX.Element;
