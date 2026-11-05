export interface SeekBarProps {
  position: number;
  duration: number;
  disabled?: boolean;
  /** Commit one seek when the gesture ends; preview movement never awards watch credit. */
  onSeek: (seconds: number) => void;
}
