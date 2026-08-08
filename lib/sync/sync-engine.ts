import { watchlistGateway } from '@/lib/cloud/watchlist-gateway';
import { historyGateway } from '@/lib/cloud/history-gateway';
import { progressGateway } from '@/lib/cloud/progress-gateway';
import { preferencesGateway } from '@/lib/cloud/preferences-gateway';
import {
  getSyncMeta,
  updateSyncMeta,
  setLocalStateOwner,
  determineAuthTransition,
  AuthSyncTransition,
} from './sync-meta';
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
  rebindGuestMutationsToUser,
  SyncMutation,
} from './sync-queue';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface DirtyProgressEntry {
  ownerUserId: string | null;
  progress: PlaybackProgress;
}

interface PendingDebouncedPrefs {
  ownerUserId: string | null;
  prefs: PlayerPreferences;
  generation: number;
}

class SyncEngine {
  private currentUserId: string | null = null;
  private activeSyncUserId: string | null = null;
  private syncGeneration = 0;
  private lastFocusSyncTime = 0;
  private hasHydratedCurrentUser = false;

  private syncStatus: SyncStatus = 'idle';
  private dirtyProgress: Map<string, DirtyProgressEntry> = new Map();
  private progressFlushTimer: NodeJS.Timeout | null = null;

  private prefsDebounceTimer: NodeJS.Timeout | null = null;
  private pendingDebouncedPrefs: PendingDebouncedPrefs | null = null;

  private activeSyncPromise: Promise<void> | null = null;
  private pendingFollowUpSyncUserId: string | null = null;
  private syncRequestedWhileActive = false;

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
          this.syncStatus === 'offline' ||
          pendingCount > 0 ||
          this.getDirtyProgressCountForUser(this.currentUserId) > 0 ||
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

    const previousUserId = this.currentUserId;
    const metaBeforeAuth = getSyncMeta();
    const transition = determineAuthTransition(previousUserId, userId, metaBeforeAuth);

    // Same-user auth events (e.g. TOKEN_REFRESHED)
    if (transition === 'same-user') {
      if (userId) {
        this.startProgressFlushTimer();
        const pending = getPendingMutationsForUser(userId).length;
        const dirty = this.getDirtyProgressCountForUser(userId);
        if (!this.hasHydratedCurrentUser || pending > 0 || dirty > 0 || this.syncStatus === 'error' || this.syncStatus === 'offline') {
          this.triggerSync(userId, undefined, transition);
        }
      }
      return;
    }

    // Identity CHANGED (null -> A, A -> B, A -> null)
    this.syncGeneration++;
    const currentGen = this.syncGeneration;
    this.hasHydratedCurrentUser = false;

    // Flush pending debounced preferences for previous user if any
    if (this.pendingDebouncedPrefs && this.pendingDebouncedPrefs.ownerUserId === previousUserId) {
      enqueueMutation({
        ownerUserId: previousUserId,
        domain: 'preferences',
        action: 'upsert',
        payload: this.pendingDebouncedPrefs.prefs,
        updatedAt: this.pendingDebouncedPrefs.prefs.updatedAt,
      });
      this.pendingDebouncedPrefs = null;
      if (this.prefsDebounceTimer) {
        clearTimeout(this.prefsDebounceTimer);
        this.prefsDebounceTimer = null;
      }
    }

    // Persist dirty progress for previous user before identity change
    this.flushDirtyProgressToQueue(previousUserId);
    this.dirtyProgress.clear();

    if (transition === 'user-to-guest') {
      setLocalStateOwner(null, previousUserId);
      this.currentUserId = null;
      this.setStatus('idle');
      this.stopProgressFlushTimer();
      return;
    }

    if (transition === 'pure-guest-to-user' || transition === 'post-logout-guest-to-origin-user') {
      rebindGuestMutationsToUser(userId!);
      setLocalStateOwner(userId, null);
      this.currentUserId = userId;
      this.startProgressFlushTimer();
      await this.triggerSync(userId!, currentGen, transition);
      return;
    }

