'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { watchHistoryRepository } from './history.service';
import { WatchHistoryItem } from './history.types';
import { syncEngine } from '@/lib/sync/sync-engine';

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
    syncEngine.onHistoryRemove(slug);
  }, []);

  const clearHistory = useCallback(() => {
    watchHistoryRepository.clear();
    syncEngine.onHistoryClear();
  }, []);

  return {
    history,
    removeHistoryItem,
    clearHistory,
    isMounted: true,
  };
}
