'use client';

import { MovieCardModel } from '@/types/movie';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vsmov_watchlist_v1';
const EVENT_NAME = 'vsmov_watchlist_updated';

const EMPTY_WATCHLIST: MovieCardModel[] = [];
let cachedRawWatchlist: string | null = null;
let cachedParsedWatchlist: MovieCardModel[] = EMPTY_WATCHLIST;

export function getWatchlist(): MovieCardModel[] {
  if (typeof window === 'undefined') return EMPTY_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawWatchlist) return cachedParsedWatchlist;
    cachedRawWatchlist = raw;
    cachedParsedWatchlist = raw ? JSON.parse(raw) : EMPTY_WATCHLIST;
    return cachedParsedWatchlist;
  } catch {
    return EMPTY_WATCHLIST;
  }
}

export function isInWatchlist(slug: string): boolean {
  const list = getWatchlist();
  return list.some((item) => item.slug === slug);
}

export function toggleWatchlist(movie: MovieCardModel): boolean {
  if (typeof window === 'undefined') return false;
  const list = getWatchlist();
  const exists = list.some((item) => item.slug === movie.slug);

  let updated: MovieCardModel[];
  if (exists) {
    updated = list.filter((item) => item.slug !== movie.slug);
  } else {
    updated = [movie, ...list.filter((item) => item.slug !== movie.slug)];
  }

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawWatchlist = serialized;
    cachedParsedWatchlist = updated;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to save watchlist:', err);
  }

  return !exists;
}

function subscribeWatchlist(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerWatchlistSnapshot(): MovieCardModel[] {
  return EMPTY_WATCHLIST;
}

export function useWatchlist() {
  const watchlist = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlist,
    getServerWatchlistSnapshot
  );

  return {
    watchlist,
    isMounted: true,
    isSaved: (slug: string) => watchlist.some((m) => m.slug === slug),
  };
}
