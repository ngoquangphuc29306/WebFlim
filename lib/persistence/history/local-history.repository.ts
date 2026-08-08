import { WatchHistoryRepository } from './history.repository';
import { WatchHistoryItem } from './history.types';
import {
  safeWriteJson,
  safeRemoveItem,
  subscribeStorageEvent,
  isBrowser,
} from '../storage';

const STORAGE_KEY = 'vsmov_watch_history_v1';
const EVENT_NAME = 'vsmov_history_updated';
const MAX_HISTORY_ITEMS = 30;
const EMPTY_HISTORY: WatchHistoryItem[] = [];

export class LocalWatchHistoryRepository implements WatchHistoryRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: WatchHistoryItem[] = EMPTY_HISTORY;

  getAll(): WatchHistoryItem[] {
    if (!isBrowser()) return EMPTY_HISTORY;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedParsed;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_HISTORY;
        return EMPTY_HISTORY;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_HISTORY;
        return EMPTY_HISTORY;
      }
      // Validate and ensure schema compatibility
      const validated: WatchHistoryItem[] = parsed.filter(
        (item): item is WatchHistoryItem =>
          Boolean(item) &&
          typeof item.slug === 'string' &&
          typeof item.title === 'string' &&
          typeof item.episodeSlug === 'string'
      );
      this.cachedParsed = validated;
      return this.cachedParsed;
    } catch {
      return EMPTY_HISTORY;
    }
  }

  save(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
    if (!isBrowser() || !item.slug) return;
    const list = this.getAll();
    const newItem: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
    };

    const filtered = list.filter((h) => h.slug !== item.slug);
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    this.saveList(updated);
  }

  remove(movieSlug: string): void {
    if (!isBrowser()) return;
    const list = this.getAll();
    const updated = list.filter((h) => h.slug !== movieSlug);
    this.saveList(updated);
  }

  clear(): void {
    safeRemoveItem(STORAGE_KEY, EVENT_NAME);
    this.cachedRaw = null;
    this.cachedParsed = EMPTY_HISTORY;
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, callback);
  }

  private saveList(list: WatchHistoryItem[]): void {
    safeWriteJson(STORAGE_KEY, list, EVENT_NAME);
    this.cachedParsed = list;
    try {
      this.cachedRaw = JSON.stringify(list);
    } catch {
      this.cachedRaw = null;
    }
  }
}
