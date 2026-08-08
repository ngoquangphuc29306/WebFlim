import { watchlistGateway } from '@/lib/cloud/watchlist-gateway';
import { historyGateway } from '@/lib/cloud/history-gateway';
import { progressGateway } from '@/lib/cloud/progress-gateway';
import { preferencesGateway } from '@/lib/cloud/preferences-gateway';
import { getSyncMeta, updateSyncMeta } from './sync-meta';
import {
  mergeWatchlist,
  mergeHistory,
  mergeProgress,
  mergePreferences,
} from './merge';
import { watchlistRepository } from '@/lib/persistence/watchlist';
import { watchHistoryRepository } from '@/lib/persistence/history';
import { playbackProgressRepository } from '@/lib/persistence/progress';
import { playerPreferencesRepository, DEFAULT_PREFERENCES } from '@/lib/persistence/player-preferences';
import { STORAGE_KEYS, STORAGE_EVENTS, safeWriteJson, isBrowser } from '@/lib/persistence/storage';
import { MovieCardModel, PlaybackProgress, WatchHistoryItem } from '@/types/movie';
import { PlayerPreferences } from '@/lib/persistence/player-preferences';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  enqueueMutation,
  getPendingMutationsForUser,
  dequeueMutation,
  SyncMutation,
} from './sync-queue';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

class SyncEngine {
  private currentUserId: string | null = null;
  private activeSyncUserId: string | null = null;
  private syncGeneration = 0;
  private lastFocusSyncTime = 0;

  private syncStatus: SyncStatus = 'idle';
  private dirtyProgress: Map<string, PlaybackProgress> = new Map();
  private progressFlushTimer: NodeJS.Timeout | null = null;
  private prefsDebounceTimer: NodeJS.Timeout | null = null;
  private pendingDebouncedPrefs: PlayerPreferences | null = null;

