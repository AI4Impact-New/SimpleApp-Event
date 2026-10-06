/** Full-width single-choice option row used in the "Is this right for me?" track finder. */
export interface ChoiceOptionProps {
  selected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function ChoiceOption(props: ChoiceOptionProps): JSX.Element;
