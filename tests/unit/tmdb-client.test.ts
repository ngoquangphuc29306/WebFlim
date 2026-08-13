import { afterEach, describe, expect, it, vi } from 'vitest';
import configurationFixture from '@/tests/fixtures/tmdb/configuration.json';
import movieFixture from '@/tests/fixtures/tmdb/movie.json';
import seasonFixture from '@/tests/fixtures/tmdb/season.json';
import tvFixture from '@/tests/fixtures/tmdb/tv.json';
import {
  TMDB_CONFIGURATION_REVALIDATE_SECONDS,
  TMDB_DETAILS_REVALIDATE_SECONDS,
  TmdbClient,
} from '@/lib/tmdb/client';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

describe('TmdbClient', () => {
  afterEach(() => vi.useRealTimers());

  it('sends server Bearer authentication, Vietnamese language, and detail cache policy', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(jsonResponse(movieFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token' });

    const result = await client.getMovie('603');
    const [url, init] = fetcher.mock.calls[0] ?? [];

    expect(result.error).toBeNull();
    expect(String(url)).toBe('https://api.themoviedb.org/3/movie/603?language=vi-VN');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-only-token', Accept: 'application/json' });
    expect(init?.next).toEqual({ revalidate: TMDB_DETAILS_REVALIDATE_SECONDS });
  });

  it('uses one official detail request bundle for credits and videos', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(jsonResponse(movieFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token' });

    await client.getMovie('603', { appendToResponse: ['credits', 'videos'] });

    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.themoviedb.org/3/movie/603?language=vi-VN&append_to_response=credits%2Cvideos'
    );
  });

  it('routes TV and season identities to their official endpoints and caches configuration separately', async () => {
    const fetcher = vi.fn<Fetcher>()
      .mockResolvedValueOnce(jsonResponse(tvFixture))
      .mockResolvedValueOnce(jsonResponse(seasonFixture))
      .mockResolvedValueOnce(jsonResponse(configurationFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token' });

    await client.getTv(1396);
    await client.getTvSeason(1396, 1);
    await client.getConfiguration();

    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/tv/1396?language=vi-VN');
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('/tv/1396/season/1?language=vi-VN');
    expect(fetcher.mock.calls[2]?.[1]?.next).toEqual({ revalidate: TMDB_CONFIGURATION_REVALIDATE_SECONDS });
  });

  it('returns a typed configuration error without issuing a request when the token is missing', async () => {
    const fetcher = vi.fn<Fetcher>();
    const client = new TmdbClient({ fetcher, token: '' });

    const result = await client.getMovie(603);

    expect(result).toMatchObject({ data: null, error: { code: 'CONFIGURATION_ERROR' } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([500, 502, 503, 504])('retries transient HTTP %s once', async (status) => {
    const fetcher = vi.fn<Fetcher>()
      .mockResolvedValueOnce(jsonResponse({ status_message: 'temporary' }, status))
      .mockResolvedValueOnce(jsonResponse(movieFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token', retryDelayMs: 0 });

    const result = await client.getMovie(603);

    expect(result.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a bounded 429 response once using Retry-After', async () => {
    const sleep = vi.fn(async () => undefined);
    const fetcher = vi.fn<Fetcher>()
      .mockResolvedValueOnce(jsonResponse({ status_message: 'slow down' }, 429, { 'retry-after': '10' }))
      .mockResolvedValueOnce(jsonResponse(movieFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token', sleep });

    const result = await client.getMovie(603);

    expect(result.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it.each([401, 404, 501, 505])('does not retry non-transient HTTP %s', async (status) => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(jsonResponse({ status_message: 'failure' }, status));
    const client = new TmdbClient({ fetcher, token: 'test-only-token', retryDelayMs: 0 });

    const result = await client.getMovie(603);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.error?.code).toBe(status === 401 ? 'AUTH_ERROR' : status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR');
  });

  it('does not retry malformed or non-JSON responses', async () => {
    const fetcher = vi.fn<Fetcher>()
      .mockResolvedValueOnce(new Response('<html>nope</html>', { headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(new Response('{invalid', { headers: { 'content-type': 'application/json' } }));
    const client = new TmdbClient({ fetcher, token: 'test-only-token' });

    const contentType = await client.getMovie(603);
    const malformedJson = await client.getMovie(603);

    expect(contentType.error?.code).toBe('INVALID_RESPONSE');
    expect(malformedJson.error?.code).toBe('INVALID_RESPONSE');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('classifies a timed-out request and retries exactly once', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<Fetcher>().mockImplementation((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    const client = new TmdbClient({ fetcher, token: 'test-only-token', timeoutMs: 10, retryDelayMs: 0 });

    const pending = client.getMovie(603);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.error?.code).toBe('TIMEOUT');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a network failure once and preserves caller cancellation as a typed aborted result', async () => {
    const fetcher = vi.fn<Fetcher>()
      .mockRejectedValueOnce(new Error('socket reset'))
      .mockResolvedValueOnce(jsonResponse(movieFixture));
    const client = new TmdbClient({ fetcher, token: 'test-only-token', retryDelayMs: 0 });

    const retried = await client.getMovie(603);
    const controller = new AbortController();
    controller.abort();
    const aborted = await client.getMovie(603, { signal: controller.signal });

    expect(retried.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(aborted.error?.code).toBe('ABORTED');
  });
});
