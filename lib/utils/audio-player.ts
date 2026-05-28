export interface AudioPlayer {
  play: (audioId: string, audioUrl?: string) => Promise<boolean>;
  stop: () => void;
  onEnded: (callback: () => void) => void;
  isPlaying: () => boolean;
}
