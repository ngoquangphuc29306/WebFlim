'use client';

import { PlaybackProgress } from '@/types/movie';
import {
  playbackProgressRepository,
  usePlaybackProgress,
  MIN_RESUME_SECONDS,
  COMPLETION_THRESHOLD,
} from '@/lib/persistence/progress';
import { syncEngine } from '@/lib/sync/sync-engine';

export { usePlaybackProgress, MIN_RESUME_SECONDS, COMPLETION_THRESHOLD };

export function getPlaybackProgressList(): PlaybackProgress[] {
  return playbackProgressRepository.getAll();
}

export function getPlaybackProgress(
  movieSlug: string,
  episodeSlug: string
): PlaybackProgress | null {
  return playbackProgressRepository.get(movieSlug, episodeSlug);
}

export function savePlaybackProgress(
  item: Omit<PlaybackProgress, 'updatedAt' | 'completed'>,
  immediate: boolean = false
): void {
  playbackProgressRepository.save(item);
  const updated = playbackProgressRepository.get(item.movieSlug, item.episodeSlug);
  if (updated) {
    syncEngine.onProgressSave(updated, immediate);
  }
}

export function removePlaybackProgress(movieSlug: string, episodeSlug?: string): void {
  playbackProgressRepository.remove(movieSlug, episodeSlug);
  syncEngine.onProgressRemove(movieSlug, episodeSlug);
}

export function clearPlaybackProgress(): void {
  playbackProgressRepository.clear();
  syncEngine.onProgressClear();
}

