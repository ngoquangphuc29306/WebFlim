'use client';

import { MovieCardModel } from '@/types/movie';
import { watchlistRepository, useWatchlist } from '@/lib/persistence/watchlist';
import { toast } from '@/lib/utils/toast';
import { syncEngine } from '@/lib/sync/sync-engine';

export { useWatchlist };

export function getWatchlist(): MovieCardModel[] {
  return watchlistRepository.getAll();
}

export function isInWatchlist(slug: string): boolean {
  return watchlistRepository.has(slug);
}

export function toggleWatchlist(movie: MovieCardModel): boolean {
  const isNowSaved = watchlistRepository.toggle(movie);
  if (isNowSaved) {
    syncEngine.onWatchlistAdd(movie);
    toast.success('Đã thêm vào Yêu thích.');
  } else {
    syncEngine.onWatchlistRemove(movie.slug);
    toast.info('Đã xóa khỏi Yêu thích.');
  }
  return isNowSaved;
}


