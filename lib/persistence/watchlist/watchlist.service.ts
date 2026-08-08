import { LocalWatchlistRepository } from './local-watchlist.repository';
import { WatchlistRepository } from './watchlist.repository';

export const watchlistRepository: WatchlistRepository = new LocalWatchlistRepository();
