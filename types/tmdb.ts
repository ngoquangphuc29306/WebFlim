export type TmdbMediaType = 'movie' | 'tv';

/**
 * Lightweight, provider-neutral discovery metadata. It intentionally has no
 * playback fields: a provider availability resolver must supply the public
 * PHEVO slug before it can become a navigable card.
 */
export interface TmdbDiscoveryCandidate {
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  year?: number;
  voteAverage?: number;
  voteCount?: number;
  genreIds?: number[];
  popularity?: number;
}

export interface TmdbDiscoveryPage {
  candidates: TmdbDiscoveryCandidate[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
  order?: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  department?: string;
  job?: string;
  profilePath?: string;
  order?: number;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  publishedAt?: string;
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
  credits?: TmdbCredits;
  videos?: TmdbVideo[];
  createdBy?: TmdbCrewMember[];
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

export interface TmdbCastPresentation {
  id: number;
  name: string;
  character?: string;
  profileUrl?: string;
  order?: number;
}

export interface TmdbCrewPresentation {
  id: number;
  name: string;
  job?: string;
  profileUrl?: string;
}

export interface TmdbTrailerPresentation {
  site: 'YouTube';
  key: string;
  name: string;
  official: boolean;
  type: string;
  url: string;
}

export interface TmdbDetailPresentation {
  title: string;
  originalTitle?: string;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  year?: number;
  runtimeMinutes?: number;
  genres: TmdbGenre[];
  voteAverage?: number;
  voteCount?: number;
  ratingSource: 'tmdb' | 'provider';
  cast: TmdbCastPresentation[];
  directors: TmdbCrewPresentation[];
  creators: TmdbCrewPresentation[];
  trailer?: TmdbTrailerPresentation;
  season?: TmdbSeasonMetadata;
  overviewSource: 'tmdb-vi-VN' | 'tmdb-en-US' | 'provider';
}

export interface EnrichedMovieDetail {
  provider: import('@/types/movie').MovieDetailModel;
  display: TmdbDetailPresentation;
  enrichment: {
    source: 'tmdb' | 'provider';
    tmdbAvailable: boolean;
    tmdbId?: string;
    overviewSource: TmdbDetailPresentation['overviewSource'];
    seasonAvailable: boolean;
  };
}

export type EnrichedMovieDetailModel = import('@/types/movie').MovieDetailModel & {
  tmdbPresentation?: TmdbDetailPresentation;
  enrichment?: EnrichedMovieDetail['enrichment'];
};
