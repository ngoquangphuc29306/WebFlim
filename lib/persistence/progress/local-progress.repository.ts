import { PlaybackProgressRepository } from './progress.repository';
import { PlaybackProgress, COMPLETION_THRESHOLD } from './progress.types';
import {
  safeWriteJson,
  safeRemoveItem,
  subscribeStorageEvent,
  isBrowser,
} from '../storage';

const STORAGE_KEY = 'vsmov_playback_progress_v1';
const EVENT_NAME = 'vsmov_progress_updated';
const MAX_PROGRESS_ITEMS = 50;
const EMPTY_PROGRESS_LIST: PlaybackProgress[] = [];

export class LocalPlaybackProgressRepository implements PlaybackProgressRepository {
  private cachedRaw: string | null = null;
  private cachedParsed: PlaybackProgress[] = EMPTY_PROGRESS_LIST;

  getAll(): PlaybackProgress[] {
    if (!isBrowser()) return EMPTY_PROGRESS_LIST;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === this.cachedRaw) return this.cachedParsed;
      this.cachedRaw = raw;
      if (!raw) {
        this.cachedParsed = EMPTY_PROGRESS_LIST;
        return EMPTY_PROGRESS_LIST;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.cachedParsed = EMPTY_PROGRESS_LIST;
        return EMPTY_PROGRESS_LIST;
      }

      // Validate each record
      const validated: PlaybackProgress[] = parsed
        .filter((item): item is PlaybackProgress => {
          return (
            Boolean(item) &&
            typeof item.movieSlug === 'string' &&
            typeof item.episodeSlug === 'string' &&
            typeof item.currentTime === 'number' &&
            typeof item.duration === 'number' &&
            isFinite(item.currentTime) &&
            isFinite(item.duration) &&
            item.currentTime >= 0 &&
            item.duration > 0
          );
        })
        .map((item) => ({
          ...item,
          completed:
            item.completed ||
            (item.duration > 0 && item.currentTime / item.duration >= COMPLETION_THRESHOLD),
        }));

      this.cachedParsed = validated;
      return this.cachedParsed;
    } catch {
      return EMPTY_PROGRESS_LIST;
    }
  }

  get(movieSlug: string, episodeSlug: string): PlaybackProgress | null {
    const list = this.getAll();
    return list.find((p) => p.movieSlug === movieSlug && p.episodeSlug === episodeSlug) || null;
  }

  save(item: Omit<PlaybackProgress, 'updatedAt' | 'completed'>): void {
    if (!isBrowser()) return;
    if (!item.movieSlug || !item.episodeSlug) return;
    if (!isFinite(item.currentTime) || !isFinite(item.duration) || item.duration <= 0) return;

    const list = this.getAll();
    const isCompleted = item.currentTime / item.duration >= COMPLETION_THRESHOLD;

    const newItem: PlaybackProgress = {
      ...item,
      completed: isCompleted,
      updatedAt: Date.now(),
    };

    const filtered = list.filter(
      (p) => !(p.movieSlug === item.movieSlug && p.episodeSlug === item.episodeSlug)
    );

    const updated = [newItem, ...filtered].slice(0, MAX_PROGRESS_ITEMS);
    this.saveList(updated);
  }

  remove(movieSlug: string, episodeSlug?: string): void {
    if (!isBrowser()) return;
    const list = this.getAll();

    const updated = episodeSlug
      ? list.filter((p) => !(p.movieSlug === movieSlug && p.episodeSlug === episodeSlug))
      : list.filter((p) => p.movieSlug !== movieSlug);

    this.saveList(updated);
  }

  clear(): void {
    safeRemoveItem(STORAGE_KEY, EVENT_NAME);
    this.cachedRaw = null;
    this.cachedParsed = EMPTY_PROGRESS_LIST;
  }

  subscribe(callback: () => void): () => void {
    return subscribeStorageEvent(EVENT_NAME, STORAGE_KEY, callback);
  }

  private saveList(list: PlaybackProgress[]): void {
    safeWriteJson(STORAGE_KEY, list, EVENT_NAME);
    this.cachedParsed = list;
    try {
      this.cachedRaw = JSON.stringify(list);
    } catch {
      this.cachedRaw = null;
    }
  }
}
