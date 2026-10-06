/** 40px navy promo strip above the nav: scrolling messages separated by amber sparkles + amber CTA. */
export interface AnnouncementBarProps {
  items?: string[];
  ctaLabel?: string;
  onCta?: () => void;
  style?: React.CSSProperties;
}
export declare function AnnouncementBar(props: AnnouncementBarProps): JSX.Element;
