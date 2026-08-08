import { LocalWatchHistoryRepository } from './local-history.repository';
import { WatchHistoryRepository } from './history.repository';

export const watchHistoryRepository: WatchHistoryRepository = new LocalWatchHistoryRepository();
