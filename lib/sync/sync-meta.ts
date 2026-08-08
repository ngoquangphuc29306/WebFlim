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

