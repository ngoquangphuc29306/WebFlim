import { STORAGE_KEYS, safeReadJson, safeWriteJson } from '@/lib/persistence/storage';

export type SyncDomain = 'watchlist' | 'history' | 'progress' | 'preferences';
export type SyncAction = 'upsert' | 'remove' | 'clear';

export interface SyncMutation {
  id: string;
  ownerUserId: string | null;
  domain: SyncDomain;
  action: SyncAction;
  key?: string;
  movieSlug?: string;
  episodeSlug?: string;
  createdAt: number;
  updatedAt: number;
  payload?: any;
}

const VALID_DOMAINS = new Set<SyncDomain>(['watchlist', 'history', 'progress', 'preferences']);
const VALID_ACTIONS = new Set<SyncAction>(['upsert', 'remove', 'clear']);

export function isValidSyncMutation(item: any): item is SyncMutation {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (!VALID_DOMAINS.has(item.domain)) return false;
  if (!VALID_ACTIONS.has(item.action)) return false;
  if (typeof item.createdAt !== 'number' || !isFinite(item.createdAt)) return false;
  if (item.updatedAt !== undefined && (typeof item.updatedAt !== 'number' || !isFinite(item.updatedAt))) return false;
  if (item.ownerUserId !== null && typeof item.ownerUserId !== 'string') return false;

  // Domain-specific validation
  if (item.domain === 'watchlist') {
    if (item.action === 'upsert') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
      if (!item.payload || typeof item.payload !== 'object' || typeof item.payload.slug !== 'string') return false;
    } else if (item.action === 'remove') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
    }
  } else if (item.domain === 'history') {
    if (item.action === 'upsert') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
      if (!item.payload || typeof item.payload !== 'object' || typeof item.payload.slug !== 'string') return false;
    } else if (item.action === 'remove') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
    }
  } else if (item.domain === 'progress') {
    if (item.action === 'upsert') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
      if (typeof item.episodeSlug !== 'string' || !item.episodeSlug) return false;
      if (!item.payload || typeof item.payload !== 'object') return false;
    } else if (item.action === 'remove') {
      if (typeof item.movieSlug !== 'string' || !item.movieSlug) return false;
    }
  } else if (item.domain === 'preferences') {
    if (item.action === 'upsert') {
      if (!item.payload || typeof item.payload !== 'object') return false;
      if (typeof item.payload.volume !== 'number' || !isFinite(item.payload.volume)) return false;
      if (typeof item.payload.playbackRate !== 'number' || !isFinite(item.payload.playbackRate)) return false;
    }
  }

  return true;
}

export function getSyncQueue(): SyncMutation[] {
  try {
    const raw = safeReadJson<unknown>(STORAGE_KEYS.syncQueue, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(isValidSyncMutation);
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncMutation[]): void {
  safeWriteJson(STORAGE_KEYS.syncQueue, queue);
}

export function enqueueMutation(
  mutation: Omit<SyncMutation, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }
): SyncMutation {
  const now = Date.now();
  const queue = getSyncQueue();

  // Coalesce logic to prevent unbounded queue growth
  let updatedQueue = [...queue];

  if (mutation.domain === 'preferences') {
    updatedQueue = updatedQueue.filter(
      (m) => !(m.ownerUserId === mutation.ownerUserId && m.domain === 'preferences')
    );
  } else if (mutation.action === 'clear') {
    updatedQueue = updatedQueue.filter(
      (m) => !(m.ownerUserId === mutation.ownerUserId && m.domain === mutation.domain)
    );
  } else if (mutation.domain === 'progress' && mutation.movieSlug && mutation.episodeSlug) {
    const itemKey = `${mutation.movieSlug}:${mutation.episodeSlug}`;
    updatedQueue = updatedQueue.filter(
      (m) => !(m.ownerUserId === mutation.ownerUserId && m.domain === 'progress' && m.key === itemKey)
    );
  } else if ((mutation.domain === 'watchlist' || mutation.domain === 'history') && mutation.movieSlug) {
    const slug = mutation.movieSlug;
    updatedQueue = updatedQueue.filter(
      (m) => !(m.ownerUserId === mutation.ownerUserId && m.domain === mutation.domain && m.movieSlug === slug)
    );
  }

  const key =
    mutation.key ||
    (mutation.movieSlug && mutation.episodeSlug
      ? `${mutation.movieSlug}:${mutation.episodeSlug}`
      : mutation.movieSlug || mutation.domain);

  const createdAt = mutation.createdAt || now;
  const updatedAt = mutation.updatedAt || now;

  const newMutation: SyncMutation = {
    ...mutation,
    id: `${mutation.domain}_${mutation.action}_${key}_${now}_${Math.random().toString(36).substring(2, 7)}`,
    key,
    createdAt,
    updatedAt,
  };

  updatedQueue.push(newMutation);
  saveSyncQueue(updatedQueue);
  return newMutation;
}

export function dequeueMutation(id: string): void {
  const queue = getSyncQueue();
  const updated = queue.filter((m) => m.id !== id);
  saveSyncQueue(updated);
}

export function clearQueueForUser(userId: string | null): void {
  const queue = getSyncQueue();
  const updated = queue.filter((m) => m.ownerUserId !== userId);
  saveSyncQueue(updated);
}

export function rebindGuestMutationsToUser(userId: string): void {
  const queue = getSyncQueue();
  let modified = false;
  const updated = queue.map((m) => {
    if (m.ownerUserId === null) {
      modified = true;
      return { ...m, ownerUserId: userId };
    }
    return m;
  });
  if (modified) {
    saveSyncQueue(updated);
  }
}

export function clearGuestMutations(): void {
  clearQueueForUser(null);
}

export function getPendingMutationsForUser(userId: string | null): SyncMutation[] {
  const queue = getSyncQueue();
  return queue.filter((m) => m.ownerUserId === userId);
}
