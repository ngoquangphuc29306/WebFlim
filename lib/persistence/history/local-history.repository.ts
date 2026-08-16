import { WatchHistoryRepository } from './history.repository';
import { WatchHistoryItem } from './history.types';
import {
  STORAGE_KEYS,
  STORAGE_EVENTS,
  safeWriteJson,
  subscribeStorageEvent,
  isBrowser,
} from '../storage';

const STORAGE_KEY = STORAGE_KEYS.history;
const EVENT_NAME = STORAGE_EVENTS.history;
const MAX_HISTORY_ITEMS = 30;
const EMPTY_HISTORY: WatchHistoryItem[] = [];

export class LocalWatchHistoryRepository implements WatchHistoryRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: WatchHistoryItem[] = EMPTY_HISTORY;
  private cachedVisible: WatchHistoryItem[] = EMPTY_HISTORY;

  getAll(): WatchHistoryItem[] {
    if (!isBrowser()) return EMPTY_HISTORY;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedVisible;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_HISTORY;
        this.cachedVisible = EMPTY_HISTORY;
        return EMPTY_HISTORY;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_HISTORY;
        this.cachedVisible = EMPTY_HISTORY;
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
      this.cachedVisible = validated
        .filter((item) => item.deletedAt == null)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_HISTORY_ITEMS);
      return this.cachedVisible;
    } catch {
      return EMPTY_HISTORY;
    }
  }

  getAllForSync(): WatchHistoryItem[] {
    if (!isBrowser()) return EMPTY_HISTORY;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedParsed;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_HISTORY;
        this.cachedVisible = EMPTY_HISTORY;
        return EMPTY_HISTORY;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_HISTORY;
        this.cachedVisible = EMPTY_HISTORY;
        return EMPTY_HISTORY;
      }
      this.cachedParsed = parsed.filter(
        (item): item is WatchHistoryItem =>
          Boolean(item) && typeof item.slug === 'string' && typeof item.title === 'string' && typeof item.episodeSlug === 'string'
      );
      this.cachedVisible = this.cachedParsed
        .filter((item) => item.deletedAt == null)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_HISTORY_ITEMS);
      return this.cachedParsed;
    } catch {
      return EMPTY_HISTORY;
    }
  }

  save(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
    if (!isBrowser() || !item.slug) return;
    const list = this.getAllForSync();
    const newItem: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
      deletedAt: undefined,
    };

    const filtered = list.filter((h) => h.slug !== item.slug);
    const updated = [newItem, ...filtered];

    this.saveList(updated);
  }

  remove(movieSlug: string): void {
    if (!isBrowser()) return;
    const list = this.getAllForSync();
    const timestamp = Date.now();
    const updated = list.map((item) =>
      item.slug === movieSlug ? { ...item, updatedAt: timestamp, deletedAt: timestamp } : item
    );
    this.saveList(updated);
  }

  clear(): void {
    const list = this.getAllForSync();
    const timestamp = Date.now();
    this.saveList(list.map((item) => ({ ...item, updatedAt: timestamp, deletedAt: timestamp })));
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, STORAGE_KEY, callback);
  }

  private saveList(list: WatchHistoryItem[]): void {
    safeWriteJson(STORAGE_KEY, list, EVENT_NAME);
    this.cachedParsed = list;
    this.cachedVisible = list
      .filter((item) => item.deletedAt == null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_HISTORY_ITEMS);
    try {
      this.cachedRaw = JSON.stringify(list);
    } catch {
      this.cachedRaw = null;
    }
  }
}
