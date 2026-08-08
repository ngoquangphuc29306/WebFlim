'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { watchHistoryRepository } from './history.service';
import { WatchHistoryItem } from './history.types';

const EMPTY_HISTORY: WatchHistoryItem[] = [];

function subscribeHistory(callback: () => void) {
  return watchHistoryRepository.subscribe(callback);
}

function getHistorySnapshot(): WatchHistoryItem[] {
  return watchHistoryRepository.getAll();
}

function getServerHistorySnapshot(): WatchHistoryItem[] {
  return EMPTY_HISTORY;
}

export function useWatchHistory() {
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot
  );

  const removeHistoryItem = useCallback((slug: string) => {
    watchHistoryRepository.remove(slug);
  }, []);

  const clearHistory = useCallback(() => {
    watchHistoryRepository.clear();
  }, []);

  return {
    history,
    removeHistoryItem,
    clearHistory,
    isMounted: true,
  };
}
