import { WatchlistRepository } from './watchlist.repository';
import { WatchlistItem } from './watchlist.types';
import {
  STORAGE_KEYS,
  STORAGE_EVENTS,
  safeWriteJson,
  subscribeStorageEvent,
  isBrowser,
} from '../storage';

const STORAGE_KEY = STORAGE_KEYS.watchlist;
const EVENT_NAME = STORAGE_EVENTS.watchlist;
const EMPTY_LIST: WatchlistItem[] = [];

export class LocalWatchlistRepository implements WatchlistRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: WatchlistItem[] = EMPTY_LIST;
  private cachedVisible: WatchlistItem[] = EMPTY_LIST;

  getAll(): WatchlistItem[] {
    if (!isBrowser()) return EMPTY_LIST;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedVisible;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_LIST;
        this.cachedVisible = EMPTY_LIST;
        return EMPTY_LIST;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_LIST;
        this.cachedVisible = EMPTY_LIST;
        return EMPTY_LIST;
      }
      // Validate
      const validated: WatchlistItem[] = parsed.filter(
        (item): item is WatchlistItem =>
          Boolean(item) && typeof item.slug === 'string' && typeof item.title === 'string'
      );
      this.cachedParsed = validated;
      this.cachedVisible = validated.filter((item) => item.deletedAt == null);
      return this.cachedVisible;
    } catch {
      return EMPTY_LIST;
    }
  }

  getAllForSync(): WatchlistItem[] {
    if (!isBrowser()) return EMPTY_LIST;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedParsed;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_LIST;
        this.cachedVisible = EMPTY_LIST;
        return EMPTY_LIST;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_LIST;
        this.cachedVisible = EMPTY_LIST;
        return EMPTY_LIST;
      }
      this.cachedParsed = parsed.filter(
        (item): item is WatchlistItem =>
          Boolean(item) && typeof item.slug === 'string' && typeof item.title === 'string'
      );
      this.cachedVisible = this.cachedParsed.filter((item) => item.deletedAt == null);
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
    const list = this.getAllForSync();
    const filtered = list.filter((i) => i.slug !== item.slug);
    const updated = [{ ...item, updatedAt: Date.now(), deletedAt: undefined }, ...filtered];
    this.saveList(updated);
  }

  remove(movieSlug: string): void {
    const list = this.getAllForSync();
    const timestamp = Date.now();
    const updated = list.map((item) =>
      item.slug === movieSlug ? { ...item, updatedAt: timestamp, deletedAt: timestamp } : item
    );
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
    const list = this.getAllForSync();
    const timestamp = Date.now();
    this.saveList(list.map((item) => ({ ...item, updatedAt: timestamp, deletedAt: timestamp })));
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, STORAGE_KEY, callback);
  }

  private saveList(list: WatchlistItem[]): void {
    safeWriteJson(STORAGE_KEY, list, EVENT_NAME);
    this.cachedParsed = list;
    this.cachedVisible = list.filter((item) => item.deletedAt == null);
    try {
      this.cachedRaw = JSON.stringify(list);
    } catch {
      this.cachedRaw = null;
    }
  }
}
