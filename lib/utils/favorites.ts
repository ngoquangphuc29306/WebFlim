'use client';

import { MovieCardModel } from '@/types/movie';
import { watchlistRepository, useWatchlist } from '@/lib/persistence/watchlist';

export { useWatchlist };

export function getWatchlist(): MovieCardModel[] {
  return watchlistRepository.getAll();
}

export function isInWatchlist(slug: string): boolean {
  return watchlistRepository.has(slug);
}

export function toggleWatchlist(movie: MovieCardModel): boolean {
  return watchlistRepository.toggle(movie);
}
