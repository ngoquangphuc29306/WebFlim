'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { playerPreferencesRepository } from './preferences.service';
import { PlayerPreferences, DEFAULT_PREFERENCES } from './preferences.types';

function subscribePreferences(callback: () => void) {
  if (playerPreferencesRepository.subscribe) {
    return playerPreferencesRepository.subscribe(callback);
  }
  return () => {};
}

function getPreferencesSnapshot(): PlayerPreferences {
  return playerPreferencesRepository.get();
}

function getServerPreferencesSnapshot(): PlayerPreferences {
  return DEFAULT_PREFERENCES;
}

export function usePlayerPreferences() {
  const preferences = useSyncExternalStore(
    subscribePreferences,
    getPreferencesSnapshot,
    getServerPreferencesSnapshot
  );

  const updatePreferences = useCallback((partial: Partial<PlayerPreferences>) => {
    return playerPreferencesRepository.save(partial);
  }, []);

  const resetPreferences = useCallback(() => {
    return playerPreferencesRepository.reset();
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isMounted: true,
  };
}