    if (transition === 'post-logout-guest-to-different-user') {
      const baseUser = metaBeforeAuth.guestMutationBaseUserId;
      if (baseUser) {
        rebindGuestMutationsToUser(baseUser);
      }
      this.clearLocalStorageRepositories();
      setLocalStateOwner(userId, null);
      this.currentUserId = userId;
      this.startProgressFlushTimer();
      await this.triggerSync(userId!, currentGen, transition);
      return;
    }

    if (transition === 'user-to-different-user') {
      // Direct User A -> User B account switch
      this.clearLocalStorageRepositories();
      setLocalStateOwner(userId, null);
      this.currentUserId = userId;
      this.startProgressFlushTimer();
      await this.triggerSync(userId!, currentGen, transition);
      return;
    }
  }

  public async triggerSync(userId?: string, gen?: number, transition?: AuthSyncTransition): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      this.setStatus('idle');
      return;
    }

    const targetGen = gen !== undefined ? gen : this.syncGeneration;

    if (this.activeSyncPromise) {
      if (this.activeSyncUserId === targetUserId) {
        // Active sync running for THIS exact user! Record mid-sync mutation follow-up request.
        this.syncRequestedWhileActive = true;
        return this.activeSyncPromise;
      } else {
        // Active sync running for a DIFFERENT user! Wait for active promise to finish then run for targetUserId.
        this.pendingFollowUpSyncUserId = targetUserId;
        return this.activeSyncPromise.then(() => {
          if (this.currentUserId === targetUserId) {
            return this.triggerSync(targetUserId);
          }
        });
      }
    }

    // Launch new execution for targetUserId
    this.activeSyncUserId = targetUserId;
    const promise = this.executeSync(targetUserId, targetGen, transition).finally(() => {
      if (this.activeSyncPromise === promise) {
        this.activeSyncPromise = null;
        this.activeSyncUserId = null;
      }

      // Check if follow-up sync is needed
      if (this.pendingFollowUpSyncUserId) {
        const followUpUser = this.pendingFollowUpSyncUserId;
        this.pendingFollowUpSyncUserId = null;
        if (this.currentUserId === followUpUser) {
          this.triggerSync(followUpUser);
        }
      } else if (this.syncRequestedWhileActive && this.currentUserId === targetUserId) {
        this.syncRequestedWhileActive = false;
        const remainingQueue = getPendingMutationsForUser(targetUserId);
        if (remainingQueue.length > 0 || this.getDirtyProgressCountForUser(targetUserId) > 0) {
          this.triggerSync(targetUserId);
        }
      }
    });

    this.activeSyncPromise = promise;
    return promise;
  }

  private async executeSync(userId: string, gen: number, transition?: AuthSyncTransition): Promise<void> {
    if (!isBrowser()) return;

    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    this.setStatus('syncing');

    try {
      const isUserSwitch = transition === 'user-to-different-user' || transition === 'post-logout-guest-to-different-user';
      const isPureGuestAdoption = transition === 'pure-guest-to-user';

      if (isUserSwitch) {
        // Clear User A's or guest local state from storage for User B
        this.clearLocalStorageRepositories();
      }

      // 1. Flush any dirty progress for this user into queue as pending mutations
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
      } else if (isPureGuestAdoption) {
        // Pure Guest -> First user login: Union merge legacy local guest items (even if queue was empty)
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

        // Upload guest items to cloud for user
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
            updatedAt: item.updatedAt,
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
            updatedAt: item.updatedAt,
          });
        }
        enqueueMutation({
          ownerUserId: userId,
          domain: 'preferences',
          action: 'upsert',
          payload: mergedPrefs,
          updatedAt: mergedPrefs.updatedAt,
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
      this.hasHydratedCurrentUser = true;

      // INVARIANT: Only set status 'synced' if queue is completely empty
      const remainingQueue = getPendingMutationsForUser(userId);
      if (remainingQueue.length > 0 || this.getDirtyProgressCountForUser(userId) > 0) {
        this.setStatus('error');
      } else {
        this.setStatus('synced');
      }
    } catch (err) {
      if (this.isStale(userId, gen)) return;
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
          await watchlistGateway.upsert(userId, mutation.payload, mutation.updatedAt);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await watchlistGateway.remove(userId, mutation.movieSlug);
        } else if (mutation.action === 'clear') {
          await watchlistGateway.clear(userId);
        }
        break;

      case 'history':
        if (mutation.action === 'upsert' && mutation.payload) {
          await historyGateway.upsert(userId, mutation.payload, mutation.updatedAt);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await historyGateway.remove(userId, mutation.movieSlug);
        } else if (mutation.action === 'clear') {
          await historyGateway.clear(userId);
        }
        break;

      case 'progress':
        if (mutation.action === 'upsert' && mutation.payload) {
          await progressGateway.upsert(userId, mutation.payload, mutation.updatedAt);
        } else if (mutation.action === 'remove' && mutation.movieSlug) {
          await progressGateway.remove(userId, mutation.movieSlug, mutation.episodeSlug);
        } else if (mutation.action === 'clear') {
          await progressGateway.clear(userId);
        }
        break;

      case 'preferences':
        if (mutation.action === 'upsert' && mutation.payload) {
          await preferencesGateway.upsert(userId, mutation.payload, mutation.updatedAt);
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
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'upsert',
      movieSlug: item.slug,
      payload: item,
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onWatchlistRemove(movieSlug: string) {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'remove',
      movieSlug,
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onWatchlistClear() {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'watchlist',
      action: 'clear',
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onHistorySave(item: WatchHistoryItem) {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'upsert',
      movieSlug: item.slug,
      payload: item,
      updatedAt: item.updatedAt,
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onHistoryRemove(movieSlug: string) {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'remove',
      movieSlug,
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onHistoryClear() {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'history',
      action: 'clear',
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onProgressSave(item: PlaybackProgress, immediate = false) {
    const key = `${item.movieSlug}:${item.episodeSlug}`;
    this.dirtyProgress.set(key, { ownerUserId: this.currentUserId, progress: item });

    if (immediate || item.completed) {
      this.flushDirtyProgress();
    }
  }

  public onProgressRemove(movieSlug: string, episodeSlug?: string) {
    const key = episodeSlug ? `${movieSlug}:${episodeSlug}` : movieSlug;
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'progress',
      action: 'remove',
      movieSlug,
      episodeSlug,
      key,
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onProgressClear() {
    enqueueMutation({
      ownerUserId: this.currentUserId,
      domain: 'progress',
      action: 'clear',
    });
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  public onPreferencesSave(prefs: PlayerPreferences) {
    const ownerUserId = this.currentUserId;
    const capturedGen = this.syncGeneration;
    this.pendingDebouncedPrefs = { ownerUserId, prefs, generation: capturedGen };

    if (this.prefsDebounceTimer) {
      clearTimeout(this.prefsDebounceTimer);
    }

    this.prefsDebounceTimer = setTimeout(() => {
      if (
        this.pendingDebouncedPrefs &&
        this.pendingDebouncedPrefs.ownerUserId === ownerUserId &&
        this.syncGeneration === capturedGen
      ) {
        const targetPrefs = this.pendingDebouncedPrefs.prefs;
        this.pendingDebouncedPrefs = null;
        enqueueMutation({
          ownerUserId,
          domain: 'preferences',
          action: 'upsert',
          payload: targetPrefs,
          updatedAt: targetPrefs.updatedAt,
        });
        if (ownerUserId) {
          this.triggerSync(ownerUserId);
        }
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

  private flushDirtyProgressToQueue(userId: string | null) {
    if (this.dirtyProgress.size === 0) return;

    const keysToDelete: string[] = [];
    for (const [key, entry] of this.dirtyProgress.entries()) {
      if (entry.ownerUserId === userId) {
        enqueueMutation({
          ownerUserId: userId,
          domain: 'progress',
          action: 'upsert',
          movieSlug: entry.progress.movieSlug,
          episodeSlug: entry.progress.episodeSlug,
          payload: entry.progress,
          updatedAt: entry.progress.updatedAt,
        });
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => this.dirtyProgress.delete(k));
  }

  public async flushDirtyProgress() {
    this.flushDirtyProgressToQueue(this.currentUserId);
    if (this.currentUserId) {
      this.triggerSync();
    }
  }

  private getDirtyProgressCountForUser(userId: string | null): number {
    let count = 0;
    for (const entry of this.dirtyProgress.values()) {
      if (entry.ownerUserId === userId) count++;
    }
    return count;
  }
}

export const syncEngine = new SyncEngine();
