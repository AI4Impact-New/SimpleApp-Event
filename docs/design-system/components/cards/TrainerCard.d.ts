/** Trainer row card: neutral initials tile, name, one-line specialism, chevron. No photos on site. */
export interface TrainerCardProps {
  name: string;
  initials: string;
  subtitle?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function TrainerCard(props: TrainerCardProps): JSX.Element;
