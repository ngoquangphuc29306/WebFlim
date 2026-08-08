'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { watchlistRepository } from './watchlist.service';
import { WatchlistItem } from './watchlist.types';

const EMPTY_WATCHLIST: WatchlistItem[] = [];

function subscribeWatchlist(callback: () => void) {
  return watchlistRepository.subscribe(callback);
}

function getWatchlistSnapshot(): WatchlistItem[] {
  return watchlistRepository.getAll();
}

function getServerWatchlistSnapshot(): WatchlistItem[] {
  return EMPTY_WATCHLIST;
}

export function useWatchlist() {
  const watchlist = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlistSnapshot,
    getServerWatchlistSnapshot
  );

  const isSaved = useCallback(
    (slug: string) => watchlist.some((m) => m.slug === slug),
    [watchlist]
  );

  return {
    watchlist,
    isMounted: true,
    isSaved,
  };
}
