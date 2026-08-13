import { cache } from 'react';
import type { CatalogRequest } from '@/types/movie';
import { configuredCanaryEnabled, configuredMovieProvider, resolveMovieProvider } from '@/lib/api/providers/config';
import type { HomepageData, MovieDetailResult, MovieListResult, MovieListWithTitleResult } from '@/lib/api/providers/movie-provider';
import { KkPhimMovieProvider } from '@/lib/api/providers/kkphim/provider';
import { compareMovieDetails, compareMovieListResults, type CanaryComparison } from '@/lib/api/providers/canary';
import { VsmovMovieProvider } from '@/lib/api/providers/vsmov/provider';
import type { MovieProvider } from '@/lib/api/providers/movie-provider';

const providers: Record<'vsmov' | 'kkphim', MovieProvider> = {
  vsmov: new VsmovMovieProvider(),
  kkphim: new KkPhimMovieProvider(),
};

const primaryProvider = providers[resolveMovieProvider(configuredMovieProvider())];
const canaryEnabled = configuredCanaryEnabled();

export const activeMovieProvider = primaryProvider.key;
export const activeMovieProviderCanary = canaryEnabled;

function shadowProvider(): MovieProvider {
  return primaryProvider.key === 'vsmov' ? providers.kkphim : providers.vsmov;
}

function reportCanary(operation: string, comparison: CanaryComparison): void {
  if (comparison.mismatches.length === 0) return;
  console.warn(`[MovieProvider canary] ${operation}`, comparison.mismatches);
}

function shadowList(operation: string, primary: MovieListResult, secondaryPromise: Promise<MovieListResult>): void {
  if (!canaryEnabled) return;
  void secondaryPromise
    .then((secondary) => reportCanary(operation, compareMovieListResults(operation, primaryProvider.key, shadowProvider().key, primary.items, secondary.items)))
    .catch(() => undefined);
}

function shadowDetail(operation: string, primary: MovieDetailResult, secondaryPromise: Promise<MovieDetailResult>): void {
  if (!canaryEnabled) return;
  void secondaryPromise
    .then((secondary) => reportCanary(operation, compareMovieDetails(operation, primaryProvider.key, shadowProvider().key, primary.movie, secondary.movie)))
    .catch(() => undefined);
}

export function getLatestMovies(page = 1): Promise<MovieListResult> {
  return primaryProvider.getLatestMovies(page).then((result) => {
    shadowList('latest', result, shadowProvider().getLatestMovies(page));
    return result;
  });
}

export function getMovieListBySlug(slug: string, page = 1): Promise<MovieListWithTitleResult> {
  return primaryProvider.getMovieListBySlug(slug, page).then((result) => {
    shadowList(`list:${slug}`, result, shadowProvider().getMovieListBySlug(slug, page));
    return result;
  });
}

export function getMoviesByGenre(slug: string, page = 1): Promise<MovieListResult> {
  return primaryProvider.getMoviesByGenre(slug, page).then((result) => {
    shadowList(`genre:${slug}`, result, shadowProvider().getMoviesByGenre(slug, page));
    return result;
  });
}

export function getMoviesByCountry(slug: string, page = 1): Promise<MovieListResult> {
  return primaryProvider.getMoviesByCountry(slug, page).then((result) => {
    shadowList(`country:${slug}`, result, shadowProvider().getMoviesByCountry(slug, page));
    return result;
  });
}

export function getMoviesByYear(year: string | number, page = 1): Promise<MovieListResult> {
  return primaryProvider.getMoviesByYear(year, page).then((result) => {
    shadowList(`year:${year}`, result, shadowProvider().getMoviesByYear(year, page));
    return result;
  });
}

export function searchMovies(keyword: string, page = 1): Promise<MovieListResult> {
  return primaryProvider.searchMovies(keyword, page).then((result) => {
    shadowList('search', result, shadowProvider().searchMovies(keyword, page));
    return result;
  });
}

export const getMovieDetail = cache(async (slug: string): Promise<MovieDetailResult> => {
  const result = await primaryProvider.getMovieDetail(slug);
  shadowDetail(`detail:${slug}`, result, shadowProvider().getMovieDetail(slug));
  return result;
});

export const getGenresList = cache(() => primaryProvider.getGenresList());
export const getCountriesList = cache(() => primaryProvider.getCountriesList());
export const getYearsList = cache(() => primaryProvider.getYearsList());

export function getCatalogMovies(request: CatalogRequest): Promise<MovieListWithTitleResult> {
  return primaryProvider.getCatalogMovies(request).then((result) => {
    if (canaryEnabled) {
      void shadowProvider().getCatalogMovies(request)
        .then((secondary) => shadowList(`catalog:${request.endpointType}`, result, Promise.resolve(secondary)))
        .catch(() => undefined);
    }
    return result;
  });
}

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  const result = await primaryProvider.getHomepageData();
  if (canaryEnabled) {
    void shadowProvider().getHomepageData().then((secondary) => {
      shadowList('homepage:latest', {
        items: result.latestMovies,
        pagination: { totalItems: result.latestMovies.length, totalItemsPerPage: 24, currentPage: 1, totalPages: 1 },
      }, Promise.resolve({
        items: secondary.latestMovies,
        pagination: { totalItems: secondary.latestMovies.length, totalItemsPerPage: 24, currentPage: 1, totalPages: 1 },
      }));
    }).catch(() => undefined);
  }
  return result;
});
