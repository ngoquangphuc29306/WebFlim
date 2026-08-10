export interface VSMovTmdb {
  type?: string;
  id?: string;
  season?: number | null;
  vote_average?: string | number;
  vote_count?: number;
}

export interface VSMovImdb {
  id?: string;
}

export interface VSMovCategory {
  id?: number;
  _id?: number | string;
  name: string;
  slug: string;
}

export interface VSMovCountry {
  id?: number;
  _id?: number | string;
  name: string;
  slug: string;
}

export interface VSMovItem {
  _id: string | number;
  name: string;
  origin_name?: string;
  slug: string;
  poster_url: string;
  thumb_url: string;
  year?: number | string;
  type?: 'single' | 'series' | 'hoathinh' | 'tvshows' | string;
  status?: string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  episode_total?: string;
  time?: string;
  view?: number;
  tmdb?: VSMovTmdb;
  imdb?: VSMovImdb;
  category?: VSMovCategory[];
  country?: VSMovCountry[];
  modified?: {
    time: string;
  };
}

export interface VSMovPagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export interface VSMovListResponse {
  status: boolean | string;
  items?: VSMovItem[];
  pathImage?: string;
  pagination?: VSMovPagination;
  msg?: string;
}

export interface VSMovTaxonomyItem {
  _id: number | string;
  name: string;
  slug: string;
}

export interface VSMovTaxonomyResponse {
  status: string | boolean;
  message?: string;
  data?: {
    items: VSMovTaxonomyItem[];
  };
}

export interface VSMovEpisodeData {
  name: string;
  slug: string;
  filename?: string;
  link_embed: string;
  link_m3u8?: string;
}

export interface VSMovServer {
  server_name: string;
  server_data: VSMovEpisodeData[];
}

export interface VSMovMovieDetail extends VSMovItem {
  content?: string;
  trailer_url?: string | null;
  notify?: string | null;
  showtimes?: string | null;
  keywords?: string[];
  actor?: string[];
  director?: string[];
  chieurap?: boolean;
  sub_docquyen?: boolean;
}

export interface VSMovDetailResponse {
  status: boolean | string;
  msg?: string;
  movie?: VSMovMovieDetail;
  episodes?: VSMovServer[];
}

// Error models for API consumption
export type VSMovApiErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_RESPONSE'
  | 'EMPTY_RESPONSE';

export interface VSMovApiError {
  type: VSMovApiErrorType;
  message: string;
  statusCode?: number;
  url?: string;
  cause?: string;
}

export interface VSMovApiResult<T> {
  data: T | null;
  error: VSMovApiError | null;
}

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
}

export interface EpisodeItemModel {
  name: string;
  slug: string;
  filename?: string;
  embedUrl: string;
  m3u8Url?: string;
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
}
