export interface PlayerPreferences {
  volume: number;
  muted: boolean;
  playbackRate: number;
  autoplayNextEpisode: boolean;
  updatedAt?: number;
}

export const ALLOWED_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const DEFAULT_PREFERENCES: PlayerPreferences = {
  volume: 1,
  muted: false,
  playbackRate: 1,
  autoplayNextEpisode: true,
};
