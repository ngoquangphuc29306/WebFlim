import { describe, expect, it, vi } from 'vitest';
import type { MovieCardModel } from '@/types/movie';
import type { TmdbDiscoveryCandidate, TmdbMediaType } from '@/types/tmdb';
import type { TmdbClientContract } from '@/lib/tmdb/client';
import { TmdbPlayableDiscoveryService } from '@/lib/tmdb/discovery';
import {
  ProviderPlayabilityResolver,
  resolveCandidateFromRecords,
  type ProviderAvailabilityRecord,
} from '@/lib/tmdb/playability';
import { mergeRelatedMovieCards } from '@/lib/tmdb/related';

function candidate(overrides: Partial<TmdbDiscoveryCandidate> = {}): TmdbDiscoveryCandidate {
  return {
    tmdbId: 603,
    mediaType: 'movie',
    title: 'The Matrix',
    originalTitle: 'The Matrix',
    year: 1999,
    posterPath: '/matrix.jpg',
    ...overrides,
  };
}

function movie(overrides: Partial<MovieCardModel> = {}): MovieCardModel {
  return {
    id: 'provider-id',
    slug: 'ma-tran',
    title: 'Ma Trận',
    originalTitle: 'The Matrix',
    posterUrl: 'https://provider.invalid/poster.jpg',
    thumbUrl: 'https://provider.invalid/thumb.jpg',
    year: 1999,
    type: 'single',
    categories: [],
    countries: [],
    providerIdentity: { provider: 'kkphim', providerSlug: 'ma-tran' },
    externalIdentity: { tmdbId: '603', tmdbType: 'movie' },
    ...overrides,
  };
}

function record(overrides: Partial<ProviderAvailabilityRecord> = {}): ProviderAvailabilityRecord {
  const value = movie();
  return {
    publicSlug: value.slug,
    provider: 'kkphim',
    externalIdentity: value.externalIdentity,
    movie: value,
    ...overrides,
  };
}

function discoveryClient(page: unknown): TmdbClientContract {
  const resolved = { data: page as never, error: null };
  return {
    getMovie: vi.fn(), getTv: vi.fn(), getTvSeason: vi.fn(), getConfiguration: vi.fn(),
    getTrending: vi.fn().mockResolvedValue(resolved),
    getPopular: vi.fn().mockResolvedValue(resolved),
    getTopRated: vi.fn().mockResolvedValue(resolved),
    getRecommendations: vi.fn().mockResolvedValue(resolved),
    getSimilar: vi.fn().mockResolvedValue(resolved),
  };
}

describe('TMDB playability resolution', () => {
  it('accepts only an exact TMDB movie identity match', () => {
    expect(resolveCandidateFromRecords(candidate(), [record()])).toMatchObject({ status: 'EXACT_MATCH', publicSlug: 'ma-tran' });
    expect(resolveCandidateFromRecords(candidate({ mediaType: 'tv' }), [record()])).toEqual({ status: 'UNAVAILABLE' });
  });

  it('keeps missing provider records unavailable and does not synthesize a public slug', () => {
    expect(resolveCandidateFromRecords(candidate(), [])).toEqual({ status: 'UNAVAILABLE' });
  });

  it('selects the lowest positive provider season deterministically for a TV show', () => {
    const seriesCandidate = candidate({ tmdbId: 100, mediaType: 'tv', title: 'A Series', originalTitle: 'A Series', year: 2020 });
    const seasonOne = movie({ slug: 'a-series-phan-1', type: 'series', year: 2020, externalIdentity: { tmdbId: '100', tmdbType: 'tv', tmdbSeason: 1 } });
    const seasonTwo = movie({ slug: 'a-series-phan-2', type: 'series', year: 2020, externalIdentity: { tmdbId: '100', tmdbType: 'tv', tmdbSeason: 2 } });
    const result = resolveCandidateFromRecords(seriesCandidate, [
      record({ publicSlug: seasonTwo.slug, externalIdentity: seasonTwo.externalIdentity, movie: seasonTwo }),
      record({ publicSlug: seasonOne.slug, externalIdentity: seasonOne.externalIdentity, movie: seasonOne }),
    ]);
    expect(result).toMatchObject({ status: 'EXACT_MATCH', publicSlug: 'a-series-phan-1' });
  });

  it('marks multiple distinct movie records as ambiguous instead of choosing an arbitrary slug', () => {
    const duplicate = movie({ slug: 'ma-tran-ban-khac' });
    expect(resolveCandidateFromRecords(candidate(), [
      record(),
      record({ publicSlug: duplicate.slug, movie: duplicate }),
    ])).toMatchObject({ status: 'AMBIGUOUS' });
  });

  it('uses one bounded availability index load for a batch of candidates', async () => {
    const loadIndex = vi.fn().mockResolvedValue([record()]);
    const resolver = new ProviderPlayabilityResolver(loadIndex);
    const results = await resolver.resolveAll([candidate(), candidate({ tmdbId: 999 })]);
    expect(loadIndex).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.status)).toEqual(['EXACT_MATCH', 'UNAVAILABLE']);
  });
});

describe('TMDB discovery normalization and related fallback composition', () => {
  it('turns exact resolved candidates into provider-slug cards and deduplicates a rail', async () => {
    const client = discoveryClient({
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: [
        { id: 603, title: 'The Matrix', original_title: 'The Matrix', release_date: '1999-03-30', poster_path: '/matrix.jpg' },
        { id: 603, title: 'The Matrix', original_title: 'The Matrix', release_date: '1999-03-30', poster_path: '/matrix.jpg' },
      ],
    });
    const service = new TmdbPlayableDiscoveryService(client, new ProviderPlayabilityResolver(async () => [record()]));

    const result = await service.getTrending('movie');

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ slug: 'ma-tran', posterUrl: 'https://image.tmdb.org/t/p/w500/matrix.jpg' });
    expect(result.diagnostics).toMatchObject({ candidates: 2, exactMatches: 2 });
  });

  it('keeps provider related cards as the deterministic fill when TMDB resolves too few cards', () => {
    const current = 'current';
    const tmdbResolved = [movie({ slug: 'tmdb-1' }), movie({ slug: 'tmdb-1' }), movie({ slug: current })];
    const providerFallback = [movie({ slug: 'provider-1' }), movie({ slug: 'provider-2' })];
    expect(mergeRelatedMovieCards([...tmdbResolved, ...providerFallback], current, 3).map((item) => item.slug))
      .toEqual(['tmdb-1', 'provider-1', 'provider-2']);
  });

  it('keeps a TMDB outage non-fatal for callers', async () => {
    const client = discoveryClient(null);
    vi.mocked(client.getRecommendations).mockResolvedValue({ data: null, error: { code: 'NETWORK_ERROR', message: 'offline' } });
    const service = new TmdbPlayableDiscoveryService(client, new ProviderPlayabilityResolver(async () => []));
    await expect(service.getRecommendations('603', 'movie')).resolves.toMatchObject({ cards: [], tmdbAvailable: false });
  });

  it('also treats an unexpected TMDB client rejection as an empty optional discovery result', async () => {
    const client = discoveryClient({ page: 1, results: [] });
    vi.mocked(client.getTrending).mockRejectedValue(new Error('socket closed'));
    const service = new TmdbPlayableDiscoveryService(client, new ProviderPlayabilityResolver(async () => []));
    await expect(service.getTrending('movie')).resolves.toMatchObject({ cards: [], tmdbAvailable: false });
  });
});
