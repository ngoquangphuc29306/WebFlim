'use client';

import { MovieCardModel } from '@/types/movie';
import { watchlistRepository, useWatchlist } from '@/lib/persistence/watchlist';
import { toast } from '@/lib/utils/toast';

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
    toast.success('Đã thêm vào Yêu thích.');
  } else {
    toast.info('Đã xóa khỏi Yêu thích.');
  }
  return isNowSaved;
}

