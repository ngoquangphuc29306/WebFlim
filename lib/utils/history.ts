'use client';

import { WatchHistoryItem } from '@/types/movie';
import { watchHistoryRepository, useWatchHistory } from '@/lib/persistence/history';

export { useWatchHistory };

export function getWatchHistory(): WatchHistoryItem[] {
  return watchHistoryRepository.getAll();
}

export function saveWatchHistory(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
  watchHistoryRepository.save(item);
}

export function removeHistoryItem(slug: string): void {
  watchHistoryRepository.remove(slug);
}

export function clearWatchHistory(): void {
  watchHistoryRepository.clear();
}
