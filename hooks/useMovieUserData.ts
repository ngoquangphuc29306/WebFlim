'use client';

import { useMemo } from 'react';
import { useWatchlist } from '@/lib/persistence/watchlist';
import { usePlaybackProgress, MIN_RESUME_SECONDS } from '@/lib/persistence/progress';
import { PlaybackProgress } from '@/types/movie';

export function useMovieUserData() {
  const { watchlist, isMounted: isWatchlistMounted } = useWatchlist();
  const { progressList, isMounted: isProgressMounted } = usePlaybackProgress();

  // O(1) lookup Set for saved movie slugs
  const savedSlugSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < watchlist.length; i++) {
      set.add(watchlist[i].slug);
    }
    return set;
  }, [watchlist]);

  // O(1) lookup Map for playback progress percent by movie slug (O(P) single pass)
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    const latestRecordMap = new Map<string, PlaybackProgress>();

    // Single-pass O(P) tracking of latest record per movie slug
    for (let i = 0; i < progressList.length; i++) {
      const p = progressList[i];
      if (!p.completed && p.currentTime >= MIN_RESUME_SECONDS && p.duration > 0) {
        const existing = latestRecordMap.get(p.movieSlug);
        if (!existing || p.updatedAt > existing.updatedAt) {
          latestRecordMap.set(p.movieSlug, p);
        }
      }
    }

    // Compute progress percentage for winning records
    for (const [slug, p] of latestRecordMap.entries()) {
      const percent = Math.min(100, Math.max(0, Math.round((p.currentTime / p.duration) * 100)));
      map.set(slug, percent);
    }

    return map;
  }, [progressList]);

  return {
    savedSlugSet,
    progressMap,
    isMounted: isWatchlistMounted && isProgressMounted,
  };
}
