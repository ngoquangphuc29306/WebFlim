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
  if (typeof item.createdAt !== 'number') return false;
  if (item.ownerUserId !== null && typeof item.ownerUserId !== 'string') return false;
  return true;
}

export function getSyncQueue(): SyncMutation[] {
  const raw = safeReadJson<unknown>(STORAGE_KEYS.syncQueue, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidSyncMutation);
}

export function saveSyncQueue(queue: SyncMutation[]): void {
  safeWriteJson(STORAGE_KEYS.syncQueue, queue);
}

export function enqueueMutation(
  mutation: Omit<SyncMutation, 'id' | 'createdAt' | 'updatedAt'>
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

  const newMutation: SyncMutation = {
    ...mutation,
    id: `${mutation.domain}_${mutation.action}_${key}_${now}_${Math.random().toString(36).substring(2, 7)}`,
    key,
    createdAt: now,
    updatedAt: now,
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

export function getPendingMutationsForUser(userId: string | null): SyncMutation[] {
  const queue = getSyncQueue();
  return queue.filter((m) => m.ownerUserId === userId);
}
