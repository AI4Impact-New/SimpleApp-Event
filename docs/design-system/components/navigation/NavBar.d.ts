/** Primary site header: logo, centred text links (active = navy + 2px teal underline), guidance link + Student login. */
export interface NavBarProps {
  links?: Array<{ id: string; label: string }>;
  active?: string;
  onNavigate?: (id: string) => void;
  /** path to DS root for the logo asset */
  basePath?: string;
  onLogin?: () => void;
  onGuidance?: () => void;
  style?: React.CSSProperties;
}
export declare function NavBar(props: NavBarProps): JSX.Element;
