import { WatchlistItem } from './watchlist.types';

export interface WatchlistRepository {
  getAll(): WatchlistItem[];
  has(movieSlug: string): boolean;
  add(item: WatchlistItem): void;
  remove(movieSlug: string): void;
  toggle(item: WatchlistItem): boolean;
  clear(): void;
  subscribe(callback: () => void): () => void;
}
