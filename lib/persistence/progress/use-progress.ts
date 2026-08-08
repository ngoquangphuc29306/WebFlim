'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { playbackProgressRepository } from './progress.service';
import { PlaybackProgress, MIN_RESUME_SECONDS } from './progress.types';
import { syncEngine } from '@/lib/sync/sync-engine';

const EMPTY_PROGRESS_LIST: PlaybackProgress[] = [];

function subscribeProgress(callback: () => void) {
  return playbackProgressRepository.subscribe(callback);
}

function getProgressSnapshot(): PlaybackProgress[] {
  return playbackProgressRepository.getAll();
}

function getServerProgressSnapshot(): PlaybackProgress[] {
  return EMPTY_PROGRESS_LIST;
}

export function usePlaybackProgress() {
  const progressList = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getServerProgressSnapshot
  );

  const continueWatching = progressList.filter(
    (p) => !p.completed && p.currentTime >= MIN_RESUME_SECONDS
  );

  const removeProgress = useCallback((movieSlug: string, episodeSlug?: string) => {
    playbackProgressRepository.remove(movieSlug, episodeSlug);
    syncEngine.onProgressRemove(movieSlug, episodeSlug);
  }, []);

  const clearProgress = useCallback(() => {
    playbackProgressRepository.clear();
    syncEngine.onProgressClear();
  }, []);

  return {
    progressList,
    continueWatching,
    removeProgress,
    clearProgress,
    isMounted: true,
  };
}
