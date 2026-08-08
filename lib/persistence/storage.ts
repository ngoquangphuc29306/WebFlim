'use client';

/**
 * Utility functions for safe localStorage operations and browser/same-tab event handling.
 */

export const STORAGE_KEYS = {
  watchlist: 'vsmov_watchlist_v1',
  history: 'vsmov_watch_history_v1',
  progress: 'vsmov_playback_progress_v1',
  preferences: 'vsmov_player_preferences_v1',
  recentSearches: 'vsmov_recent_searches_v1',
  syncMeta: 'vsmov_sync_meta_v1',
  syncQueue: 'vsmov_sync_queue_v1',
} as const;

export const STORAGE_EVENTS = {
  watchlist: 'vsmov_watchlist_updated',
  history: 'vsmov_history_updated',
  progress: 'vsmov_progress_updated',
  preferences: 'vsmov_preferences_updated',
} as const;

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function safeReadJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Storage] Failed to read or parse key "${key}":`, err);
    return fallback;
  }
}

export function safeWriteJson<T>(key: string, data: T, eventName?: string): boolean {
  if (!isBrowser()) return false;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write key "${key}":`, err);
    return false;
  }
}

export function safeRemoveItem(key: string, eventName?: string): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(key);
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to remove key "${key}":`, err);
    return false;
  }
}

export function subscribeStorageEvent(
  eventName: string,
  storageKey: string,
  callback: () => void
): () => void {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      callback();
    }
  };

  window.addEventListener(eventName, callback);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', handleStorage);
  };
}
