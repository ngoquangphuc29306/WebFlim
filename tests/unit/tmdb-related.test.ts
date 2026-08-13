import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovieCardModel, MovieDetailModel } from '@/types/movie';

const getMoviesByGenre = vi.fn();
const getLatestMovies = vi.fn();
const getPlayableRecommendations = vi.fn();

vi.mock('@/lib/api/movies', () => ({ getMoviesByGenre, getLatestMovies }));
vi.mock('@/lib/tmdb/discovery', () => ({
  getPlayableRecommendations,
  TMDB_DISCOVERY_CARD_LIMIT: 12,
}));

function card(slug: string): MovieCardModel {
  return {
    id: slug,
    slug,
    title: slug,
    posterUrl: `https://provider.invalid/${slug}.jpg`,
    thumbUrl: `https://provider.invalid/${slug}-thumb.jpg`,
    categories: [],
    countries: [],
  };
}

function detail(): MovieDetailModel {
  return {
    ...card('current'),
    categories: [{ id: 'action', name: 'Action', slug: 'action' }],
    actors: [], directors: [], keywords: [], episodes: [],
    externalIdentity: { tmdbId: '603', tmdbType: 'movie' },
  };
}

describe('TMDB related movie fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    getMoviesByGenre.mockReset();
    getLatestMovies.mockReset();
    getPlayableRecommendations.mockReset();
  });

  it('fills a short playable TMDB recommendation list with deduplicated provider related movies', async () => {
    getPlayableRecommendations.mockResolvedValue({ cards: [card('tmdb-1'), card('tmdb-2'), card('tmdb-3')] });
    getMoviesByGenre.mockResolvedValue({ items: [card('tmdb-2'), card('genre-1'), card('genre-2')], error: null });
    getLatestMovies.mockResolvedValue({ items: [card('latest-1'), card('latest-2')], error: null });
    const { getRelatedMovies } = await import('@/lib/tmdb/related');

    const result = await getRelatedMovies(detail(), 6);

    expect(result.map((item) => item.slug)).toEqual(['tmdb-1', 'tmdb-2', 'tmdb-3', 'genre-1', 'genre-2', 'latest-1']);
    expect(getPlayableRecommendations).toHaveBeenCalledWith('603', 'movie', 'current', 6);
  });

  it('keeps Detail related content available when TMDB has no token or is unavailable', async () => {
    getPlayableRecommendations.mockResolvedValue({ cards: [], tmdbAvailable: false });
    getMoviesByGenre.mockResolvedValue({ items: [card('genre-1'), card('genre-2'), card('genre-3'), card('genre-4'), card('genre-5')], error: null });
    getLatestMovies.mockResolvedValue({ items: [] });
    const { getRelatedMovies } = await import('@/lib/tmdb/related');

    const result = await getRelatedMovies(detail(), 4);

    expect(result.map((item) => item.slug)).toEqual(['genre-1', 'genre-2', 'genre-3', 'genre-4']);
    expect(getLatestMovies).not.toHaveBeenCalled();
  });
});
