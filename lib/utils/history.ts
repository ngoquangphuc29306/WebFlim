'use client';

import { WatchHistoryItem } from '@/types/movie';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vsmov_watch_history_v1';
const EVENT_NAME = 'vsmov_history_updated';

const EMPTY_HISTORY: WatchHistoryItem[] = [];
let cachedRawHistory: string | null = null;
let cachedParsedHistory: WatchHistoryItem[] = EMPTY_HISTORY;

export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === 'undefined') return EMPTY_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawHistory) return cachedParsedHistory;
    cachedRawHistory = raw;
    cachedParsedHistory = raw ? JSON.parse(raw) : EMPTY_HISTORY;
    return cachedParsedHistory;
  } catch {
    return EMPTY_HISTORY;
  }
}

export function saveWatchHistory(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  const list = getWatchHistory();
  const newItem: WatchHistoryItem = {
    ...item,
    updatedAt: Date.now(),
  };

  const filtered = list.filter((h) => h.slug !== item.slug);
  const updated = [newItem, ...filtered].slice(0, 30); // keep last 30

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawHistory = serialized;
    cachedParsedHistory = updated;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to save watch history:', err);
  }
}

export function removeHistoryItem(slug: string): void {
  if (typeof window === 'undefined') return;
  const list = getWatchHistory();
  const updated = list.filter((h) => h.slug !== slug);

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawHistory = serialized;
    cachedParsedHistory = updated;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to remove history item:', err);
  }
}

export function clearWatchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRawHistory = null;
    cachedParsedHistory = EMPTY_HISTORY;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to clear watch history:', err);
  }
}

function subscribeHistory(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerHistorySnapshot(): WatchHistoryItem[] {
  return EMPTY_HISTORY;
}

export function useWatchHistory() {
  const history = useSyncExternalStore(
    subscribeHistory,
    getWatchHistory,
    getServerHistorySnapshot
  );

  return { history, removeHistoryItem, clearHistory: clearWatchHistory, isMounted: true };
}
