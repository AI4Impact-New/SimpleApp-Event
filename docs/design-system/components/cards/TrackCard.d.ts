/**
 * Career-track card: family label, title, description, two facts, Explore + Enrol.
 * @startingPoint section="Cards" subtitle="Course / career track card" viewport="700x520"
 */
export interface TrackCardProps {
  /** "01" */
  number: string;
  /** "Build" | "Data" | "Product" */
  family: string;
  title: string;
  description: string;
  /** e.g. "Flagship" */
  badge?: string;
  meta?: Array<{ label: string; value: React.ReactNode }>;
  onExplore?: () => void;
  onEnrol?: () => void;
  style?: React.CSSProperties;
}
export declare function TrackCard(props: TrackCardProps): JSX.Element;
