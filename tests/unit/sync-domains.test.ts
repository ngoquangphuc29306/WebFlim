import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MovieCardModel,
  PlaybackProgress,
  WatchHistoryItem,
} from '@/types/movie';
import { DEFAULT_PREFERENCES } from '@/lib/persistence/player-preferences/preferences.types';
import {
  mergeHistory,
  mergePreferences,
  mergeProgress,
  mergeWatchlist,
} from '@/lib/sync/merge';
import { determineAuthTransition, type SyncMeta } from '@/lib/sync/sync-meta';
import {
  clearQueueForUser,
  enqueueMutation,
  getPendingMutationsForUser,
  getSyncQueue,
} from '@/lib/sync/sync-queue';
import { STORAGE_KEYS } from '@/lib/persistence/storage';
import { LocalWatchlistRepository } from '@/lib/persistence/watchlist/local-watchlist.repository';
import { LocalWatchHistoryRepository } from '@/lib/persistence/history/local-history.repository';
import { LocalPlaybackProgressRepository } from '@/lib/persistence/progress/local-progress.repository';
import { LocalPlayerPreferencesRepository } from '@/lib/persistence/player-preferences/local-preferences.repository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();

function installBrowserStorage(): void {
  storage.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

function removeBrowserStorage(): void {
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'localStorage');
}

function movie(slug: string, overrides: Partial<MovieCardModel> = {}): MovieCardModel {
  return {
    id: slug,
    slug,
    title: `Movie ${slug}`,
    posterUrl: `https://img.example/${slug}.jpg`,
    thumbUrl: `https://img.example/${slug}-thumb.jpg`,
    categories: [],
    countries: [],
    ...overrides,
  };
}

function history(slug: string, updatedAt: number, episodeSlug = 'full'): WatchHistoryItem {
  return {
    slug,
    title: `Movie ${slug}`,
    posterUrl: `https://img.example/${slug}.jpg`,
    episodeName: episodeSlug,
    episodeSlug,
    serverName: 'Vietsub',
    updatedAt,
  };
}

function progress(
  movieSlug: string,
  episodeSlug: string,
  updatedAt: number,
  currentTime: number
): PlaybackProgress {
  return {
    movieSlug,
    movieTitle: `Movie ${movieSlug}`,
    episodeSlug,
    currentTime,
    duration: 100,
    completed: currentTime >= 95,
    updatedAt,
  };
}

describe('sync domain contracts and local persistence resilience', () => {
  beforeEach(() => {
    installBrowserStorage();
  });

  afterEach(() => {
    removeBrowserStorage();
  });

  it('maps the auth transition matrix from current sync metadata rules', () => {
    const cleanMeta: SyncMeta = {
      lastSyncedUserId: null,
      localStateOwnerUserId: null,
      guestMutationBaseUserId: null,
      lastSyncAt: null,
    };

    expect(determineAuthTransition(null, 'user-a', cleanMeta)).toBe('pure-guest-to-user');
    expect(determineAuthTransition('user-a', 'user-a', cleanMeta)).toBe('same-user');
    expect(determineAuthTransition('user-a', null, cleanMeta)).toBe('user-to-guest');
    expect(determineAuthTransition('user-a', 'user-b', cleanMeta)).toBe('user-to-different-user');
    expect(
      determineAuthTransition(null, 'user-a', {
        ...cleanMeta,
        guestMutationBaseUserId: 'user-a',
      })
    ).toBe('post-logout-guest-to-origin-user');
    expect(
      determineAuthTransition(null, 'user-b', {
        ...cleanMeta,
        guestMutationBaseUserId: 'user-a',
      })
    ).toBe('post-logout-guest-to-different-user');
  });

  it('unions watchlist records and keeps richer local metadata', () => {
    const merged = mergeWatchlist(
      [movie('shared', { posterUrl: 'local-poster', categories: [{ id: 1, name: 'Action', slug: 'action' }] })],
      [movie('shared', { posterUrl: 'cloud-poster', thumbUrl: '' }), movie('cloud-only')]
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.slug === 'shared')).toMatchObject({
      posterUrl: 'local-poster',
      thumbUrl: 'https://img.example/shared-thumb.jpg',
      categories: [{ id: 1, name: 'Action', slug: 'action' }],
    });
  });

  it('uses the newer history record and keeps one row per movie', () => {
    const merged = mergeHistory([history('movie', 20, 'episode-2')], [history('movie', 10, 'episode-1')]);

    expect(merged).toHaveLength(1);
    expect(merged[0].episodeSlug).toBe('episode-2');
  });

  it('uses progress timestamps per movie and episode identity', () => {
    const merged = mergeProgress(
      [progress('movie', 'episode-1', 20, 40), progress('movie', 'episode-2', 5, 10)],
      [progress('movie', 'episode-1', 10, 90)]
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.episodeSlug === 'episode-1')?.currentTime).toBe(40);
    expect(merged.find((item) => item.episodeSlug === 'episode-2')?.currentTime).toBe(10);
  });

  it('uses cloud preferences only when cloud is at least as new', () => {
    const local = { ...DEFAULT_PREFERENCES, volume: 0.4, updatedAt: 20 };
    const cloud = { ...DEFAULT_PREFERENCES, volume: 0.8, updatedAt: 30 };

    expect(mergePreferences(local, cloud).volume).toBe(0.8);
    expect(mergePreferences(local, { ...cloud, updatedAt: 10 }).volume).toBe(0.4);
    expect(mergePreferences(local, null)).toBe(local);
  });

  it('coalesces queued mutations by owner and domain identity', () => {
    const first = enqueueMutation({
      ownerUserId: 'user-a',
      domain: 'watchlist',
      action: 'upsert',
      movieSlug: 'movie',
      payload: movie('movie', { title: 'old' }),
    });
    enqueueMutation({
      ownerUserId: 'user-a',
      domain: 'watchlist',
      action: 'upsert',
      movieSlug: 'movie',
      payload: movie('movie', { title: 'new' }),
    });
    enqueueMutation({
      ownerUserId: 'user-b',
      domain: 'watchlist',
      action: 'upsert',
      movieSlug: 'movie',
      payload: movie('movie', { title: 'other user' }),
    });

    expect(first.id).toContain('watchlist_upsert_movie');
    expect(getPendingMutationsForUser('user-a')).toHaveLength(1);
    expect(getPendingMutationsForUser('user-a')[0].payload).toMatchObject({ title: 'new' });
    expect(getPendingMutationsForUser('user-b')).toHaveLength(1);

    clearQueueForUser('user-a');
    expect(getPendingMutationsForUser('user-a')).toHaveLength(0);
    expect(getSyncQueue()).toHaveLength(1);
  });

  it('ignores malformed persisted records without crashing repositories or queue reads', () => {
    storage.setItem(STORAGE_KEYS.watchlist, '{malformed');
    storage.setItem(STORAGE_KEYS.history, JSON.stringify({ unexpected: true }));
    storage.setItem(STORAGE_KEYS.progress, JSON.stringify([null, { movieSlug: 'missing-fields' }]));
    storage.setItem(STORAGE_KEYS.preferences, 'not-json');
    storage.setItem(STORAGE_KEYS.syncQueue, JSON.stringify([{ invalid: true }]));

    expect(new LocalWatchlistRepository().getAll()).toEqual([]);
    expect(new LocalWatchHistoryRepository().getAll()).toEqual([]);
    expect(new LocalPlaybackProgressRepository().getAll()).toEqual([]);
    expect(new LocalPlayerPreferencesRepository().get()).toEqual(DEFAULT_PREFERENCES);
    expect(getSyncQueue()).toEqual([]);
  });
});
