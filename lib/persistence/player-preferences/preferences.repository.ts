import { PlayerPreferences } from './preferences.types';

export interface PlayerPreferencesRepository {
  get(): PlayerPreferences;
  save(partial: Partial<PlayerPreferences>): PlayerPreferences;
  reset(): PlayerPreferences;
  subscribe?(callback: () => void): () => void;
}
