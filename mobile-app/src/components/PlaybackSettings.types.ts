export interface PlaybackSettingsProps {
  speed: number;
  speeds: readonly number[];
  disabled?: boolean;
  onSpeed: (speed: number) => void;
}
export const playbackSpeedLabel = (speed: number) => speed === 1 ? 'Normal' : `${speed}×`;
