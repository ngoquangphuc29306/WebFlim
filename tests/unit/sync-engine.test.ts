import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovieCardModel, PlaybackProgress, WatchHistoryItem } from '@/types/movie';
import type { PlayerPreferences } from '@/lib/persistence/player-preferences/preferences.types';

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

class TestWindow {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;
    const callback: EventListener =
      typeof listener === 'function' ? listener : (event) => listener.handleEvent(event);
    const typeListeners = this.listeners.get(type) ?? new Set<EventListener>();
    typeListeners.add(callback);
    this.listeners.set(type, typeListeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;
    const typeListeners = this.listeners.get(type);
    if (!typeListeners) return;
    for (const callback of typeListeners) {
      if (callback === listener || typeof listener !== 'function') {
        typeListeners.delete(callback);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
    return true;
  }
}

interface CloudState {
  watchlist: MovieCardModel[];
  history: WatchHistoryItem[];
  progress: PlaybackProgress[];
  preferences: PlayerPreferences | null;
}

interface GatewayCalls {
  watchlistUpserts: Array<{ userId: string; item: MovieCardModel }>;
  historyUpserts: Array<{ userId: string; item: WatchHistoryItem }>;
  progressUpserts: Array<{ userId: string; item: PlaybackProgress }>;
  preferencesUpserts: Array<{ userId: string; prefs: PlayerPreferences }>;
}

const storage = new MemoryStorage();
let windowStub: TestWindow;
let navigatorState: { onLine: boolean };
let restoreBrowserGlobals: (() => void) | null = null;

function installBrowserGlobals(): void {
  storage.clear();
  windowStub = new TestWindow();
  navigatorState = { onLine: true };

  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  };

  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigatorState });

  restoreBrowserGlobals = () => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  };
}

function movie(slug: string, title = `Movie ${slug}`): MovieCardModel {
  return {
    id: slug,
    slug,
    title,
    posterUrl: `https://img.example/${slug}.jpg`,
    thumbUrl: `https://img.example/${slug}-thumb.jpg`,
    categories: [],
    countries: [],
  };
}

