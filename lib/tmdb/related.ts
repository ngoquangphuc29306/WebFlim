import 'server-only';

import type { MovieCardModel, MovieDetailModel } from '@/types/movie';
import { getLatestMovies, getMoviesByGenre } from '@/lib/api/movies';
import { getPlayableRecommendations, TMDB_DISCOVERY_CARD_LIMIT } from '@/lib/tmdb/discovery';

export const RELATED_MOVIE_LIMIT = 12;
const PROVIDER_RELATED_FALLBACK_MINIMUM = 5;

export function mergeRelatedMovieCards(
  movies: MovieCardModel[],
  currentSlug: string,
  limit: number,
): MovieCardModel[] {
  const unique = new Map<string, MovieCardModel>();
  for (const movie of movies) {
    if (movie.slug && movie.slug !== currentSlug && !unique.has(movie.slug)) unique.set(movie.slug, movie);
    if (unique.size >= limit) break;
  }
  return [...unique.values()];
}

/** The existing provider related strategy, retained as the bounded safe fallback. */
export async function getProviderRelatedMovies(
  movie: MovieDetailModel,
  limit = RELATED_MOVIE_LIMIT,
): Promise<MovieCardModel[]> {
  const primaryCategory = movie.categories[0]?.slug;
  const byCategory = primaryCategory ? await getMoviesByGenre(primaryCategory, 1) : null;
  let related = mergeRelatedMovieCards(byCategory?.items ?? [], movie.slug, limit);

  if (related.length < Math.min(PROVIDER_RELATED_FALLBACK_MINIMUM, limit)) {
    const latest = await getLatestMovies(1);
    related = mergeRelatedMovieCards([...related, ...latest.items], movie.slug, limit);
  }
  return related;
}

/**
 * TMDB can improve relevance only after exact provider identity resolution.
 * Provider results then fill any remaining card capacity, preserving Detail
 * availability when TMDB is unavailable or overlap is sparse.
 */
export async function getRelatedMovies(
  movie: MovieDetailModel,
  limit = RELATED_MOVIE_LIMIT,
): Promise<MovieCardModel[]> {
  const target = Math.max(1, Math.min(limit, RELATED_MOVIE_LIMIT));
  const tmdb = movie.externalIdentity;
  const recommendations = tmdb?.tmdbId && tmdb.tmdbType
    ? await getPlayableRecommendations(tmdb.tmdbId, tmdb.tmdbType, movie.slug, Math.min(target, TMDB_DISCOVERY_CARD_LIMIT))
    : null;
  const resolved = mergeRelatedMovieCards(recommendations?.cards ?? [], movie.slug, target);
  if (resolved.length >= target) return resolved;

  const providerFallback = await getProviderRelatedMovies(movie, target);
  return mergeRelatedMovieCards([...resolved, ...providerFallback], movie.slug, target);
}
