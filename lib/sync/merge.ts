import { MovieCardModel, PlaybackProgress, WatchHistoryItem } from '@/types/movie';
import { PlayerPreferences } from '@/lib/persistence/player-preferences';

/**
 * Watchlist Merge: Union by movie slug.
 * When present in both local and cloud, prefer the item with richer metadata or preserve union.
 */
export function mergeWatchlist(local: MovieCardModel[], cloud: MovieCardModel[]): MovieCardModel[] {
  const map = new Map<string, MovieCardModel>();

  // Add cloud items first
  for (const item of cloud) {
    if (item.slug) {
      map.set(item.slug, item);
    }
  }

  // Merge local items
  for (const item of local) {
    if (!item.slug) continue;
    const existing = map.get(item.slug);
    if (!existing) {
      map.set(item.slug, item);
    } else {
      // Merge properties prefer richer metadata
      map.set(item.slug, {
        ...existing,
        ...item,
        posterUrl: item.posterUrl || existing.posterUrl,
        thumbUrl: item.thumbUrl || existing.thumbUrl || item.posterUrl || existing.posterUrl,
        categories: item.categories?.length ? item.categories : existing.categories,
        countries: item.countries?.length ? item.countries : existing.countries,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Watch History Merge: One row per movie slug.
 * Newer updatedAt / watchedAt timestamp wins.
 */
export function mergeHistory(local: WatchHistoryItem[], cloud: WatchHistoryItem[]): WatchHistoryItem[] {
  const map = new Map<string, WatchHistoryItem>();

  for (const item of [...cloud, ...local]) {
    if (!item.slug) continue;
    const existing = map.get(item.slug);
    if (!existing) {
      map.set(item.slug, item);
    } else {
      const existingTime = existing.updatedAt || 0;
      const itemTime = item.updatedAt || 0;
      if (itemTime > existingTime) {
        map.set(item.slug, item);
      }
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return merged.slice(0, 30); // Max 30 history items
}

/**
 * Playback Progress Merge: Unique by movieSlug + episodeSlug.
 * Newer updatedAt timestamp wins (newest timestamp wins over larger currentTime to support intentional rewatch/rewind).
 */
export function mergeProgress(local: PlaybackProgress[], cloud: PlaybackProgress[]): PlaybackProgress[] {
  const map = new Map<string, PlaybackProgress>();

  for (const item of [...cloud, ...local]) {
    if (!item.movieSlug || !item.episodeSlug) continue;
    const key = `${item.movieSlug}:${item.episodeSlug}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const existingTime = existing.updatedAt || 0;
      const itemTime = item.updatedAt || 0;
      if (itemTime >= existingTime) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Player Preferences Merge: Timestamp-based merging.
 * If cloud is newer, cloud wins. If local is newer or cloud is null, local wins.
 */
export function mergePreferences(
  local: PlayerPreferences,
  cloud: PlayerPreferences | null
): PlayerPreferences {
  if (!cloud) return local;

  const localTime = local.updatedAt || 0;
  const cloudTime = cloud.updatedAt || 0;

  if (cloudTime >= localTime) {
    return {
      volume: typeof cloud.volume === 'number' ? cloud.volume : local.volume,
      muted: typeof cloud.muted === 'boolean' ? cloud.muted : local.muted,
      playbackRate: typeof cloud.playbackRate === 'number' ? cloud.playbackRate : local.playbackRate,
      autoplayNextEpisode:
        typeof cloud.autoplayNextEpisode === 'boolean'
          ? cloud.autoplayNextEpisode
          : local.autoplayNextEpisode,
      updatedAt: cloud.updatedAt || Date.now(),
    };
  }

  return local;
}