  private activeSyncPromise: Promise<void> | null = null;
  private listenersAttached = false;
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    if (isBrowser()) {
      this.attachEventListeners();
    }
  }

  private attachEventListeners() {
    if (this.listenersAttached || !isBrowser()) return;
    this.listenersAttached = true;

    window.addEventListener('online', () => {
      if (this.currentUserId) {
        this.triggerSync();
      }
    });

    window.addEventListener('focus', () => {
      if (this.currentUserId) {
        const now = Date.now();
        const cooldown = 45000; // 45 seconds focus cooldown
        const pendingCount = getPendingMutationsForUser(this.currentUserId).length;
        const needsSync =
          this.syncStatus === 'error' ||
          pendingCount > 0 ||
          this.dirtyProgress.size > 0 ||
          now - this.lastFocusSyncTime >= cooldown;

        if (needsSync) {
          this.lastFocusSyncTime = now;
          this.triggerSync();
        }
      }
    });
  }

  public subscribeStatus(listener: (status: SyncStatus) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((l) => l(status));
  }

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  private isStale(userId: string, gen: number): boolean {
    return this.currentUserId !== userId || this.syncGeneration !== gen;
  }

  public async handleAuthChange(userId: string | null) {
    if (!isBrowser()) return;

    this.syncGeneration++;
    const currentGen = this.syncGeneration;

    if (!userId) {
      // Guest mode / user logged out
      this.currentUserId = null;
      this.activeSyncUserId = null;
      this.setStatus('idle');
      this.stopProgressFlushTimer();
      this.dirtyProgress.clear();
      // INVARIANT: DO NOT DELETE LOCAL STORAGE REPOSITORIES!
      // Guest local data MUST remain preserved in localStorage.
      return;
    }

    // User logged in / restored
    this.currentUserId = userId;
    this.activeSyncUserId = userId;
    this.startProgressFlushTimer();

    await this.triggerSync(userId, currentGen);
  }

  public async triggerSync(userId?: string, gen?: number): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      this.setStatus('idle');
      return;
    }

    const targetGen = gen !== undefined ? gen : this.syncGeneration;

    if (this.activeSyncPromise && this.activeSyncUserId === targetUserId) {
      return this.activeSyncPromise;
    }

    this.activeSyncUserId = targetUserId;
    this.activeSyncPromise = this.executeSync(targetUserId, targetGen).finally(() => {
      if (this.activeSyncUserId === targetUserId) {
        this.activeSyncPromise = null;
      }
    });

    return this.activeSyncPromise;
  }

  private async executeSync(userId: string, gen: number): Promise<void> {
    if (!isBrowser()) return;

    if (!navigator.onLine) {
      this.setStatus('error');
      return;
    }

    this.setStatus('syncing');

    try {
      const meta = getSyncMeta();
      const isUserSwitch = meta.lastSyncedUserId !== null && meta.lastSyncedUserId !== userId;
      const isFirstGuestLogin = meta.lastSyncedUserId === null;

      if (isUserSwitch) {
        // User A -> User B: Clear User A's local state from storage for User B
        this.clearLocalStorageRepositories();
        // INVARIANT: Do NOT clear User A's queue! User A's queue remains stored under ownerUserId = A.
      }

      // 1. Flush any dirty progress into queue as pending mutations
      this.flushDirtyProgressToQueue(userId);

      // 2. Flush queue for current user with bounded retry
      await this.flushQueueWithRetry(userId, gen);

      if (this.isStale(userId, gen)) return;

      // 3. Fetch remote cloud state in parallel
      const [cloudWatchlist, cloudHistory, cloudProgress, cloudPrefs] = await Promise.all([
        watchlistGateway.list(userId),
        historyGateway.list(userId),
        progressGateway.list(userId),
        preferencesGateway.get(userId),
      ]);

      if (this.isStale(userId, gen)) return;

      if (isUserSwitch) {
        // Hydrate User B cloud state directly into local storage
        safeWriteJson(STORAGE_KEYS.watchlist, cloudWatchlist, STORAGE_EVENTS.watchlist);
        safeWriteJson(STORAGE_KEYS.history, cloudHistory, STORAGE_EVENTS.history);
        safeWriteJson(STORAGE_KEYS.progress, cloudProgress, STORAGE_EVENTS.progress);

        const prefsToSave = cloudPrefs || DEFAULT_PREFERENCES;
        safeWriteJson(STORAGE_KEYS.preferences, prefsToSave, STORAGE_EVENTS.preferences);
      } else if (isFirstGuestLogin) {
        // Guest -> First user login: Union merge guest items and enqueue local items for upload
        const localWatchlist = watchlistRepository.getAll();
        const localHistory = watchHistoryRepository.getAll();
        const localProgress = playbackProgressRepository.getAll();
        const localPrefs = playerPreferencesRepository.get();

        const mergedWatchlist = mergeWatchlist(localWatchlist, cloudWatchlist);
        const mergedHistory = mergeHistory(localHistory, cloudHistory);
        const mergedProgress = mergeProgress(localProgress, cloudProgress);
        const mergedPrefs = mergePreferences(localPrefs, cloudPrefs);

        safeWriteJson(STORAGE_KEYS.watchlist, mergedWatchlist, STORAGE_EVENTS.watchlist);
        safeWriteJson(STORAGE_KEYS.history, mergedHistory, STORAGE_EVENTS.history);
        safeWriteJson(STORAGE_KEYS.progress, mergedProgress, STORAGE_EVENTS.progress);
        safeWriteJson(STORAGE_KEYS.preferences, mergedPrefs, STORAGE_EVENTS.preferences);

        // Upload guest items
        for (const item of localWatchlist) {
          enqueueMutation({
            ownerUserId: userId,
            domain: 'watchlist',
            action: 'upsert',
            movieSlug: item.slug,
            payload: item,
          });
        }
        for (const item of localHistory) {
          enqueueMutation({
            ownerUserId: userId,
            domain: 'history',
            action: 'upsert',
            movieSlug: item.slug,
            payload: item,
          });
        }
        for (const item of localProgress) {
          enqueueMutation({
            ownerUserId: userId,
            domain: 'progress',
            action: 'upsert',
            movieSlug: item.movieSlug,
            episodeSlug: item.episodeSlug,
            payload: item,
          });
        }
        enqueueMutation({
          ownerUserId: userId,
          domain: 'preferences',
          action: 'upsert',
          payload: mergedPrefs,
        });

        await this.flushQueueWithRetry(userId, gen);
      } else {
        // Same-user reconciliation: Apply current-user pending mutations OVER cloud snapshot
        const pendingMutations = getPendingMutationsForUser(userId);

        // Watchlist Reconciliation
        let reconciledWatchlist: MovieCardModel[];
        const hasWatchlistClear = pendingMutations.some((m) => m.domain === 'watchlist' && m.action === 'clear');
        if (hasWatchlistClear) {
          reconciledWatchlist = [];
        } else {
          const removedSlugs = new Set(
            pendingMutations
              .filter((m) => m.domain === 'watchlist' && m.action === 'remove' && m.movieSlug)
              .map((m) => m.movieSlug!)
          );
          reconciledWatchlist = cloudWatchlist.filter((item) => !removedSlugs.has(item.slug));
        }
        const pendingWatchlistUpserts = pendingMutations.filter(
          (m) => m.domain === 'watchlist' && m.action === 'upsert' && m.payload
        );
        for (const m of pendingWatchlistUpserts) {
          if (!reconciledWatchlist.some((item) => item.slug === m.movieSlug)) {
            reconciledWatchlist.push(m.payload);
          }
        }

        // History Reconciliation
        let reconciledHistory: WatchHistoryItem[];
        const hasHistoryClear = pendingMutations.some((m) => m.domain === 'history' && m.action === 'clear');
        if (hasHistoryClear) {
          reconciledHistory = [];
        } else {
          const removedSlugs = new Set(
            pendingMutations
              .filter((m) => m.domain === 'history' && m.action === 'remove' && m.movieSlug)
              .map((m) => m.movieSlug!)
          );
          reconciledHistory = cloudHistory.filter((item) => !removedSlugs.has(item.slug));
        }
        const pendingHistoryUpserts = pendingMutations.filter(
          (m) => m.domain === 'history' && m.action === 'upsert' && m.payload
        );
        for (const m of pendingHistoryUpserts) {
          if (!reconciledHistory.some((item) => item.slug === m.movieSlug)) {
            reconciledHistory.push(m.payload);
          }
        }

        // Progress Reconciliation
        let reconciledProgress: PlaybackProgress[];
        const hasProgressClear = pendingMutations.some((m) => m.domain === 'progress' && m.action === 'clear');
        if (hasProgressClear) {
          reconciledProgress = [];
        } else {
          const removedKeys = new Set(
            pendingMutations
              .filter((m) => m.domain === 'progress' && m.action === 'remove' && m.key)
              .map((m) => m.key!)
          );
          reconciledProgress = cloudProgress.filter(
            (item) => !removedKeys.has(`${item.movieSlug}:${item.episodeSlug}`) && !removedKeys.has(item.movieSlug)
          );
        }
        const pendingProgressUpserts = pendingMutations.filter(
          (m) => m.domain === 'progress' && m.action === 'upsert' && m.payload
        );
        for (const m of pendingProgressUpserts) {
          const key = `${m.payload.movieSlug}:${m.payload.episodeSlug}`;
          const idx = reconciledProgress.findIndex((item) => `${item.movieSlug}:${item.episodeSlug}` === key);
          if (idx >= 0) {
            reconciledProgress[idx] = m.payload;
          } else {
            reconciledProgress.push(m.payload);
          }
        }

        // Preferences Reconciliation
        const localPrefs = playerPreferencesRepository.get();
        const mergedPrefs = mergePreferences(localPrefs, cloudPrefs);

        if (this.isStale(userId, gen)) return;

        safeWriteJson(STORAGE_KEYS.watchlist, reconciledWatchlist, STORAGE_EVENTS.watchlist);
        safeWriteJson(STORAGE_KEYS.history, reconciledHistory, STORAGE_EVENTS.history);
        safeWriteJson(STORAGE_KEYS.progress, reconciledProgress, STORAGE_EVENTS.progress);
        safeWriteJson(STORAGE_KEYS.preferences, mergedPrefs, STORAGE_EVENTS.preferences);
      }

      if (this.isStale(userId, gen)) return;

      this.ensureProfileUpsert(userId);
      updateSyncMeta(userId);

      // INVARIANT: Only set status 'synced' if queue is completely empty
      const remainingQueue = getPendingMutationsForUser(userId);
      if (remainingQueue.length > 0 || this.dirtyProgress.size > 0) {
        this.setStatus('error');
      } else {
        this.setStatus('synced');
      }
    } catch (err) {
      console.warn('[SyncEngine] Sync error:', err);
      this.setStatus('error');
    }
  }

  private async flushQueueWithRetry(userId: string, gen: number): Promise<void> {
    const queue = getPendingMutationsForUser(userId);
    if (queue.length === 0) return;

    for (const mutation of queue) {
      if (this.isStale(userId, gen)) return;

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        if (this.isStale(userId, gen)) return;
        attempts++;
        try {
          await this.processMutation(userId, mutation);
          dequeueMutation(mutation.id);
          success = true;
        } catch (err) {
          console.warn(`[SyncEngine] Mutation ${mutation.id} attempt ${attempts} failed:`, err);
          if (attempts >= maxAttempts) {
            throw err;
          }
          const backoffMs = attempts === 1 ? 1000 : 3000;
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }
  }

  private async processMutation(userId: string, mutation: SyncMutation): Promise<void> {
    switch (mutation.domain) {
      case 'watchlist':
        if (mutation.action === 'upsert' && mutation.payload) {
          await watchlistGateway.upsert(userId, mutation.payload);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await watchlistGateway.remove(userId, mutation.movieSlug);
        } else if (mutation.action === 'clear') {
          await watchlistGateway.clear(userId);
        }
        break;

      case 'history':
        if (mutation.action === 'upsert' && mutation.payload) {
          await historyGateway.upsert(userId, mutation.payload);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await historyGateway.remove(userId, mutation.movieSlug);
        } else if (mutation.action === 'clear') {
          await historyGateway.clear(userId);
        }
        break;

      case 'progress':
        if (mutation.action === 'upsert' && mutation.payload) {
          await progressGateway.upsert(userId, mutation.payload);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await progressGateway.remove(userId, mutation.movieSlug, mutation.episodeSlug);
        } else if (mutation.action === 'clear') {
          await progressGateway.clear(userId);
        }
        break;

      case 'preferences':
        if (mutation.action === 'upsert' && mutation.payload) {
          await preferencesGateway.upsert(userId, mutation.payload);
        }
        break;
    }
  }

  private clearLocalStorageRepositories() {
    safeWriteJson(STORAGE_KEYS.watchlist, [], STORAGE_EVENTS.watchlist);
    safeWriteJson(STORAGE_KEYS.history, [], STORAGE_EVENTS.history);
    safeWriteJson(STORAGE_KEYS.progress, [], STORAGE_EVENTS.progress);
    safeWriteJson(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES, STORAGE_EVENTS.preferences);
  }

  private async ensureProfileUpsert(userId: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      await supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Non-fatal
    }
  }

  // --- LOCAL ACTION HOOKS ---

  public onWatchlistAdd(item: MovieCardModel) {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'upsert',
      movieSlug: item.slug,
      payload: item,
    });
    this.triggerSync();
  }

  public onWatchlistRemove(movieSlug: string) {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'remove',
      movieSlug,
    });
    this.triggerSync();
  }

  public onWatchlistClear() {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'clear',
    });
    this.triggerSync();
  }

  public onHistorySave(item: WatchHistoryItem) {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'upsert',
      movieSlug: item.slug,
      payload: item,
    });
    this.triggerSync();
  }

  public onHistoryRemove(movieSlug: string) {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'remove',
      movieSlug,
    });
    this.triggerSync();
  }

  public onHistoryClear() {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'clear',
    });
    this.triggerSync();
  }

  public onProgressSave(item: PlaybackProgress, immediate = false) {
    if (!this.currentUserId) return;
    const key = `${item.movieSlug}:${item.episodeSlug}`;
    this.dirtyProgress.set(key, item);

    if (immediate || item.completed) {
      this.flushDirtyProgress();
    }
  }

  public onProgressRemove(movieSlug: string, episodeSlug?: string) {
    if (!this.currentUserId) return;
    const key = episodeSlug ? `${movieSlug}:${episodeSlug}` : movieSlug;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'progress',
      action: 'remove',
      movieSlug,
      episodeSlug,
      key,
    });
    this.triggerSync();
  }

  public onProgressClear() {
    if (!this.currentUserId) return;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'progress',
      action: 'clear',
    });
    this.triggerSync();
  }

  public onPreferencesSave(prefs: PlayerPreferences) {
    if (!this.currentUserId) return;

    this.pendingDebouncedPrefs = prefs;
    if (this.prefsDebounceTimer) {
      clearTimeout(this.prefsDebounceTimer);
    }

    this.prefsDebounceTimer = setTimeout(() => {
      if (this.currentUserId && this.pendingDebouncedPrefs) {
        const targetPrefs = this.pendingDebouncedPrefs;
        this.pendingDebouncedPrefs = null;
        enqueueMutation({
          ownerUserId: this.currentUserId,
          domain: 'preferences',
          action: 'upsert',
          payload: targetPrefs,
        });
        this.triggerSync();
      }
    }, 500);
  }

  // --- PROGRESS FLUSHING ---

  private startProgressFlushTimer() {
    this.stopProgressFlushTimer();
    this.progressFlushTimer = setInterval(() => {
      this.flushDirtyProgress();
    }, 20000);
  }

  private stopProgressFlushTimer() {
    if (this.progressFlushTimer) {
      clearInterval(this.progressFlushTimer);
      this.progressFlushTimer = null;
    }
  }

  private flushDirtyProgressToQueue(userId: string) {
    if (this.dirtyProgress.size === 0) return;

    const items = Array.from(this.dirtyProgress.values());
    this.dirtyProgress.clear();

    for (const item of items) {
      enqueueMutation({
        ownerUserId: userId,
        domain: 'progress',
        action: 'upsert',
        movieSlug: item.movieSlug,
        episodeSlug: item.episodeSlug,
        payload: item,
      });
    }
  }

  public async flushDirtyProgress() {
    if (!this.currentUserId || this.dirtyProgress.size === 0) return;
    this.flushDirtyProgressToQueue(this.currentUserId);
    this.triggerSync();
  }
}

export const syncEngine = new SyncEngine();
