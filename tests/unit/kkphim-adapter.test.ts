import { describe, expect, it, vi } from 'vitest';
import kkDetailFixture from '@/tests/fixtures/kkphim/detail.json';
import kkListFixture from '@/tests/fixtures/kkphim/list.json';
import type {
  KkPhimDetailResponseDto,
  KkPhimListResponseDto,
} from '@/types/kkphim';
import type { KkPhimClientContract, KkPhimRequestResult } from '@/lib/api/providers/kkphim/client';
import { KkPhimClient } from '@/lib/api/providers/kkphim/client';
import {
  mapKkDetailResponse,
  mapKkListResponse,
  normalizeKkImage,
  normalizeKkPagination,
} from '@/lib/api/providers/kkphim/mapper';
import {
  KKPHIM_SLUG_ALIASES,
  KkPhimMovieProvider,
} from '@/lib/api/providers/kkphim/provider';
import { isMovieProviderCanaryEnabled, resolveMovieProvider } from '@/lib/api/providers/config';
import { compareMovieDetails, compareMovieListResults } from '@/lib/api/providers/canary';

const fetchResponse = (body: unknown, status = 200, contentType = 'application/json'): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe('KKPhim mapping boundary', () => {
  it('keeps absolute images and resolves relative images against the response CDN', () => {
    const normalized = mapKkListResponse(kkListFixture as KkPhimListResponseDto);

    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0]).toMatchObject({
      slug: 'kkphim-fixture',
      posterUrl: 'https://images.example/kk-poster.jpg',
      thumbUrl: 'https://img.example/2026/kk-thumb.jpg',
      providerIdentity: { provider: 'kkphim', providerSlug: 'kkphim-fixture' },
      externalIdentity: { tmdbId: '123', tmdbType: 'movie' },
    });
  });

  it('uses a safe placeholder for missing image values without fabricating a provider path', () => {
    expect(normalizeKkImage(null)).toBe('https://picsum.photos/seed/kkphim-placeholder/400/600');
    expect(normalizeKkImage('/poster.jpg', 'https://cdn.example/')).toBe('https://cdn.example/poster.jpg');
  });

  it('derives total pages from totals and never treats pageRanges as totalPages', () => {
    const pagination = normalizeKkPagination(kkListFixture as KkPhimListResponseDto);
    expect(pagination).toEqual({ totalItems: 49, totalItemsPerPage: 24, currentPage: 1, totalPages: 3 });
  });

  it('maps detail metadata, provider identity, server order, episode order, and missing HLS safely', () => {
    const movie = mapKkDetailResponse(kkDetailFixture as KkPhimDetailResponseDto, 'legacy-public-slug');

    expect(movie).toMatchObject({
      slug: 'legacy-public-slug',
      title: 'Bộ phim Fixture',
      synopsis: 'Một mô tả được làm sạch.',
      externalIdentity: { tmdbId: '456', tmdbType: 'tv', tmdbSeason: 1, imdbId: 'tt1234567' },
    });
    expect(movie?.providerIdentity).toEqual({ provider: 'kkphim', providerSlug: 'kk-series-fixture' });
    expect(movie?.episodes.map((server) => server.serverName)).toEqual(['Vietsub', 'Lồng Tiếng']);
    expect(movie?.episodes[0]?.items.map((episode) => episode.name)).toEqual(['Tập 01', 'Tập 02']);
    expect(movie?.episodes[0]?.items[0]?.m3u8Url).toContain('.m3u8');
    expect(movie?.episodes[1]?.items[0]?.m3u8Url).toBeUndefined();
  });
});

