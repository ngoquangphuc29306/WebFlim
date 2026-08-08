import { WatchlistRepository } from './watchlist.repository';
import { WatchlistItem } from './watchlist.types';
import {
  safeReadJson,
  safeWriteJson,
  safeRemoveItem,
  subscribeStorageEvent,
  isBrowser,
} from '../storage';

const STORAGE_KEY = 'vsmov_watchlist_v1';
const EVENT_NAME = 'vsmov_watchlist_updated';
const EMPTY_LIST: WatchlistItem[] = [];

export class LocalWatchlistRepository implements WatchlistRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: WatchlistItem[] = EMPTY_LIST;

  getAll(): WatchlistItem[] {
    if (!isBrowser()) return EMPTY_LIST;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedParsed;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_LIST;
        return EMPTY_LIST;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_LIST;
        return EMPTY_LIST;
      }
      // Validate
      const validated: WatchlistItem[] = parsed.filter(
        (item): item is WatchlistItem =>
          Boolean(item) && typeof item.slug === 'string' && typeof item.title === 'string'
      );
      this.cachedParsed = validated;
      return this.cachedParsed;
    } catch {
      return EMPTY_LIST;
    }
  }

  has(movieSlug: string): boolean {
    const list = this.getAll();
    return list.some((item) => item.slug === movieSlug);
  }

  add(item: WatchlistItem): void {
    const list = this.getAll();
    const filtered = list.filter((i) => i.slug !== item.slug);
    const updated = [item, ...filtered];
    this.saveList(updated);
  }

  remove(movieSlug: string): void {
    const list = this.getAll();
    const updated = list.filter((i) => i.slug !== movieSlug);
    this.saveList(updated);
  }

  toggle(item: WatchlistItem): boolean {
    const exists = this.has(item.slug);
    if (exists) {
      this.remove(item.slug);
    } else {
      this.add(item);
    }
    return !exists;
  }

  clear(): void {
    safeRemoveItem(STORAGE_KEY, EVENT_NAME);
    this.cachedRaw = null;
    this.cachedParsed = EMPTY_LIST;
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, STORAGE_KEY, callback);
  }

  private saveList(list: WatchlistItem[]): void {
    safeWriteJson(STORAGE_KEY, list, EVENT_NAME);
    this.cachedParsed = list;
    try {
      this.cachedRaw = JSON.stringify(list);
    } catch {
      this.cachedRaw = null;
    }
  }
}
