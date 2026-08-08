import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DbPlayerPreferencesRow,
  mapDbToPlayerPreferences,
  mapPlayerPreferencesToDb,
} from '@/lib/supabase/types';
import { PlayerPreferences } from '@/lib/persistence/player-preferences';
import { CloudSyncError } from './cloud-error';

export const preferencesGateway = {
  async get(userId: string): Promise<PlayerPreferences | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'preferences', 'get');
    }

    const { data, error } = await supabase
      .from('player_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[PreferencesGateway] Failed to get preferences:', error.message);
        throw new CloudSyncError(error.message, error.code, 'preferences', 'get');
      }
      return null;
    }

    if (!data) return null;

    return mapDbToPlayerPreferences(data as DbPlayerPreferencesRow);
  },

  async upsert(userId: string, prefs: PlayerPreferences, clientUpdatedAt?: number): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new CloudSyncError('Supabase client unavailable', undefined, 'preferences', 'upsert');
    }

    const payload = mapPlayerPreferencesToDb(userId, prefs, clientUpdatedAt);
    const { error } = await supabase
      .from('player_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[PreferencesGateway] Upsert failed:', error.message);
      throw new CloudSyncError(error.message, error.code, 'preferences', 'upsert');
    }
  },
};
