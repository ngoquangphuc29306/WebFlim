'use client';

import { PlaybackProgress } from '@/types/movie';
import {
  playbackProgressRepository,
  usePlaybackProgress,
  MIN_RESUME_SECONDS,
  COMPLETION_THRESHOLD,
} from '@/lib/persistence/progress';

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

export function savePlaybackProgress(item: Omit<PlaybackProgress, 'updatedAt' | 'completed'>): void {
  playbackProgressRepository.save(item);
}

export function removePlaybackProgress(movieSlug: string, episodeSlug?: string): void {
  playbackProgressRepository.remove(movieSlug, episodeSlug);
}

export function clearPlaybackProgress(): void {
  playbackProgressRepository.clear();
}
