import { STORAGE_KEYS, safeReadJson, safeWriteJson, isBrowser } from '@/lib/persistence/storage';

const SYNC_META_KEY = STORAGE_KEYS.syncMeta;

export interface SyncMeta {
  lastSyncedUserId: string | null;
  localStateOwnerUserId: string | null;
  guestMutationBaseUserId?: string | null;
  lastSyncAt: number | null;
}

const DEFAULT_META: SyncMeta = {
  lastSyncedUserId: null,
  localStateOwnerUserId: null,
  guestMutationBaseUserId: null,
  lastSyncAt: null,
};

export function getSyncMeta(): SyncMeta {
  const raw = safeReadJson<Partial<SyncMeta>>(SYNC_META_KEY, DEFAULT_META);
  if (!raw || typeof raw !== 'object') return DEFAULT_META;

  // Backward compatibility: If localStateOwnerUserId is missing, infer conservatively
  const localOwner =
    raw.localStateOwnerUserId !== undefined
      ? raw.localStateOwnerUserId
      : raw.lastSyncedUserId ?? null;

  return {
    lastSyncedUserId: raw.lastSyncedUserId ?? null,
    localStateOwnerUserId: localOwner,
    guestMutationBaseUserId: raw.guestMutationBaseUserId ?? null,
    lastSyncAt: typeof raw.lastSyncAt === 'number' ? raw.lastSyncAt : null,
  };
}

export type AuthSyncTransition =
  | 'pure-guest-to-user'
  | 'same-user'
  | 'user-to-guest'
  | 'user-to-different-user'
  | 'post-logout-guest-to-origin-user'
  | 'post-logout-guest-to-different-user';

export function determineAuthTransition(
  previousUserId: string | null,
  newUserId: string | null,
  metaBeforeAuth: SyncMeta
): AuthSyncTransition {
  if (previousUserId === newUserId) {
    return 'same-user';
  }

  if (newUserId === null) {
    return 'user-to-guest';
  }

  if (previousUserId !== null) {
    return 'user-to-different-user';
  }

  if (metaBeforeAuth.localStateOwnerUserId === null && metaBeforeAuth.guestMutationBaseUserId === null) {
    return 'pure-guest-to-user';
  }

  if (metaBeforeAuth.guestMutationBaseUserId === newUserId) {
    return 'post-logout-guest-to-origin-user';
  }

  return 'post-logout-guest-to-different-user';
}

export function saveSyncMeta(meta: SyncMeta): void {
  safeWriteJson(SYNC_META_KEY, meta);
}

export function setLocalStateOwner(
  ownerUserId: string | null,
  guestMutationBaseUserId: string | null = null
): void {
  if (!isBrowser()) return;
  const current = getSyncMeta();
  saveSyncMeta({
    ...current,
    localStateOwnerUserId: ownerUserId,
    guestMutationBaseUserId,
  });
}

export function updateSyncMeta(userId: string | null): void {
  if (!isBrowser()) return;
  const current = getSyncMeta();
  saveSyncMeta({
    ...current,
    lastSyncedUserId: userId,
    localStateOwnerUserId: userId,
    lastSyncAt: Date.now(),
  });
}

