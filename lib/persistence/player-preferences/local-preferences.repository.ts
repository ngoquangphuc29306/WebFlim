import { PlayerPreferencesRepository } from './preferences.repository';
import {
  PlayerPreferences,
  DEFAULT_PREFERENCES,
  ALLOWED_PLAYBACK_RATES,
} from './preferences.types';
import { safeWriteJson, isBrowser, subscribeStorageEvent } from '../storage';

const PREFERENCES_KEY = 'vsmov_player_preferences_v1';
const EVENT_NAME = 'vsmov_preferences_updated';

export class LocalPlayerPreferencesRepository implements PlayerPreferencesRepository {
  get(): PlayerPreferences {
    if (!isBrowser()) return DEFAULT_PREFERENCES;

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
      console.warn('[Preferences] Failed to parse player preferences:', err);
      return DEFAULT_PREFERENCES;
    }
  }

  save(partial: Partial<PlayerPreferences>): PlayerPreferences {
    if (!isBrowser()) return DEFAULT_PREFERENCES;

    try {
      const current = this.get();
      const updated: PlayerPreferences = {
        ...current,
        ...partial,
      };

      if (typeof updated.volume === 'number') {
        updated.volume = Math.max(0, Math.min(1, updated.volume));
      }
      if (
        typeof updated.playbackRate === 'number' &&
        !ALLOWED_PLAYBACK_RATES.includes(updated.playbackRate)
      ) {
        updated.playbackRate = 1;
      }

      safeWriteJson(PREFERENCES_KEY, updated, EVENT_NAME);
      return updated;
    } catch (err) {
      console.warn('[Preferences] Failed to save player preferences:', err);
      return DEFAULT_PREFERENCES;
    }
  }

  reset(): PlayerPreferences {
    if (!isBrowser()) return DEFAULT_PREFERENCES;
    safeWriteJson(PREFERENCES_KEY, DEFAULT_PREFERENCES, EVENT_NAME);
    return DEFAULT_PREFERENCES;
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, callback);
  }
}