describe('KKPhim request reliability', () => {
  it('performs one request for a successful JSON response and preserves revalidation', async () => {
    const fetchMock = vi.fn<Fetcher>().mockResolvedValue(fetchResponse(kkListFixture));
    const client = new KkPhimClient(fetchMock);

    const result = await client.list(1);

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.next).toEqual({ revalidate: 60 });
  });

  it('retries a transient 503 once and succeeds', async () => {
    const fetchMock = vi.fn<Fetcher>()
      .mockResolvedValueOnce(fetchResponse({ message: 'temporary' }, 503))
      .mockResolvedValueOnce(fetchResponse(kkListFixture));
    const client = new KkPhimClient(fetchMock);

    const result = await client.list(1);

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([501, 505, 404])('does not retry HTTP %s', async (status) => {
    const fetchMock = vi.fn<Fetcher>().mockResolvedValue(fetchResponse({ message: 'failure' }, status));
    const client = new KkPhimClient(fetchMock);

    const result = await client.list(1);

    expect(result.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies malformed JSON without retrying', async () => {
    const fetchMock = vi.fn<Fetcher>().mockResolvedValue(new Response('{broken', {
      headers: { 'content-type': 'application/json' },
    }));
    const client = new KkPhimClient(fetchMock);

    const result = await client.list(1);

    expect(result.error?.type).toBe('INVALID_RESPONSE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('KKPhim provider contract', () => {
  it('accepts only explicit list aliases and fails unsupported slugs safely', async () => {
    const listResult: KkPhimRequestResult<KkPhimListResponseDto> = {
      data: kkListFixture as KkPhimListResponseDto,
      error: null,
    };
    const client: KkPhimClientContract = {
      list: vi.fn().mockResolvedValue(listResult),
      listByType: vi.fn().mockResolvedValue(listResult),
      byGenre: vi.fn().mockResolvedValue(listResult),
      byCountry: vi.fn().mockResolvedValue(listResult),
      byYear: vi.fn().mockResolvedValue(listResult),
      search: vi.fn().mockResolvedValue(listResult),
      genres: vi.fn().mockResolvedValue({ data: null, error: null }),
      countries: vi.fn().mockResolvedValue({ data: null, error: null }),
      years: vi.fn().mockResolvedValue({ data: null, error: null }),
      detail: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const provider = new KkPhimMovieProvider(client);

    await expect(provider.getMovieListBySlug('hoat-hinh')).resolves.toMatchObject({ items: [{ slug: 'kkphim-fixture' }] });
    await expect(provider.getMovieListBySlug('subteam')).resolves.toMatchObject({ items: [], error: { type: 'INVALID_REQUEST' } });
    expect(client.listByType).toHaveBeenCalledWith('hoat-hinh', 1);
  });

  it('uses one explicit movie alias attempt and preserves the public requested slug', async () => {
    const detailResult: KkPhimRequestResult<KkPhimDetailResponseDto> = {
      data: kkDetailFixture as KkPhimDetailResponseDto,
      error: null,
    };
    const detail = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { provider: 'kkphim', type: 'NOT_FOUND', message: 'missing' } })
      .mockResolvedValueOnce(detailResult);
    const emptyList: KkPhimRequestResult<KkPhimListResponseDto> = { data: null, error: null };
    const client: KkPhimClientContract = {
      list: vi.fn().mockResolvedValue(emptyList), listByType: vi.fn().mockResolvedValue(emptyList),
      byGenre: vi.fn().mockResolvedValue(emptyList), byCountry: vi.fn().mockResolvedValue(emptyList),
      byYear: vi.fn().mockResolvedValue(emptyList), search: vi.fn().mockResolvedValue(emptyList),
      genres: vi.fn().mockResolvedValue({ data: null, error: null }), countries: vi.fn().mockResolvedValue({ data: null, error: null }),
      years: vi.fn().mockResolvedValue({ data: null, error: null }), detail,
    };
    const provider = new KkPhimMovieProvider(client);
    const requested = Object.keys(KKPHIM_SLUG_ALIASES)[0];

    const result = await provider.getMovieDetail(requested);

    expect(detail).toHaveBeenCalledTimes(2);
    expect(result.movie?.slug).toBe(requested);
    expect(result.movie?.providerIdentity?.provider).toBe('kkphim');
  });
});

describe('provider selection configuration', () => {
  it('defaults unknown values to VSMov and recognizes explicit KKPhim/canary values', () => {
    expect(resolveMovieProvider(undefined)).toBe('vsmov');
    expect(resolveMovieProvider('unexpected')).toBe('vsmov');
    expect(resolveMovieProvider('kkphim')).toBe('kkphim');
    expect(isMovieProviderCanaryEnabled('true')).toBe(true);
    expect(isMovieProviderCanaryEnabled('1')).toBe(true);
    expect(isMovieProviderCanaryEnabled('false')).toBe(false);
  });
});

describe('normalized provider canary comparison', () => {
  it('compares normalized list and detail shapes without comparing raw DTOs', () => {
    const list = mapKkListResponse(kkListFixture as KkPhimListResponseDto);
    const detail = mapKkDetailResponse(kkDetailFixture as KkPhimDetailResponseDto);

    expect(compareMovieListResults('list', 'kkphim', 'vsmov', list.items, list.items).mismatches).toEqual([]);
    expect(compareMovieDetails('detail', 'kkphim', 'vsmov', detail, detail).mismatches).toEqual([]);
  });
});
