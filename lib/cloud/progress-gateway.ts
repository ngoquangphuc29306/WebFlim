import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DbPlaybackProgressRow,
  mapDbToPlaybackProgress,
  mapPlaybackProgressToDb,
} from '@/lib/supabase/types';
import { PlaybackProgress } from '@/types/movie';
import { CloudSyncError } from './cloud-error';

export const progressGateway = {
  async list(userId: string): Promise<PlaybackProgress[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'progress', 'list');
    }

    const { data, error } = await supabase
      .from('playback_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[ProgressGateway] Failed to list items:', error.message);
      throw new CloudSyncError(error.message, error.code, 'progress', 'list');
    }

    return (data as DbPlaybackProgressRow[] || []).map(mapDbToPlaybackProgress);
  },

  async upsert(userId: string, item: PlaybackProgress): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'progress', 'upsert');
    }

    const payload = mapPlaybackProgressToDb(userId, item);
    const { error } = await supabase
      .from('playback_progress')
      .upsert(payload, { onConflict: 'user_id,movie_slug,episode_slug' });

    if (error) {
      console.warn('[ProgressGateway] Upsert failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'progress', 'upsert');
    }
  },

  async upsertBatch(userId: string, items: PlaybackProgress[]): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'progress', 'upsertBatch');
    }

    if (items.length === 0) return;

    const payloads = items.map((item) => mapPlaybackProgressToDb(userId, item));
    const { error } = await supabase
      .from('playback_progress')
      .upsert(payloads, { onConflict: 'user_id,movie_slug,episode_slug' });

    if (error) {
      console.warn('[ProgressGateway] Batch upsert failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'progress', 'upsertBatch');
    }
  },

  async remove(userId: string, movieSlug: string, episodeSlug?: string): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'progress', 'remove');
    }

    let query = supabase.from('playback_progress').delete().eq('user_id', userId).eq('movie_slug', movieSlug);
    if (episodeSlug) {
      query = query.eq('episode_slug', episodeSlug);
    }

    const { error } = await query;
    if (error) {
      console.warn('[ProgressGateway] Remove failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'progress', 'remove');
    }
  },

  async clear(userId: string): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'progress', 'clear');
    }

    const { error } = await supabase
      .from('playback_progress')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('[ProgressGateway] Clear failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'progress', 'clear');
    }
  },
};
