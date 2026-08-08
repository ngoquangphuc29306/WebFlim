import { MovieCardModel, PlaybackProgress, WatchHistoryItem } from '@/types/movie';
import { PlayerPreferences } from '@/lib/persistence/player-preferences/preferences.types';

// Supabase Database Row Types (snake_case)
export interface DbProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWatchlistRow {
  id: string;
  user_id: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string | null;
  thumb_url: string | null;
  year: string | null;
  movie_type: string | null;
  episode_current: string | null;
  quality: string | null;
  categories_json: string | null;
  countries_json: string | null;
  created_at: string;
  client_updated_at: string;
  server_updated_at: string;
}

export interface DbWatchHistoryRow {
  id: string;
  user_id: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string | null;
  episode_slug: string;
  episode_name: string;
  server_index: number | null;
  server_name: string | null;
  watched_at: string;
  client_updated_at: string;
  server_updated_at: string;
}

export interface DbPlaybackProgressRow {
  id: string;
  user_id: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string | null;
  episode_slug: string;
  episode_name: string | null;
  server_index: number | null;
  server_name: string | null;
  current_time: number;
  duration: number;
  completed: boolean;
  created_at: string;
  client_updated_at: string;
  server_updated_at: string;
}

export interface DbPlayerPreferencesRow {
  user_id: string;
  volume: number;
  muted: boolean;
  playback_rate: number;
  autoplay_next_episode: boolean;
  client_updated_at: string;
  server_updated_at: string;
}

// Domain Mappers
export function mapDbToWatchlistItem(row: DbWatchlistRow): MovieCardModel {
  let categories = [];
  let countries = [];
  try {
    if (row.categories_json) categories = JSON.parse(row.categories_json);
  } catch {}
  try {
    if (row.countries_json) countries = JSON.parse(row.countries_json);
  } catch {}

  return {
    id: row.movie_slug,
    slug: row.movie_slug,
    title: row.movie_title,
    posterUrl: row.poster_url || '',
    thumbUrl: row.thumb_url || row.poster_url || '',
    year: row.year || undefined,
    type: row.movie_type || undefined,
    episodeCurrent: row.episode_current || undefined,
    quality: row.quality || undefined,
    categories,
    countries,
  };
}

export function mapWatchlistItemToDb(userId: string, item: MovieCardModel): Omit<DbWatchlistRow, 'id' | 'created_at' | 'server_updated_at'> {
  return {
    user_id: userId,
    movie_slug: item.slug,
    movie_title: item.title,
    poster_url: item.posterUrl || null,
    thumb_url: item.thumbUrl || null,
    year: item.year ? String(item.year) : null,
    movie_type: item.type || null,
    episode_current: item.episodeCurrent || null,
    quality: item.quality || null,
    categories_json: JSON.stringify(item.categories || []),
    countries_json: JSON.stringify(item.countries || []),
    client_updated_at: new Date().toISOString(),
  };
}

export function mapDbToWatchHistoryItem(row: DbWatchHistoryRow): WatchHistoryItem {
  return {
    slug: row.movie_slug,
    title: row.movie_title,
    posterUrl: row.poster_url || '',
    episodeSlug: row.episode_slug,
    episodeName: row.episode_name || '',
    serverName: row.server_name || '',
    serverIndex: row.server_index ?? undefined,
    updatedAt: new Date(row.client_updated_at || row.watched_at).getTime(),
  };
}

export function mapWatchHistoryItemToDb(userId: string, item: WatchHistoryItem): Omit<DbWatchHistoryRow, 'id' | 'created_at' | 'server_updated_at'> {
  const isoTime = new Date(item.updatedAt || Date.now()).toISOString();
  return {
    user_id: userId,
    movie_slug: item.slug,
    movie_title: item.title,
    poster_url: item.posterUrl || null,
    episode_slug: item.episodeSlug,
    episode_name: item.episodeName || '',
    server_index: item.serverIndex ?? null,
    server_name: item.serverName || null,
    watched_at: isoTime,
    client_updated_at: isoTime,
  };
}

export function mapDbToPlaybackProgress(row: DbPlaybackProgressRow): PlaybackProgress {
  return {
    movieSlug: row.movie_slug,
    movieTitle: row.movie_title,
    posterUrl: row.poster_url || undefined,
    episodeSlug: row.episode_slug,
    episodeName: row.episode_name || undefined,
    serverIndex: row.server_index ?? undefined,
    serverName: row.server_name || undefined,
    currentTime: row.current_time,
    duration: row.duration,
    completed: row.completed,
    updatedAt: new Date(row.client_updated_at).getTime(),
  };
}

export function mapPlaybackProgressToDb(userId: string, item: PlaybackProgress): Omit<DbPlaybackProgressRow, 'id' | 'created_at' | 'server_updated_at'> {
  return {
    user_id: userId,
    movie_slug: item.movieSlug,
    movie_title: item.movieTitle,
    poster_url: item.posterUrl || null,
    episode_slug: item.episodeSlug,
    episode_name: item.episodeName || null,
    server_index: item.serverIndex ?? null,
    server_name: item.serverName || null,
    current_time: item.currentTime,
    duration: item.duration,
    completed: item.completed,
    client_updated_at: new Date(item.updatedAt || Date.now()).toISOString(),
  };
}

export function mapDbToPlayerPreferences(row: DbPlayerPreferencesRow): PlayerPreferences {
  const allowedRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const rate = allowedRates.includes(row.playback_rate) ? row.playback_rate : 1;
  const volume = Math.min(1, Math.max(0, isFinite(row.volume) ? row.volume : 1));

  return {
    volume,
    muted: Boolean(row.muted),
    playbackRate: rate,
    autoplayNextEpisode: row.autoplay_next_episode !== false,
    updatedAt: row.client_updated_at ? new Date(row.client_updated_at).getTime() : undefined,
  };
}

export function mapPlayerPreferencesToDb(userId: string, prefs: PlayerPreferences): Omit<DbPlayerPreferencesRow, 'server_updated_at'> {
  return {
    user_id: userId,
    volume: prefs.volume,
    muted: prefs.muted,
    playback_rate: prefs.playbackRate,
    autoplay_next_episode: prefs.autoplayNextEpisode,
    client_updated_at: new Date(prefs.updatedAt || Date.now()).toISOString(),
  };
}
