import type { ProviderError } from '@/types/movie';
import type {
  KkPhimDetailResponseDto,
  KkPhimListResponseDto,
  KkPhimTaxonomyResponseDto,
  KkPhimYearResponseDto,
} from '@/types/kkphim';

export const KKPHiM_BASE_URL = 'https://phimapi.com';
export const DEFAULT_KKPHIM_TIMEOUT_MS = 10_000;
export const MAX_KKPHIM_ATTEMPTS = 2;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface KkPhimClientContract {
  list(page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  listByType(type: string, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  byGenre(slug: string, page: number, country?: string, year?: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  byCountry(slug: string, page: number, year?: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  byYear(year: number, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  search(keyword: string, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>>;
  genres(): Promise<KkPhimRequestResult<KkPhimTaxonomyResponseDto>>;
  countries(): Promise<KkPhimRequestResult<KkPhimTaxonomyResponseDto>>;
  years(): Promise<KkPhimRequestResult<KkPhimYearResponseDto>>;
  detail(slug: string): Promise<KkPhimRequestResult<KkPhimDetailResponseDto>>;
}

export type KkPhimRequestResult<T> = {
  data: T | null;
  error: ProviderError | null;
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableStatus(status: number): boolean {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function timeoutController(timeoutMs: number): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, cleanup: () => clearTimeout(timer) };
}

export class KkPhimClient implements KkPhimClientContract {
  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly baseUrl = KKPHiM_BASE_URL
  ) {}

  list(page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(`/v1/api/danh-sach?page=${Math.max(1, page)}`, 60);
  }

  listByType(type: string, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(`/v1/api/danh-sach/${encodeURIComponent(type)}?page=${Math.max(1, page)}`, 180);
  }

  byGenre(
    slug: string,
    page: number,
    country?: string,
    year?: number
  ): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(
      this.withQuery(`/v1/api/the-loai/${encodeURIComponent(slug)}`, { page, country, year }),
      300
    );
  }

  byCountry(
    slug: string,
    page: number,
    year?: number
  ): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(
      this.withQuery(`/v1/api/quoc-gia/${encodeURIComponent(slug)}`, { page, year }),
      300
    );
  }

  byYear(year: number, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(`/v1/api/nam/${year}?page=${Math.max(1, page)}`, 300);
  }

  search(keyword: string, page: number): Promise<KkPhimRequestResult<KkPhimListResponseDto>> {
    return this.requestJson(
      this.withQuery('/v1/api/tim-kiem', { keyword, page, limit: 24 }),
      60
    );
  }

  genres(): Promise<KkPhimRequestResult<KkPhimTaxonomyResponseDto>> {
    return this.requestJson('/the-loai', 86400);
  }

  countries(): Promise<KkPhimRequestResult<KkPhimTaxonomyResponseDto>> {
    return this.requestJson('/quoc-gia', 86400);
  }

  years(): Promise<KkPhimRequestResult<KkPhimYearResponseDto>> {
    return this.requestJson('/nam-phat-hanh', 86400);
  }

  detail(slug: string): Promise<KkPhimRequestResult<KkPhimDetailResponseDto>> {
    return this.requestJson(`/v1/api/phim/${encodeURIComponent(slug)}`, 60);
  }

  private withQuery(path: string, values: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    return `${path}?${params.toString()}`;
  }

  private async requestJson<T>(path: string, revalidate: number): Promise<KkPhimRequestResult<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastFailure: ProviderError | null = null;

    for (let attempt = 1; attempt <= MAX_KKPHIM_ATTEMPTS; attempt++) {
      const timeout = timeoutController(DEFAULT_KKPHIM_TIMEOUT_MS);
      try {
        const response = await this.fetcher(url, {
          next: { revalidate },
          signal: timeout.controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          lastFailure = {
            provider: 'kkphim',
            type: response.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR',
            message: `KKPhim HTTP ${response.status}`,
            statusCode: response.status,
            url,
          };
          if (isRetryableStatus(response.status) && attempt < MAX_KKPHIM_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            continue;
          }
          return { data: null, error: lastFailure };
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() || '';
        if (!contentType.includes('application/json')) {
          return {
            data: null,
            error: {
              provider: 'kkphim',
              type: 'INVALID_RESPONSE',
              message: `KKPhim returned non-JSON content type: ${contentType || 'unknown'}`,
              url,
            },
          };
        }

        try {
          return { data: (await response.json()) as T, error: null };
        } catch (error: unknown) {
          return {
            data: null,
            error: {
              provider: 'kkphim',
              type: 'INVALID_RESPONSE',
              message: 'KKPhim returned malformed JSON',
              url,
              cause: messageFrom(error),
            },
          };
        }
      } catch (error: unknown) {
        const timedOut = timeout.controller.signal.aborted;
        lastFailure = {
          provider: 'kkphim',
          type: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: timedOut ? `KKPhim request timed out after ${DEFAULT_KKPHIM_TIMEOUT_MS}ms` : 'KKPhim network request failed',
          url,
          cause: messageFrom(error),
        };
        if (attempt < MAX_KKPHIM_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }
      } finally {
        timeout.cleanup();
      }
    }

    return {
      data: null,
      error: lastFailure ?? {
        provider: 'kkphim',
        type: 'NETWORK_ERROR',
        message: 'KKPhim request failed',
        url,
      },
    };
  }
}
