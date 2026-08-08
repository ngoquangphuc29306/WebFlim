import { LocalPlaybackProgressRepository } from './local-progress.repository';
import { PlaybackProgressRepository } from './progress.repository';

export const playbackProgressRepository: PlaybackProgressRepository =
  new LocalPlaybackProgressRepository();
