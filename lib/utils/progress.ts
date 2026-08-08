'use client';

import { PlaybackProgress } from '@/types/movie';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vsmov_playback_progress_v1';
const EVENT_NAME = 'vsmov_progress_updated';

export const MIN_RESUME_SECONDS = 10;
export const COMPLETION_THRESHOLD = 0.95;

const EMPTY_PROGRESS_LIST: PlaybackProgress[] = [];
let cachedRawProgress: string | null = null;
let cachedParsedProgress: PlaybackProgress[] = EMPTY_PROGRESS_LIST;

export function getPlaybackProgressList(): PlaybackProgress[] {
  if (typeof window === 'undefined') return EMPTY_PROGRESS_LIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawProgress) return cachedParsedProgress;
    cachedRawProgress = raw;
    if (!raw) {
      cachedParsedProgress = EMPTY_PROGRESS_LIST;
      return EMPTY_PROGRESS_LIST;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedParsedProgress = EMPTY_PROGRESS_LIST;
      return EMPTY_PROGRESS_LIST;
    }

    // Validate each record
    const validated: PlaybackProgress[] = parsed
      .filter((item): item is PlaybackProgress => {
        return (
          Boolean(item) &&
          typeof item.movieSlug === 'string' &&
          typeof item.episodeSlug === 'string' &&
          typeof item.currentTime === 'number' &&
          typeof item.duration === 'number' &&
          isFinite(item.currentTime) &&
          isFinite(item.duration) &&
          item.currentTime >= 0 &&
          item.duration >= 0
        );
      })
      .map((item) => ({
        ...item,
        completed:
          item.completed ||
          (item.duration > 0 && item.currentTime / item.duration >= COMPLETION_THRESHOLD),
      }));

    cachedParsedProgress = validated;
    return cachedParsedProgress;
  } catch {
    return EMPTY_PROGRESS_LIST;
  }
}

export function getPlaybackProgress(
  movieSlug: string,
  episodeSlug: string
): PlaybackProgress | null {
  const list = getPlaybackProgressList();
  return list.find((p) => p.movieSlug === movieSlug && p.episodeSlug === episodeSlug) || null;
}

export function savePlaybackProgress(item: Omit<PlaybackProgress, 'updatedAt' | 'completed'>): void {
  if (typeof window === 'undefined') return;
  if (!item.movieSlug || !item.episodeSlug) return;
  if (!isFinite(item.currentTime) || !isFinite(item.duration) || item.duration <= 0) return;

  const list = getPlaybackProgressList();
  const isCompleted = item.currentTime / item.duration >= COMPLETION_THRESHOLD;

  const newItem: PlaybackProgress = {
    ...item,
    completed: isCompleted,
    updatedAt: Date.now(),
  };

  // Filter out existing record for this movieSlug + episodeSlug
  const filtered = list.filter(
    (p) => !(p.movieSlug === item.movieSlug && p.episodeSlug === item.episodeSlug)
  );

  const updated = [newItem, ...filtered].slice(0, 50); // Keep max 50 progress records

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawProgress = serialized;
    cachedParsedProgress = updated;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to save playback progress:', err);
  }
}

export function removePlaybackProgress(movieSlug: string, episodeSlug?: string): void {
  if (typeof window === 'undefined') return;
  const list = getPlaybackProgressList();

  const updated = episodeSlug
    ? list.filter((p) => !(p.movieSlug === movieSlug && p.episodeSlug === episodeSlug))
    : list.filter((p) => p.movieSlug !== movieSlug);

  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, serialized);
    cachedRawProgress = serialized;
    cachedParsedProgress = updated;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to remove playback progress:', err);
  }
}

export function clearPlaybackProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRawProgress = null;
    cachedParsedProgress = EMPTY_PROGRESS_LIST;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to clear playback progress:', err);
  }
}

function subscribeProgress(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerProgressSnapshot(): PlaybackProgress[] {
  return EMPTY_PROGRESS_LIST;
}

export function usePlaybackProgress() {
  const progressList = useSyncExternalStore(
    subscribeProgress,
    getPlaybackProgressList,
    getServerProgressSnapshot
  );

  // Return un-completed items for Continue Watching
  const continueWatching = progressList.filter(
    (p) => !p.completed && p.currentTime >= MIN_RESUME_SECONDS
  );

  return {
    progressList,
    continueWatching,
    removeProgress: removePlaybackProgress,
    clearProgress: clearPlaybackProgress,
    isMounted: true,
  };
}
