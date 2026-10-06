/** Checklist comparison card (muted eyebrow, title, checks, footer). Highlighted = 2px teal border + teal checks. */
export interface CheckCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  items?: React.ReactNode[];
  footer?: React.ReactNode;
  highlighted?: boolean;
  style?: React.CSSProperties;
}
export declare function CheckCard(props: CheckCardProps): JSX.Element;
