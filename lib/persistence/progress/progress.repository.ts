import { PlaybackProgress } from './progress.types';

export interface PlaybackProgressRepository {
  getAll(): PlaybackProgress[];
  getAllForSync(): PlaybackProgress[];
  get(movieSlug: string, episodeSlug: string): PlaybackProgress | null;
  save(item: Omit<PlaybackProgress, 'updatedAt' | 'completed'>): void;
  remove(movieSlug: string, episodeSlug?: string): void;
  clear(): void;
  subscribe(callback: () => void): () => void;
}
