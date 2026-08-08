'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { playerPreferencesRepository } from './preferences.service';
import { PlayerPreferences, DEFAULT_PREFERENCES } from './preferences.types';
import { syncEngine } from '@/lib/sync/sync-engine';

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
    const saved = playerPreferencesRepository.save(partial);
    syncEngine.onPreferencesSave(saved);
    return saved;
  }, []);

  const resetPreferences = useCallback(() => {
    const reset = playerPreferencesRepository.reset();
    syncEngine.onPreferencesSave(reset);
    return reset;
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isMounted: true,
  };
}
