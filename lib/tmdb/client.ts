import 'server-only';

import type { TmdbConfigurationDto, TmdbDiscoveryPageDto, TmdbMovieDto, TmdbSeasonDto, TmdbTvDto } from '@/lib/tmdb/dto';
import type { TmdbMediaType } from '@/types/tmdb';
import { tmdbFailure, type TmdbError, type TmdbResult } from '@/lib/tmdb/errors';

export const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
export const DEFAULT_TMDB_TIMEOUT_MS = 10_000;
export const MAX_TMDB_ATTEMPTS = 2;
export const TMDB_DETAILS_REVALIDATE_SECONDS = 21_600;
export const TMDB_CONFIGURATION_REVALIDATE_SECONDS = 604_800;
export const TMDB_TRENDING_REVALIDATE_SECONDS = 900;
export const TMDB_POPULAR_REVALIDATE_SECONDS = 3_600;
export const TMDB_TOP_RATED_REVALIDATE_SECONDS = 21_600;
export const TMDB_RECOMMENDATIONS_REVALIDATE_SECONDS = 21_600;
export const DEFAULT_TMDB_LANGUAGE = 'vi-VN';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Sleeper = (milliseconds: number) => Promise<void>;

export interface TmdbRequestOptions {
  signal?: AbortSignal;
  language?: string;
  appendToResponse?: string[];
  page?: number;
}

