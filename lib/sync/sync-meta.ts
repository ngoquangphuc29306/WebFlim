import { STORAGE_KEYS, safeReadJson, safeWriteJson, isBrowser } from '@/lib/persistence/storage';

const SYNC_META_KEY = STORAGE_KEYS.syncMeta;

export interface SyncMeta {
  lastSyncedUserId: string | null;
  lastSyncAt: number | null;
}

const DEFAULT_META: SyncMeta = {
  lastSyncedUserId: null,
  lastSyncAt: null,
};

export function getSyncMeta(): SyncMeta {
  return safeReadJson<SyncMeta>(SYNC_META_KEY, DEFAULT_META);
}

export function saveSyncMeta(meta: SyncMeta): void {
  safeWriteJson(SYNC_META_KEY, meta);
}

export function updateSyncMeta(userId: string | null): void {
  if (!isBrowser()) return;
  const current = getSyncMeta();
  saveSyncMeta({
    lastSyncedUserId: userId,
    lastSyncAt: Date.now(),
  });
}
