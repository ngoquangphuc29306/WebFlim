import { describe, expect, it, vi } from 'vitest';
import configurationFixture from '@/tests/fixtures/tmdb/configuration.json';
import movieFixture from '@/tests/fixtures/tmdb/movie.json';
import seasonFixture from '@/tests/fixtures/tmdb/season.json';
import tvFixture from '@/tests/fixtures/tmdb/tv.json';
import { buildTmdbImageUrl } from '@/lib/tmdb/images';
import { mapTmdbImageConfiguration, mapTmdbMovie, mapTmdbSeason, mapTmdbTv } from '@/lib/tmdb/mapper';
import { TmdbMetadataService } from '@/lib/tmdb/service';
import type { TmdbClientContract } from '@/lib/tmdb/client';

describe('TMDB DTO mapping and image policy', () => {
  it('maps nullable movie and TV DTO fields into provider-neutral metadata', () => {
    expect(mapTmdbMovie(movieFixture)).toMatchObject({
      id: 603,
      mediaType: 'movie',
      title: 'Ma Trận',
      runtimeMinutes: 136,
      genres: expect.arrayContaining([{ id: 28, name: 'Hành Động' }]),
    });
    expect(mapTmdbTv(tvFixture)).toMatchObject({
      id: 1396,
      mediaType: 'tv',
      title: 'Rất Nhiều Tập',
      numberOfSeasons: 5,
      seasons: [{ seasonNumber: 1, episodeCount: 7 }],
    });
  });

  it('maps season metadata without changing provider playback episode identity', () => {
    const season = mapTmdbSeason(seasonFixture, 1396);

    expect(season).toMatchObject({ seriesId: 1396, seasonNumber: 1, episodes: [{ episodeNumber: 1, name: 'Tập 1' }] });
    expect(mapTmdbSeason({ ...seasonFixture, season_number: null }, 1396)).toBeNull();
  });

  it('keeps missing optional fields absent instead of fabricating metadata or image paths', () => {
    expect(mapTmdbMovie({ id: 1, title: 'Tối giản' })).toEqual({
      id: 1,
      mediaType: 'movie',
      title: 'Tối giản',
      genres: [],
    });
  });

  it('creates safe image URLs from configuration without accepting external paths', () => {
    const configuration = mapTmdbImageConfiguration(configurationFixture);

    expect(buildTmdbImageUrl('/poster.jpg', 'posterCard', configuration)).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    expect(buildTmdbImageUrl('/backdrop.jpg', 'backdropHero', configuration)).toBe('https://image.tmdb.org/t/p/w1280/backdrop.jpg');
    expect(buildTmdbImageUrl(null, 'posterCard', configuration)).toBeUndefined();
    expect(buildTmdbImageUrl('https://example.invalid/poster.jpg', 'posterCard', configuration)).toBeUndefined();
  });
});

describe('TmdbMetadataService identity routing', () => {
  function client(): TmdbClientContract {
    return {
      getMovie: vi.fn().mockResolvedValue({ data: movieFixture, error: null }),
      getTv: vi.fn().mockResolvedValue({ data: tvFixture, error: null }),
      getTvSeason: vi.fn().mockResolvedValue({ data: seasonFixture, error: null }),
      getConfiguration: vi.fn().mockResolvedValue({ data: configurationFixture, error: null }),
      getTrending: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPopular: vi.fn().mockResolvedValue({ data: null, error: null }),
      getTopRated: vi.fn().mockResolvedValue({ data: null, error: null }),
      getRecommendations: vi.fn().mockResolvedValue({ data: null, error: null }),
      getSimilar: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  }

  it('routes movie identity exclusively to the movie endpoint', async () => {
    const tmdb = client();
    const result = await new TmdbMetadataService(tmdb).getMetadata({ tmdbId: '603', tmdbType: 'movie' });

    expect(result.data?.metadata.mediaType).toBe('movie');
    expect(tmdb.getMovie).toHaveBeenCalledWith('603', {});
    expect(tmdb.getTv).not.toHaveBeenCalled();
    expect(tmdb.getTvSeason).not.toHaveBeenCalled();
  });

  it('routes TV identity to TV then optionally to the verified season only', async () => {
    const tmdb = client();
    const result = await new TmdbMetadataService(tmdb).getMetadata(
      { tmdbId: '1396', tmdbType: 'tv', tmdbSeason: 1 },
      { includeSeason: true }
    );

    expect(result.data?.metadata.mediaType).toBe('tv');
    expect(result.data?.season?.seasonNumber).toBe(1);
    expect(tmdb.getTv).toHaveBeenCalledWith('1396', {});
    expect(tmdb.getTvSeason).toHaveBeenCalledWith('1396', 1, {});
    expect(tmdb.getMovie).not.toHaveBeenCalled();
  });

  it('does not request a season unless the caller explicitly includes it', async () => {
    const tmdb = client();
    const result = await new TmdbMetadataService(tmdb).getMetadata({ tmdbId: '1396', tmdbType: 'tv', tmdbSeason: 1 });

    expect(result.error).toBeNull();
    expect(tmdb.getTv).toHaveBeenCalledTimes(1);
    expect(tmdb.getTvSeason).not.toHaveBeenCalled();
  });

  it('keeps valid TV metadata when optional season enrichment fails', async () => {
    const tmdb = client();
    vi.mocked(tmdb.getTvSeason).mockResolvedValue({ data: null, error: { code: 'NOT_FOUND', message: 'missing season' } });

    const result = await new TmdbMetadataService(tmdb).getMetadata(
      { tmdbId: '1396', tmdbType: 'tv', tmdbSeason: 1 },
      { includeSeason: true }
    );

    expect(result.error).toBeNull();
    expect(result.data?.metadata.id).toBe(1396);
    expect(result.data?.season).toBeUndefined();
    expect(result.data?.seasonError?.code).toBe('NOT_FOUND');
  });

  it('fails invalid or incomplete external identity safely without issuing TMDB calls', async () => {
    const tmdb = client();
    const service = new TmdbMetadataService(tmdb);

    await expect(service.getMetadata({ tmdbId: 'not-a-number', tmdbType: 'movie' })).resolves.toMatchObject({ error: { code: 'INVALID_IDENTITY' } });
    await expect(service.getMetadata({ tmdbId: '1396', tmdbType: 'tv', tmdbSeason: -1 }, { includeSeason: true })).resolves.toMatchObject({ error: { code: 'INVALID_IDENTITY' } });
    expect(tmdb.getMovie).not.toHaveBeenCalled();
    expect(tmdb.getTv).not.toHaveBeenCalled();
  });
});
