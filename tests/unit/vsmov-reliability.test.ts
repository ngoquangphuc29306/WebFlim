import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VSMovDetailResponse } from '@/types/movie';
import { getLatestMovies, getMovieDetail } from '@/lib/api/vsmov';

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const detailResponse = (slug: string, firstEpisodeName = 'Tập 1'): VSMovDetailResponse => ({
  status: true,
  movie: {
    _id: `${slug}-id`,
    name: slug,
    slug,
    poster_url: 'poster.jpg',
    thumb_url: 'thumb.jpg',
  },
  episodes: [
    {
      server_name: 'Server 1',
      server_data: [
        {
          name: firstEpisodeName,
          slug: 'tap-1',
          link_embed: 'https://embed.example/tap-1',
        },
      ],
    },
  ],
});

describe('VSMov request reliability', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchImplementation>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchImplementation>();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns data with one attempt and preserves Next.js revalidation options', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: true, items: [] }));

    const result = await getLatestMovies(1);
    const requestOptions = fetchMock.mock.calls[0]?.[1];

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestOptions?.next).toEqual({ revalidate: 60 });
    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it('classifies repeated timeouts and retries exactly once', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async (_input, init) => {
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('The operation was aborted.', 'AbortError')),
          { once: true }
        );
      });
      throw new Error('unreachable');
    });

    const resultPromise = getLatestMovies(1);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.error?.type).toBe('TIMEOUT');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a temporary 503 once and returns the successful response', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'temporary outage' }, 503))
      .mockResolvedValueOnce(jsonResponse({ status: true, items: [] }));

    const result = await getLatestMovies(1);

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([500, 502, 504])('retries HTTP %s once', async (statusCode) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'temporary outage' }, statusCode))
      .mockResolvedValueOnce(jsonResponse({ status: true, items: [] }));

    const result = await getLatestMovies(1);

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops after two attempts when 503 continues', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'temporary outage' }, 503))
      .mockResolvedValueOnce(jsonResponse({ message: 'still unavailable' }, 503));

    const result = await getLatestMovies(1);

    expect(result.error).toMatchObject({ type: 'HTTP_ERROR', statusCode: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404 response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404));

    const result = await getLatestMovies(1);

    expect(result.error).toMatchObject({ type: 'NOT_FOUND', statusCode: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([501, 505])('does not retry HTTP %s', async (statusCode) => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'unsupported server behavior' }, statusCode));

    const result = await getLatestMovies(1);

    expect(result.error).toMatchObject({ type: 'HTTP_ERROR', statusCode });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry an invalid content type or invalid JSON response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>upstream error</html>', {
        headers: { 'content-type': 'text/html' },
      })
    );

    const contentTypeResult = await getLatestMovies(1);

    expect(contentTypeResult.error?.type).toBe('INVALID_RESPONSE');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      new Response('{invalid-json', {
        headers: { 'content-type': 'application/json' },
      })
    );

    const jsonResult = await getLatestMovies(1);

    expect(jsonResult.error?.type).toBe('INVALID_RESPONSE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a network exception once', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('socket reset'))
      .mockResolvedValueOnce(jsonResponse({ status: true, items: [] }));

    const result = await getLatestMovies(1);

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('VSMov detail fallback reliability', () => {
  let fetchMock: ReturnType<typeof vi.fn<FetchImplementation>>;

  beforeEach(() => {
    fetchMock = vi.fn<FetchImplementation>();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not call PhimAPI when the primary VSMov detail succeeds', async () => {
    fetchMock.mockResolvedValue(jsonResponse(detailResponse('primary-success')));

    const result = await getMovieDetail('primary-success');

    expect(result.movie?.slug).toBe('primary-success');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('vsmov.com');
  });

  it('calls the existing fallback once for suspicious early episode data', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input).includes('vsmov.com')) {
        return jsonResponse(detailResponse('primary-suspicious', 'Tập 551'));
      }
      return jsonResponse(detailResponse('fallback-success'));
    });

    const result = await getMovieDetail('primary-suspicious');

    expect(result.movie?.slug).toBe('fallback-success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('phimapi.com');
  });

  it('does not log an intermediate VSMov 404 when the PhimAPI fallback succeeds', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input).includes('vsmov.com')) return jsonResponse({ status: false }, 404);
      return jsonResponse(detailResponse('fallback-success'));
    });

    const result = await getMovieDetail('fallback-success');

    expect(result.movie?.slug).toBe('fallback-success');
    expect(console.error).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('logs the final detail failure after the fallback chain is exhausted', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: false }, 404));

    const result = await getMovieDetail('definitely-not-a-real-movie');

    expect(result.movie).toBeNull();
    expect(result.error).toMatchObject({ type: 'NOT_FOUND', statusCode: 404 });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      '[VSMov API Error]',
      expect.stringContaining('https://phimapi.com/phim/definitely-not-a-real-movie')
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bounds alias fallback attempts and cannot recurse forever', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: false }, 404));

    const result = await getMovieDetail('one-piece');

    expect(result.movie).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/one-piece');
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/dao-hai-tac');
  });
});
