export interface VSMovPagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export type MovieProviderKey = 'kkphim';

export interface ProviderIdentity {
  provider: MovieProviderKey;
  providerSlug: string;
}

export interface ExternalIdentity {
  tmdbId?: string;
  tmdbType?: 'movie' | 'tv';
  tmdbSeason?: number | null;
  imdbId?: string;
}

export type ProviderErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_RESPONSE'
  | 'EMPTY_RESPONSE'
  | 'INVALID_REQUEST';

export interface ProviderError {
  type: ProviderErrorType;
  message: string;
  provider: MovieProviderKey;
  statusCode?: number;
  url?: string;
  cause?: string;
}

export type MovieApiError = ProviderError;

// Normalized UI Domain Models
export interface CategoryModel {
  id: number | string;
  name: string;
  slug: string;
}

export interface CountryModel {
  id: number | string;
  name: string;
  slug: string;
}

export interface YearOptionModel {
  id: number | string;
  name: string;
  slug: string;
  year: number;
}

export interface CatalogFilters {
  genre?: string;
  country?: string;
  year?: number;
  type?: 'series' | 'single';
  page?: number;
}

export interface CatalogRequest {
  endpointType: 'genre' | 'country' | 'year' | 'type' | 'default';
  slug?: string;
  query: {
    country?: string;
    year?: number;
    type?: 'series' | 'single';
    page: number;
  };
}

export interface CatalogResolverResult {
  supported: boolean;
  reason?: string;
  request?: CatalogRequest;
}

/**
 * Provider-neutral browse state for /kham-pha. Provider adapters own the
 * serialization of this state into upstream query parameters.
 */
export type MovieBrowseType = 'phim-le' | 'phim-bo' | 'tv-shows' | 'hoat-hinh';
export type MovieBrowseLanguage = 'vietsub' | 'thuyet-minh' | 'long-tieng';
export type MovieBrowseSort = 'updated' | 'created' | 'year';
export type MovieBrowseOrder = 'asc' | 'desc';

export interface MovieBrowseFilter {
  type?: MovieBrowseType;
  genre?: string;
  country?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  language?: MovieBrowseLanguage;
  sort?: MovieBrowseSort;
  order?: MovieBrowseOrder;
  page?: number;
  limit?: number;
}

export interface MovieProviderCapabilities {
  combinedBrowseFilters: boolean;
  yearRange: boolean;
  languageFilter: boolean;
  sorting: boolean;
  browseTypes: readonly MovieBrowseType[];
}

export interface MovieCardModel {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  thumbUrl: string;
  year?: string | number;
  type?: 'single' | 'series' | 'hoathinh' | 'tvshows' | string;
  status?: string;
  episodeCurrent?: string;
  episodeTotal?: string;
  quality?: string;
  language?: string;
  rating?: number;
  voteCount?: number;
  duration?: string;
  views?: number;
  categories: CategoryModel[];
  countries: CountryModel[];
  providerIdentity?: ProviderIdentity;
  externalIdentity?: ExternalIdentity;
  /** Sync metadata; hidden from normal UI reads. */
  updatedAt?: number;
  deletedAt?: number;
}

export interface EpisodeItemModel {
  name: string;
  slug: string;
  filename?: string;
  embedUrl: string;
  m3u8Url?: string;
  providerIdentity?: ProviderIdentity;
}

export interface ServerGroupModel {
  serverName: string;
  items: EpisodeItemModel[];
}

export interface MovieDetailModel extends MovieCardModel {
  synopsis?: string;
  trailerUrl?: string;
  actors: string[];
  directors: string[];
  keywords: string[];
  showtimes?: string;
  isCinemaRelease?: boolean;
  episodes: ServerGroupModel[];
}

export interface PlayerCapabilities {
  canReadCurrentTime: boolean;
  canReadDuration: boolean;
  canSeek: boolean;
  canDetectEnded: boolean;
  canChangePlaybackRate: boolean;
}

export interface PlaybackProgress {
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
  episodeSlug: string;
  episodeName?: string;
  serverIndex?: number;
  serverName?: string;
  currentTime: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
  deletedAt?: number;
}

export interface WatchHistoryItem {
  slug: string;
  title: string;
  posterUrl: string;
  episodeName: string;
  episodeSlug: string;
  serverName: string;
  serverIndex?: number;
  updatedAt: number;
  deletedAt?: number;
}