function createCloudState(): Record<string, CloudState> {
  return {
    'user-a': { watchlist: [], history: [], progress: [], preferences: null },
    'user-b': { watchlist: [], history: [], progress: [], preferences: null },
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function createHarness() {
  const cloud = createCloudState();
  const calls: GatewayCalls = {
    watchlistUpserts: [],
    historyUpserts: [],
    progressUpserts: [],
    preferencesUpserts: [],
  };

  const watchlistGateway = {
    list: vi.fn(async (userId: string) => [...(cloud[userId]?.watchlist ?? [])]),
    upsert: vi.fn(async (userId: string, item: MovieCardModel) => {
      calls.watchlistUpserts.push({ userId, item });
      cloud[userId].watchlist = [item, ...cloud[userId].watchlist.filter((entry) => entry.slug !== item.slug)];
    }),
    remove: vi.fn(async (userId: string, movieSlug: string) => {
      cloud[userId].watchlist = cloud[userId].watchlist.filter((entry) => entry.slug !== movieSlug);
    }),
    clear: vi.fn(async (userId: string) => {
      cloud[userId].watchlist = [];
    }),
  };

  const historyGateway = {
    list: vi.fn(async (userId: string) => [...(cloud[userId]?.history ?? [])]),
    upsert: vi.fn(async (userId: string, item: WatchHistoryItem) => {
      calls.historyUpserts.push({ userId, item });
      cloud[userId].history = [item, ...cloud[userId].history.filter((entry) => entry.slug !== item.slug)];
    }),
    remove: vi.fn(async (userId: string, movieSlug: string) => {
      cloud[userId].history = cloud[userId].history.filter((entry) => entry.slug !== movieSlug);
    }),
    clear: vi.fn(async (userId: string) => {
      cloud[userId].history = [];
    }),
  };

  const progressGateway = {
    list: vi.fn(async (userId: string) => [...(cloud[userId]?.progress ?? [])]),
    upsert: vi.fn(async (userId: string, item: PlaybackProgress) => {
      calls.progressUpserts.push({ userId, item });
      cloud[userId].progress = [
        item,
        ...cloud[userId].progress.filter(
          (entry) => !(entry.movieSlug === item.movieSlug && entry.episodeSlug === item.episodeSlug)
        ),
      ];
    }),
    remove: vi.fn(async (userId: string, movieSlug: string, episodeSlug?: string) => {
      cloud[userId].progress = cloud[userId].progress.filter(
        (entry) => entry.movieSlug !== movieSlug || (episodeSlug !== undefined && entry.episodeSlug !== episodeSlug)
      );
    }),
    clear: vi.fn(async (userId: string) => {
      cloud[userId].progress = [];
    }),
  };

  const preferencesGateway = {
    get: vi.fn(async (userId: string) => cloud[userId]?.preferences ?? null),
    upsert: vi.fn(async (userId: string, prefs: PlayerPreferences) => {
      calls.preferencesUpserts.push({ userId, prefs });
      cloud[userId].preferences = prefs;
    }),
  };

  vi.resetModules();
  vi.doMock('@/lib/cloud/watchlist-gateway', () => ({ watchlistGateway }));
  vi.doMock('@/lib/cloud/history-gateway', () => ({ historyGateway }));
  vi.doMock('@/lib/cloud/progress-gateway', () => ({ progressGateway }));
  vi.doMock('@/lib/cloud/preferences-gateway', () => ({ preferencesGateway }));
  vi.doMock('@/lib/supabase/client', () => ({ getSupabaseBrowserClient: () => null }));

  const syncModule = await import('@/lib/sync/sync-engine');
  const queueModule = await import('@/lib/sync/sync-queue');
  const metaModule = await import('@/lib/sync/sync-meta');
  const storageModule = await import('@/lib/persistence/storage');
  const watchlistRepository = await import('@/lib/persistence/watchlist/local-watchlist.repository');

  return {
    cloud,
    calls,
    gateways: { watchlistGateway, historyGateway, progressGateway, preferencesGateway },
    engine: syncModule.syncEngine,
    queueModule,
    metaModule,
    storageModule,
    watchlistRepository,
  };
}

describe('SyncEngine auth and network transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installBrowserGlobals();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock('@/lib/cloud/watchlist-gateway');
    vi.doUnmock('@/lib/cloud/history-gateway');
    vi.doUnmock('@/lib/cloud/progress-gateway');
    vi.doUnmock('@/lib/cloud/preferences-gateway');
    vi.doUnmock('@/lib/supabase/client');
    restoreBrowserGlobals?.();
    restoreBrowserGlobals = null;
  });

  it('preserves guest data, merges cloud data, and flushes adopted mutations on login', async () => {
    const harness = await createHarness();
    const localItem = movie('guest-movie', 'Guest local');
    const cloudItem = movie('cloud-movie', 'Cloud item');
    harness.cloud['user-a'].watchlist = [cloudItem];
    storage.setItem(harness.storageModule.STORAGE_KEYS.watchlist, JSON.stringify([localItem]));

    await harness.engine.handleAuthChange('user-a');

    const localItems = new harness.watchlistRepository.LocalWatchlistRepository().getAll();
    expect(localItems.map((item) => item.slug).sort()).toEqual(['cloud-movie', 'guest-movie']);
    expect(harness.calls.watchlistUpserts).toEqual([
      { userId: 'user-a', item: localItem },
    ]);
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toEqual([]);
    expect(harness.metaModule.getSyncMeta().localStateOwnerUserId).toBe('user-a');
    expect(harness.engine.getStatus()).toBe('synced');
  });

  it('does not duplicate same-user restoration after the user is hydrated', async () => {
    const harness = await createHarness();

    await harness.engine.handleAuthChange('user-a');
    const listCallsAfterHydration = harness.gateways.watchlistGateway.list.mock.calls.length;

    await harness.engine.handleAuthChange('user-a');

    expect(harness.gateways.watchlistGateway.list).toHaveBeenCalledTimes(listCallsAfterHydration);
    expect(harness.engine.getStatus()).toBe('synced');
  });

  it('keeps prior-user data isolated across logout and guest-to-different-user login', async () => {
    const harness = await createHarness();
    const userAItem = movie('user-a-item');
    const userBItem = movie('user-b-item');
    harness.cloud['user-a'].watchlist = [userAItem];
    harness.cloud['user-b'].watchlist = [userBItem];

    await harness.engine.handleAuthChange('user-a');
    await harness.engine.handleAuthChange(null);
    expect(harness.metaModule.getSyncMeta()).toMatchObject({
      localStateOwnerUserId: null,
      guestMutationBaseUserId: 'user-a',
    });
    expect(harness.engine.getStatus()).toBe('idle');
    harness.engine.onWatchlistAdd(movie('guest-after-logout'));
    await harness.engine.handleAuthChange('user-b');

    const localItems = new harness.watchlistRepository.LocalWatchlistRepository().getAll();
    expect(localItems.map((item) => item.slug)).toEqual(['user-b-item']);
    expect(harness.calls.watchlistUpserts.some((call) => call.userId === 'user-b')).toBe(false);
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toHaveLength(1);
    expect(harness.queueModule.getPendingMutationsForUser('user-b')).toHaveLength(0);
    expect(harness.metaModule.getSyncMeta().localStateOwnerUserId).toBe('user-b');
  });

  it('replaces local state with user B and ignores stale user A responses', async () => {
    const harness = await createHarness();
    const aWatchlist = createDeferred<MovieCardModel[]>();
    const aHistory = createDeferred<WatchHistoryItem[]>();
    const aProgress = createDeferred<PlaybackProgress[]>();
    const aPreferences = createDeferred<PlayerPreferences | null>();

    harness.gateways.watchlistGateway.list.mockImplementation((userId: string) =>
      userId === 'user-a' ? aWatchlist.promise : Promise.resolve([movie('user-b-item')])
    );
    harness.gateways.historyGateway.list.mockImplementation((userId: string) =>
      userId === 'user-a' ? aHistory.promise : Promise.resolve([])
    );
    harness.gateways.progressGateway.list.mockImplementation((userId: string) =>
      userId === 'user-a' ? aProgress.promise : Promise.resolve([])
    );
    harness.gateways.preferencesGateway.get.mockImplementation((userId: string) =>
      userId === 'user-a' ? aPreferences.promise : Promise.resolve(null)
    );

    const userASync = harness.engine.handleAuthChange('user-a');
    await Promise.resolve();
    const userBSync = harness.engine.handleAuthChange('user-b');

    aWatchlist.resolve([movie('stale-user-a-item')]);
    aHistory.resolve([]);
    aProgress.resolve([]);
    aPreferences.resolve(null);
    await userASync;
    await userBSync;

    const localItems = new harness.watchlistRepository.LocalWatchlistRepository().getAll();
    expect(localItems.map((item) => item.slug)).toEqual(['user-b-item']);
    expect(harness.metaModule.getSyncMeta().lastSyncedUserId).toBe('user-b');
    expect(harness.engine.getStatus()).toBe('synced');
  });

  it('retains offline mutations and flushes them after the online event', async () => {
    const harness = await createHarness();
    navigatorState.onLine = false;

    await harness.engine.handleAuthChange('user-a');
    const offlineItem = movie('offline-item');
    harness.engine.onWatchlistAdd(offlineItem);

    expect(harness.engine.getStatus()).toBe('offline');
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toHaveLength(1);

    navigatorState.onLine = true;
    windowStub.dispatchEvent(new Event('online'));
    await harness.engine.triggerSync('user-a');
    await vi.advanceTimersByTimeAsync(0);

    expect(harness.calls.watchlistUpserts).toContainEqual({ userId: 'user-a', item: offlineItem });
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toEqual([]);
    expect(harness.engine.getStatus()).toBe('synced');
  });

  it('retains dirty playback progress offline and flushes it after reconnect', async () => {
    const harness = await createHarness();
    navigatorState.onLine = false;

    await harness.engine.handleAuthChange('user-a');
    const offlineProgress: PlaybackProgress = {
      movieSlug: 'offline-movie',
      movieTitle: 'Offline movie',
      episodeSlug: 'episode-1',
      currentTime: 40,
      duration: 100,
      completed: false,
      updatedAt: 10,
    };
    harness.engine.onProgressSave(offlineProgress, true);
    await Promise.resolve();

    expect(harness.engine.getStatus()).toBe('offline');
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toHaveLength(1);

    navigatorState.onLine = true;
    windowStub.dispatchEvent(new Event('online'));
    await harness.engine.triggerSync('user-a');
    await vi.advanceTimersByTimeAsync(0);

    expect(harness.calls.progressUpserts).toContainEqual({ userId: 'user-a', item: offlineProgress });
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toEqual([]);
    expect(harness.engine.getStatus()).toBe('synced');
  });

  it('retries a temporary gateway failure and clears the mutation after success', async () => {
    const harness = await createHarness();
    await harness.engine.handleAuthChange('user-a');

    let attempts = 0;
    const originalUpsert = harness.gateways.watchlistGateway.upsert.getMockImplementation();
    harness.gateways.watchlistGateway.upsert.mockImplementation(async (userId: string, item: MovieCardModel) => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary gateway failure');
      await originalUpsert?.(userId, item);
    });

    const item = movie('retry-item');
    harness.engine.onWatchlistAdd(item);
    const syncPromise = harness.engine.triggerSync('user-a');
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    await syncPromise;

    expect(attempts).toBe(2);
    expect(harness.queueModule.getPendingMutationsForUser('user-a')).toEqual([]);
    expect(harness.engine.getStatus()).toBe('synced');
  });
});