export interface TmdbClientContract {
  getMovie(id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbMovieDto>>;
  getTv(id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbTvDto>>;
  getTvSeason(seriesId: string | number, seasonNumber: number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbSeasonDto>>;
  getConfiguration(options?: TmdbRequestOptions): Promise<TmdbResult<TmdbConfigurationDto>>;
  getTrending(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>>;
  getPopular(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>>;
  getTopRated(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>>;
  getRecommendations(mediaType: TmdbMediaType, id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>>;
  getSimilar(mediaType: TmdbMediaType, id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>>;
}

export interface TmdbClientOptions {
  fetcher?: Fetcher;
  token?: string | undefined;
  language?: string | undefined;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: Sleeper;
}

function text(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function validId(value: string | number): string | null {
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) && Number(normalized) > 0 ? normalized : null;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.round(seconds * 1_000), 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(Math.max(0, date - Date.now()), 1_000) : undefined;
}

function timeoutSignal(timeoutMs: number, external?: AbortSignal): { signal: AbortSignal; didTimeout: () => boolean; cleanup: () => void } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  external?.addEventListener('abort', abortFromCaller, { once: true });
  if (external?.aborted) controller.abort();
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', abortFromCaller);
    },
  };
}

export class TmdbClient implements TmdbClientContract {
  private readonly fetcher: Fetcher;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly language: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly sleep: Sleeper;

  constructor(options: TmdbClientOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = TMDB_API_BASE_URL;
    this.token = text(options.token ?? process.env.TMDB_API_READ_ACCESS_TOKEN);
    this.language = text(options.language ?? process.env.TMDB_LANGUAGE) ?? DEFAULT_TMDB_LANGUAGE;
    this.timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TMDB_TIMEOUT_MS);
    this.maxAttempts = Math.max(1, Math.min(2, options.maxAttempts ?? MAX_TMDB_ATTEMPTS));
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 50);
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  getMovie(id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbMovieDto>> {
    const normalizedId = validId(id);
    return normalizedId
      ? this.requestJson(`/movie/${normalizedId}`, TMDB_DETAILS_REVALIDATE_SECONDS, options)
      : Promise.resolve(tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB movie ID must be a positive integer' }));
  }

  getTv(id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbTvDto>> {
    const normalizedId = validId(id);
    return normalizedId
      ? this.requestJson(`/tv/${normalizedId}`, TMDB_DETAILS_REVALIDATE_SECONDS, options)
      : Promise.resolve(tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB TV ID must be a positive integer' }));
  }

  getTvSeason(seriesId: string | number, seasonNumber: number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbSeasonDto>> {
    const normalizedId = validId(seriesId);
    if (!normalizedId || !Number.isInteger(seasonNumber) || seasonNumber < 0) {
      return Promise.resolve(tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB TV season identity is invalid' }));
    }
    return this.requestJson(`/tv/${normalizedId}/season/${seasonNumber}`, TMDB_DETAILS_REVALIDATE_SECONDS, options);
  }

  getConfiguration(options?: TmdbRequestOptions): Promise<TmdbResult<TmdbConfigurationDto>> {
    return this.requestJson('/configuration', TMDB_CONFIGURATION_REVALIDATE_SECONDS, options);
  }

  getTrending(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>> {
    return this.requestJson(`/trending/${mediaType}/week`, TMDB_TRENDING_REVALIDATE_SECONDS, options);
  }

  getPopular(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>> {
    return this.requestJson(`/${mediaType}/popular`, TMDB_POPULAR_REVALIDATE_SECONDS, options);
  }

  getTopRated(mediaType: TmdbMediaType, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>> {
    return this.requestJson(`/${mediaType}/top_rated`, TMDB_TOP_RATED_REVALIDATE_SECONDS, options);
  }

  getRecommendations(mediaType: TmdbMediaType, id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>> {
    const normalizedId = validId(id);
    return normalizedId
      ? this.requestJson(`/${mediaType}/${normalizedId}/recommendations`, TMDB_RECOMMENDATIONS_REVALIDATE_SECONDS, options)
      : Promise.resolve(tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB recommendation ID must be a positive integer' }));
  }

  getSimilar(mediaType: TmdbMediaType, id: string | number, options?: TmdbRequestOptions): Promise<TmdbResult<TmdbDiscoveryPageDto>> {
    const normalizedId = validId(id);
    return normalizedId
      ? this.requestJson(`/${mediaType}/${normalizedId}/similar`, TMDB_RECOMMENDATIONS_REVALIDATE_SECONDS, options)
      : Promise.resolve(tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB similar ID must be a positive integer' }));
  }

  private async requestJson<T>(path: string, revalidate: number, options?: TmdbRequestOptions): Promise<TmdbResult<T>> {
    if (!this.token) {
      return tmdbFailure({
        code: 'CONFIGURATION_ERROR',
        message: 'TMDB enrichment is unavailable because TMDB_API_READ_ACCESS_TOKEN is not configured',
      });
    }

    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, '')}`);
    url.searchParams.set('language', options?.language?.trim() || this.language);
    if (options?.page && Number.isInteger(options.page) && options.page > 0) {
      url.searchParams.set('page', String(options.page));
    }
    if (options?.appendToResponse && options.appendToResponse.length > 0) {
      url.searchParams.set('append_to_response', options.appendToResponse.join(','));
    }
    let lastError: TmdbError | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      if (options?.signal?.aborted) {
        return tmdbFailure({ code: 'ABORTED', message: 'TMDB request was cancelled', url: url.toString() });
      }
      const timeout = timeoutSignal(this.timeoutMs, options?.signal);
      try {
        const response = await this.fetcher(url, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          next: { revalidate },
          signal: timeout.signal,
        });

        if (!response.ok) {
          const retryAfterMs = response.status === 429 ? parseRetryAfter(response.headers.get('retry-after')) : undefined;
          lastError = {
            code: response.status === 429
              ? 'RATE_LIMITED'
              : response.status === 401 || response.status === 403
                ? 'AUTH_ERROR'
                : response.status === 404
                  ? 'NOT_FOUND'
                  : 'HTTP_ERROR',
            message: `TMDB HTTP ${response.status}`,
            statusCode: response.status,
            retryAfterMs,
            url: url.toString(),
          };
          if (isRetryableStatus(response.status) && attempt < this.maxAttempts) {
            await this.sleep(retryAfterMs ?? this.retryDelayMs);
            continue;
          }
          return tmdbFailure(lastError);
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (!contentType.includes('application/json')) {
          return tmdbFailure({
            code: 'INVALID_RESPONSE',
            message: `TMDB returned non-JSON content type: ${contentType || 'unknown'}`,
            url: url.toString(),
          });
        }

        try {
          return { data: await response.json() as T, error: null };
        } catch (error) {
          return tmdbFailure({
            code: 'INVALID_RESPONSE',
            message: 'TMDB returned malformed JSON',
            url: url.toString(),
            cause: errorMessage(error),
          });
        }
      } catch (error) {
        if (options?.signal?.aborted) {
          return tmdbFailure({ code: 'ABORTED', message: 'TMDB request was cancelled', url: url.toString() });
        }
        lastError = {
          code: timeout.didTimeout() ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: timeout.didTimeout()
            ? `TMDB request timed out after ${this.timeoutMs}ms`
            : 'TMDB network request failed',
          url: url.toString(),
          cause: errorMessage(error),
        };
        if (attempt < this.maxAttempts) {
          await this.sleep(this.retryDelayMs);
          continue;
        }
      } finally {
        timeout.cleanup();
      }
    }

    return tmdbFailure(lastError ?? { code: 'NETWORK_ERROR', message: 'TMDB request failed' });
  }
}
