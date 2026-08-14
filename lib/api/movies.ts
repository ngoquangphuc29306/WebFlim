import { cache } from 'react';
import type { CatalogRequest, MovieBrowseFilter } from '@/types/movie';
import type { HomepageData, MovieDetailResult, MovieListResult, MovieListWithTitleResult } from '@/lib/api/providers/movie-provider';
import { KkPhimMovieProvider } from '@/lib/api/providers/kkphim/provider';
import type { MovieProvider } from '@/lib/api/providers/movie-provider';

const movieProvider: MovieProvider = new KkPhimMovieProvider();

export const activeMovieProvider = movieProvider.key;
export const activeMovieProviderCapabilities = movieProvider.capabilities;

export function getLatestMovies(page = 1): Promise<MovieListResult> {
  return movieProvider.getLatestMovies(page);
}

export function getMovieListBySlug(slug: string, page = 1): Promise<MovieListWithTitleResult> {
  return movieProvider.getMovieListBySlug(slug, page);
}

export function getMoviesByGenre(slug: string, page = 1): Promise<MovieListResult> {
  return movieProvider.getMoviesByGenre(slug, page);
}

export function getMoviesByCountry(slug: string, page = 1): Promise<MovieListResult> {
  return movieProvider.getMoviesByCountry(slug, page);
}

export function getMoviesByYear(year: string | number, page = 1): Promise<MovieListResult> {
  return movieProvider.getMoviesByYear(year, page);
}

export function searchMovies(keyword: string, page = 1): Promise<MovieListResult> {
  return movieProvider.searchMovies(keyword, page);
}

export const getMovieDetail = cache(async (slug: string): Promise<MovieDetailResult> => {
  return movieProvider.getMovieDetail(slug);
});

export const getGenresList = cache(() => movieProvider.getGenresList());
export const getCountriesList = cache(() => movieProvider.getCountriesList());
export const getYearsList = cache(() => movieProvider.getYearsList());

export function getCatalogMovies(request: CatalogRequest): Promise<MovieListWithTitleResult> {
  return movieProvider.getCatalogMovies(request);
}

/** Provider-neutral entry point for /kham-pha advanced browsing. */
export function browseMovies(filter: MovieBrowseFilter): Promise<MovieListWithTitleResult> {
  return movieProvider.browseMovies(filter);
}

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  return movieProvider.getHomepageData();
});
