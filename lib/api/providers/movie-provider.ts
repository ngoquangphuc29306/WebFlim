import type {
  CatalogRequest,
  CategoryModel,
  CountryModel,
  MovieBrowseFilter,
  MovieApiError,
  MovieProviderCapabilities,
  ProviderError,
  MovieCardModel,
  MovieDetailModel,
  ServerGroupModel,
  VSMovPagination,
  YearOptionModel,
} from '@/types/movie';

export interface MovieListResult {
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: MovieApiError | null;
}

export interface MovieListWithTitleResult extends MovieListResult {
  title: string;
}

export interface MovieDetailResult {
  movie: MovieDetailModel | null;
  error?: MovieApiError | null;
}

export interface HomepageData {
  heroMovies: MovieCardModel[];
  latestMovies: MovieCardModel[];
  singleMovies: MovieCardModel[];
  seriesMovies: MovieCardModel[];
  subteamMovies: MovieCardModel[];
  hoathinhMovies: MovieCardModel[];
}

export interface MovieProvider {
  readonly key: 'vsmov' | 'kkphim';
  readonly capabilities: MovieProviderCapabilities;

  getLatestMovies(page?: number): Promise<MovieListResult>;
  getMovieListBySlug(slug: string, page?: number): Promise<MovieListWithTitleResult>;
  getMoviesByGenre(slug: string, page?: number): Promise<MovieListResult>;
  getMoviesByCountry(slug: string, page?: number): Promise<MovieListResult>;
  getMoviesByYear(year: string | number, page?: number): Promise<MovieListResult>;
  searchMovies(keyword: string, page?: number): Promise<MovieListResult>;
  getGenresList(): Promise<CategoryModel[]>;
  getCountriesList(): Promise<CountryModel[]>;
  getYearsList(): Promise<YearOptionModel[]>;
  getMovieDetail(slug: string): Promise<MovieDetailResult>;
  browseMovies(filter: MovieBrowseFilter): Promise<MovieListWithTitleResult>;
  getCatalogMovies(request: CatalogRequest): Promise<MovieListWithTitleResult>;
  getHomepageData(): Promise<HomepageData>;
}

export function emptyPagination(): VSMovPagination {
  return {
    totalItems: 0,
    totalItemsPerPage: 24,
    currentPage: 1,
    totalPages: 1,
  };
}

export function invalidProviderError(
  provider: 'vsmov' | 'kkphim',
  message: string
): ProviderError {
  return {
    type: 'INVALID_REQUEST',
    message,
    provider,
  };
}

export function asPage(page: number | undefined): number {
  return Math.max(1, page ?? 1);
}

export function cleanSlug(slug: string | undefined): string | null {
  const value = slug?.trim();
  return value ? value : null;
}

export function emptyHomepageData(): HomepageData {
  return {
    heroMovies: [],
    latestMovies: [],
    singleMovies: [],
    seriesMovies: [],
    subteamMovies: [],
    hoathinhMovies: [],
  };
}

export function mergeHomepageData(
  latest: MovieListResult,
  single: MovieListResult,
  series: MovieListResult,
  subteam: MovieListResult,
  animation: MovieListResult
): HomepageData {
  const heroMovies = latest.items.length > 0
    ? latest.items.slice(0, 5)
    : [...single.items, ...series.items].slice(0, 5);

  return {
    heroMovies,
    latestMovies: latest.items.slice(0, 16),
    singleMovies: single.items.slice(0, 16),
    seriesMovies: series.items.slice(0, 16),
    subteamMovies: subteam.items.slice(0, 16),
    hoathinhMovies: animation.items.slice(0, 16),
  };
}

export function getProviderErrorMessage(error: MovieApiError | null | undefined): string {
  return error?.message || 'Provider request failed';
}

export type ServerEpisodeSummary = {
  serverCount: number;
  episodeCount: number;
  hlsEpisodeCount: number;
  embedEpisodeCount: number;
};

export function summarizeServers(servers: ServerGroupModel[] | undefined): ServerEpisodeSummary {
  const groups = servers ?? [];
  const episodes = groups.flatMap((group) => group.items);
  return {
    serverCount: groups.length,
    episodeCount: episodes.length,
    hlsEpisodeCount: episodes.filter((episode) => Boolean(episode.m3u8Url)).length,
    embedEpisodeCount: episodes.filter((episode) => Boolean(episode.embedUrl)).length,
  };
}
