import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DbWatchlistRow,
  mapDbToWatchlistItem,
  mapWatchlistItemToDb,
} from '@/lib/supabase/types';
import { MovieCardModel } from '@/types/movie';
import { CloudSyncError } from './cloud-error';

export const watchlistGateway = {
  async list(userId: string): Promise<MovieCardModel[]> {
    const rows = await this.listForSync(userId);
    return rows.filter((item) => item.deletedAt == null);
  },

  async listForSync(userId: string): Promise<MovieCardModel[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'watchlist', 'list');
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('client_updated_at', { ascending: false });

    if (error) {
      console.warn('[WatchlistGateway] Failed to list items:', error.message);
      throw new CloudSyncError(error.message, error.code, 'watchlist', 'list');
    }

    return (data as DbWatchlistRow[] || []).map(mapDbToWatchlistItem);
  },

  async upsert(userId: string, item: MovieCardModel, clientUpdatedAt?: number): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'watchlist', 'upsert');
    }

    const payload = mapWatchlistItemToDb(userId, item, clientUpdatedAt);
    const { error } = await supabase
      .from('watchlist')
      .upsert(payload, { onConflict: 'user_id,movie_slug' });

    if (error) {
      console.warn('[WatchlistGateway] Upsert failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'watchlist', 'upsert');
    }
  },

  async remove(userId: string, movieSlug: string, clientUpdatedAt = Date.now()): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'watchlist', 'remove');
    }

    const isoTime = new Date(clientUpdatedAt).toISOString();
    const { error } = await supabase
      .from('watchlist')
      .update({ deleted_at: isoTime, client_updated_at: isoTime })
      .eq('user_id', userId)
      .eq('movie_slug', movieSlug);

    if (error) {
      console.warn('[WatchlistGateway] Remove failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'watchlist', 'remove');
    }
  },

  async clear(userId: string, clientUpdatedAt = Date.now()): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'watchlist', 'clear');
    }

    const isoTime = new Date(clientUpdatedAt).toISOString();
    const { error } = await supabase
      .from('watchlist')
      .update({ deleted_at: isoTime, client_updated_at: isoTime })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.warn('[WatchlistGateway] Clear failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'watchlist', 'clear');
    }
  },
};
