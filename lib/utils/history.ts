'use client';

import { WatchHistoryItem } from '@/types/movie';
import { watchHistoryRepository, useWatchHistory } from '@/lib/persistence/history';
import { syncEngine } from '@/lib/sync/sync-engine';

export { useWatchHistory };

export function getWatchHistory(): WatchHistoryItem[] {
  return watchHistoryRepository.getAll();
}

export function saveWatchHistory(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
  watchHistoryRepository.save(item);
  const fullItem: WatchHistoryItem = {
    ...item,
    updatedAt: Date.now(),
  };
  syncEngine.onHistorySave(fullItem);
}

export function removeHistoryItem(slug: string): void {
  watchHistoryRepository.remove(slug);
  syncEngine.onHistoryRemove(slug);
}

export function clearWatchHistory(): void {
  watchHistoryRepository.clear();
  syncEngine.onHistoryClear();
}

