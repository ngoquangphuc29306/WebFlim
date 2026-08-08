import { PlayerPreferencesRepository } from './preferences.repository';
import {
  PlayerPreferences,
  DEFAULT_PREFERENCES,
  ALLOWED_PLAYBACK_RATES,
} from './preferences.types';
import { STORAGE_KEYS, STORAGE_EVENTS, safeWriteJson, isBrowser, subscribeStorageEvent } from '../storage';

const PREFERENCES_KEY = STORAGE_KEYS.preferences;
const EVENT_NAME = STORAGE_EVENTS.preferences;

export class LocalPlayerPreferencesRepository implements PlayerPreferencesRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: PlayerPreferences = DEFAULT_PREFERENCES;

  get(): PlayerPreferences {
    if (!isBrowser()) return DEFAULT_PREFERENCES;

    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (raw === this.cachedRaw) {
        return this.cachedParsed;
      }

      this.cachedRaw = raw;

      if (!raw) {
        this.cachedParsed = DEFAULT_PREFERENCES;
        return DEFAULT_PREFERENCES;
      }

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

      const validated: PlayerPreferences = {
        volume,
        muted,
        playbackRate,
        autoplayNextEpisode,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined,
      };

      this.cachedParsed = validated;
      return this.cachedParsed;
    } catch (err) {
      console.warn('[Preferences] Failed to parse player preferences:', err);
      this.cachedParsed = DEFAULT_PREFERENCES;
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
        updatedAt: Date.now(),
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
      this.cachedParsed = updated;
      try {
        this.cachedRaw = JSON.stringify(updated);
      } catch {
        this.cachedRaw = null;
      }
      return updated;
    } catch (err) {
      console.warn('[Preferences] Failed to save player preferences:', err);
      return DEFAULT_PREFERENCES;
    }
  }

  reset(): PlayerPreferences {
    if (!isBrowser()) return DEFAULT_PREFERENCES;
    safeWriteJson(PREFERENCES_KEY, DEFAULT_PREFERENCES, EVENT_NAME);
    this.cachedParsed = DEFAULT_PREFERENCES;
    try {
      this.cachedRaw = JSON.stringify(DEFAULT_PREFERENCES);
    } catch {
      this.cachedRaw = null;
    }
    return DEFAULT_PREFERENCES;
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, PREFERENCES_KEY, callback);
  }
}
