export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbSeasonSummary {
  id: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  posterPath?: string;
  episodeCount?: number;
}

export interface TmdbEpisodeMetadata {
  id: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  runtimeMinutes?: number;
  stillPath?: string;
  voteAverage?: number;
}

export interface TmdbSeasonMetadata {
  id: number;
  seriesId: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  posterPath?: string;
  voteAverage?: number;
  episodes: TmdbEpisodeMetadata[];
}

/** Provider-neutral metadata only. It must never be used as a playback source. */
export interface TmdbMediaMetadata {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  originalLanguage?: string;
  genres: TmdbGenre[];
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  runtimeMinutes?: number;
  status?: string;
  tagline?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTimes?: number[];
  seasons?: TmdbSeasonSummary[];
}

export type TmdbImageKind = 'poster' | 'backdrop' | 'profile' | 'still' | 'logo';

export interface TmdbImageConfiguration {
  secureBaseUrl: string;
  posterSizes: string[];
  backdropSizes: string[];
  profileSizes: string[];
  stillSizes: string[];
  logoSizes: string[];
}
