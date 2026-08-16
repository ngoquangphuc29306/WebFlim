import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DbWatchHistoryRow,
  mapDbToWatchHistoryItem,
  mapWatchHistoryItemToDb,
} from '@/lib/supabase/types';
import { WatchHistoryItem } from '@/types/movie';
import { CloudSyncError } from './cloud-error';

export const historyGateway = {
  async list(userId: string): Promise<WatchHistoryItem[]> {
    const rows = await this.listForSync(userId);
    return rows.filter((item) => item.deletedAt == null);
  },

  async listForSync(userId: string): Promise<WatchHistoryItem[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'history', 'list');
    }

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('client_updated_at', { ascending: false });

    if (error) {
      console.warn('[HistoryGateway] Failed to list items:', error.message);
      throw new CloudSyncError(error.message, error.code, 'history', 'list');
    }

    return (data as DbWatchHistoryRow[] || []).map(mapDbToWatchHistoryItem);
  },

  async upsert(userId: string, item: WatchHistoryItem, clientUpdatedAt?: number): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'history', 'upsert');
    }

    const payload = mapWatchHistoryItemToDb(userId, item, clientUpdatedAt);
    const { error } = await supabase
      .from('watch_history')
      .upsert(payload, { onConflict: 'user_id,movie_slug' });

    if (error) {
      console.warn('[HistoryGateway] Upsert failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'history', 'upsert');
    }
  },

  async remove(userId: string, movieSlug: string, clientUpdatedAt = Date.now()): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'history', 'remove');
    }

    const isoTime = new Date(clientUpdatedAt).toISOString();
    const { error } = await supabase
      .from('watch_history')
      .update({ deleted_at: isoTime, client_updated_at: isoTime, watched_at: isoTime })
      .eq('user_id', userId)
      .eq('movie_slug', movieSlug);

    if (error) {
      console.warn('[HistoryGateway] Remove failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'history', 'remove');
    }
  },

  async clear(userId: string, clientUpdatedAt = Date.now()): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'history', 'clear');
    }

    const isoTime = new Date(clientUpdatedAt).toISOString();
    const { error } = await supabase
      .from('watch_history')
      .update({ deleted_at: isoTime, client_updated_at: isoTime, watched_at: isoTime })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.warn('[HistoryGateway] Clear failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'history', 'clear');
    }
  },
};
