'use client';

import {
  PlayerPreferences,
  playerPreferencesRepository,
  usePlayerPreferences,
  ALLOWED_PLAYBACK_RATES,
  DEFAULT_PREFERENCES,
} from '@/lib/persistence/player-preferences';

export type { PlayerPreferences };
export { usePlayerPreferences, ALLOWED_PLAYBACK_RATES, DEFAULT_PREFERENCES };

export function getPlayerPreferences(): PlayerPreferences {
  return playerPreferencesRepository.get();
}

export function savePlayerPreferences(partial: Partial<PlayerPreferences>): PlayerPreferences {
  return playerPreferencesRepository.save(partial);
}
