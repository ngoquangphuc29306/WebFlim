import { LocalPlayerPreferencesRepository } from './local-preferences.repository';
import { PlayerPreferencesRepository } from './preferences.repository';

export const playerPreferencesRepository: PlayerPreferencesRepository =
  new LocalPlayerPreferencesRepository();
