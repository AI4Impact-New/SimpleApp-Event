/**
 * Portfolio-project card: title, description, deliverables as a plain dot-separated line. Optional code preview (use rarely).
 * @startingPoint section="Cards" subtitle="Project card" viewport="700x420"
 */
export interface ProjectCardProps {
  title: string;
  description: string;
  /** deliverables, rendered as "A · B · C" */
  tags?: string[];
  theme?: 'dark' | 'light';
  /** optional CodeWindow content — leave out by default */
  preview?: React.ReactNode;
  windowTitle?: string;
  style?: React.CSSProperties;
}
export declare function ProjectCard(props: ProjectCardProps): JSX.Element;
