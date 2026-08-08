'use client';

export interface PlayerPreferences {
  volume: number;
  muted: boolean;
  playbackRate: number;
  autoplayNextEpisode: boolean;
}

const PREFERENCES_KEY = 'vsmov_player_preferences_v1';
const ALLOWED_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const DEFAULT_PREFERENCES: PlayerPreferences = {
  volume: 1,
  muted: false,
  playbackRate: 1,
  autoplayNextEpisode: true,
};

export function getPlayerPreferences(): PlayerPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw);
    const volume =
      typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : DEFAULT_PREFERENCES.volume;

    const muted = typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFERENCES.muted;

    const playbackRate =
      typeof parsed.playbackRate === 'number' && ALLOWED_PLAYBACK_RATES.includes(parsed.playbackRate)
        ? parsed.playbackRate
        : DEFAULT_PREFERENCES.playbackRate;

    const autoplayNextEpisode =
      typeof parsed.autoplayNextEpisode === 'boolean'
        ? parsed.autoplayNextEpisode
        : DEFAULT_PREFERENCES.autoplayNextEpisode;

    return {
      volume,
      muted,
      playbackRate,
      autoplayNextEpisode,
    };
  } catch (err) {
    console.warn('Failed to parse player preferences:', err);
    return DEFAULT_PREFERENCES;
  }
}

export function savePlayerPreferences(partial: Partial<PlayerPreferences>): PlayerPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const current = getPlayerPreferences();
    const updated: PlayerPreferences = {
      ...current,
      ...partial,
    };

    // Validate ranges
    if (typeof updated.volume === 'number') {
      updated.volume = Math.max(0, Math.min(1, updated.volume));
    }
    if (typeof updated.playbackRate === 'number' && !ALLOWED_PLAYBACK_RATES.includes(updated.playbackRate)) {
      updated.playbackRate = 1;
    }

    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save player preferences:', err);
    return DEFAULT_PREFERENCES;
  }
}
