import { describe, expect, it, vi } from 'vitest';
import movieFixture from '@/tests/fixtures/tmdb/movie.json';
import missingOverviewFixture from '@/tests/fixtures/tmdb/movie-missing-overview.json';
import englishMovieFixture from '@/tests/fixtures/tmdb/movie-en.json';
import creditsFixture from '@/tests/fixtures/tmdb/credits.json';
import videosFixture from '@/tests/fixtures/tmdb/videos.json';
import type { MovieDetailModel } from '@/types/movie';
import type { TmdbClientContract } from '@/lib/tmdb/client';
import { mapTmdbMovie } from '@/lib/tmdb/mapper';
import { TmdbMetadataService } from '@/lib/tmdb/service';
import { enrichMovieDetail, isTmdbIdentityTrusted, toMovieDetailModel } from '@/lib/tmdb/enrichment';

function providerMovie(overrides: Partial<MovieDetailModel> = {}): MovieDetailModel {
  return {
    id: '603',
    slug: 'ma-tran',
    title: 'Ma Trận',
    originalTitle: 'The Matrix',
    posterUrl: 'https://provider.invalid/poster.jpg',
    thumbUrl: 'https://provider.invalid/backdrop.jpg',
    year: 1999,
    type: 'single',
    categories: [{ id: 'action', name: 'Hành Động', slug: 'hanh-dong' }],
    countries: [{ id: 'us', name: 'Mỹ', slug: 'my' }],
    actors: ['Diễn viên cũ'],
    directors: ['Đạo diễn cũ'],
    keywords: [],
    episodes: [{
      serverName: 'Vietsub',
      items: [{ name: 'Full', slug: 'full', embedUrl: 'https://provider.invalid/embed', m3u8Url: 'https://provider.invalid/full.m3u8' }],
    }],
    externalIdentity: { tmdbId: '603', tmdbType: 'movie' },
    ...overrides,
  };
}

function clientWithMovieResponses(...responses: unknown[]): TmdbClientContract {
  return {
    getMovie: vi.fn()
      .mockResolvedValueOnce({ data: responses[0], error: null })
      .mockResolvedValueOnce({ data: responses[1], error: null }),
    getTv: vi.fn().mockResolvedValue({ data: null, error: { code: 'NOT_FOUND', message: 'not used' } }),
    getTvSeason: vi.fn().mockResolvedValue({ data: null, error: null }),
    getConfiguration: vi.fn().mockResolvedValue({ data: null, error: null }),
    getTrending: vi.fn().mockResolvedValue({ data: null, error: null }),
    getPopular: vi.fn().mockResolvedValue({ data: null, error: null }),
    getTopRated: vi.fn().mockResolvedValue({ data: null, error: null }),
    getRecommendations: vi.fn().mockResolvedValue({ data: null, error: null }),
    getSimilar: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

describe('TMDB enrichment service', () => {
  it('selectively requests en-US only when the primary overview is empty', async () => {
    const tmdb = clientWithMovieResponses(missingOverviewFixture, englishMovieFixture);
    const result = await new TmdbMetadataService(tmdb).getMetadata(
      { tmdbId: '603', tmdbType: 'movie' },
      { includeCredits: true, includeVideos: true },
    );

    expect(result.data?.metadata.overview).toContain('computer hacker');
    expect(result.data?.overviewLocale).toBe('tmdb-en-US');
    expect(tmdb.getMovie).toHaveBeenCalledTimes(2);
    expect(tmdb.getMovie).toHaveBeenNthCalledWith(1, '603', { appendToResponse: ['credits', 'videos'] });
    expect(tmdb.getMovie).toHaveBeenNthCalledWith(2, '603', { language: 'en-US', appendToResponse: ['credits', 'videos'] });
  });

  it('does not issue an English fallback when Vietnamese metadata has an overview', async () => {
    const tmdb = clientWithMovieResponses(movieFixture, englishMovieFixture);
    const result = await new TmdbMetadataService(tmdb).getMetadata({ tmdbId: '603', tmdbType: 'movie' });

    expect(result.data?.overviewLocale).toBe('vi-VN');
    expect(tmdb.getMovie).toHaveBeenCalledTimes(1);
  });
});

describe('TMDB DTO and presentation enrichment', () => {
  it('maps bounded cast, director credits, and deterministic YouTube trailer selection', () => {
    const metadata = mapTmdbMovie({ ...movieFixture, credits: creditsFixture, videos: videosFixture });
    expect(metadata?.credits?.cast[1]).toMatchObject({ name: 'Diễn viên Hai' });
    expect(metadata?.credits?.cast[1].profilePath).toBeUndefined();
    expect(metadata?.credits?.crew).toEqual(expect.arrayContaining([expect.objectContaining({ job: 'Director' })]));
    expect(metadata?.videos).toHaveLength(3);

    const enriched = enrichMovieDetail(providerMovie(), { metadata: metadata!, overviewLocale: 'vi-VN' });
    expect(enriched.enrichment.source).toBe('tmdb');
    expect(enriched.display.posterUrl).toContain('image.tmdb.org');
    expect(enriched.display.directors).toEqual([expect.objectContaining({ name: 'Đạo diễn Một' })]);
    expect(enriched.display.trailer).toMatchObject({ key: 'trailer-key', site: 'YouTube', official: true });
    expect(enriched.display.trailer?.url).toBe('https://www.youtube.com/watch?v=trailer-key');
  });

  it('limits visible cast to ten and keeps provider playback identity untouched', () => {
    const cast = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Actor ${index + 1}`, order: index }));
    const metadata = mapTmdbMovie({ ...movieFixture, credits: { cast, crew: [] } });
    const enriched = enrichMovieDetail(providerMovie(), { metadata: metadata!, overviewLocale: 'vi-VN' });
    const model = toMovieDetailModel(enriched);

    expect(enriched.display.cast).toHaveLength(10);
    expect(model.slug).toBe('ma-tran');
    expect(model.episodes[0].items[0].slug).toBe('full');
    expect(model.episodes[0].items[0].m3u8Url).toBe('https://provider.invalid/full.m3u8');
  });

  it('rejects a strongly contradictory external identity and falls back to provider presentation', () => {
    const metadata = mapTmdbMovie({ ...movieFixture, release_date: '2024-01-01' });
    const bundle = { metadata: metadata!, overviewLocale: 'vi-VN' };

    expect(isTmdbIdentityTrusted(providerMovie(), bundle)).toBe(false);
    const enriched = enrichMovieDetail(providerMovie(), bundle);
    expect(enriched.enrichment.source).toBe('provider');
    expect(enriched.display.posterUrl).toBe('https://provider.invalid/poster.jpg');
    expect(enriched.display.trailer).toBeUndefined();
  });
});
