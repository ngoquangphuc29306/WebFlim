import { WatchHistoryItem } from './history.types';

export interface WatchHistoryRepository {
  getAll(): WatchHistoryItem[];
  save(item: Omit<WatchHistoryItem, 'updatedAt'>): void;
  remove(movieSlug: string): void;
  clear(): void;
  subscribe(callback: () => void): () => void;
}
