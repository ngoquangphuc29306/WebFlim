import { cache } from 'react';
import {
  VSMovListResponse,
  VSMovTaxonomyResponse,
  VSMovDetailResponse,
  VSMovPagination,
  VSMovApiResult,
  VSMovApiError,
  MovieCardModel,
  MovieDetailModel,
  CategoryModel,
  CountryModel,
  YearOptionModel,
  CatalogRequest,
} from '@/types/movie';
import { normalizeMovie, normalizeMovieDetail } from './normalizers';

const BASE_URL = 'https://vsmov.com/api';
const DEFAULT_API_TIMEOUT_MS = 10_000;
const MAX_API_ATTEMPTS = 2;
const RETRY_DELAY_MS = 50;

const DEFAULT_PAGINATION: VSMovPagination = {
  totalItems: 0,
  totalItemsPerPage: 24,
  currentPage: 1,
  totalPages: 1,
};

export const POPULAR_COUNTRIES_FALLBACK: CountryModel[] = [
  { id: 'han-quoc', name: 'Hàn Quốc', slug: 'han-quoc' },
  { id: 'trung-quoc', name: 'Trung Quốc', slug: 'trung-quoc' },
  { id: 'au-my', name: 'Âu Mỹ', slug: 'au-my' },
  { id: 'nhat-ban', name: 'Nhật Bản', slug: 'nhat-ban' },
  { id: 'viet-nam', name: 'Việt Nam', slug: 'viet-nam' },
  { id: 'thai-lan', name: 'Thái Lan', slug: 'thai-lan' },
  { id: 'hong-kong', name: 'Hong Kong', slug: 'hong-kong' },
  { id: 'dai-loan', name: 'Đài Loan', slug: 'dai-loan' },
  { id: 'an-do', name: 'Ấn Độ', slug: 'an-do' },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function waitBeforeRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
}

function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timer),
  };
}

function logApiError(error: VSMovApiError): void {
  console.error('[VSMov API Error]', error.message);
}

/**
 * Reusable fetch helper with bounded timeout/retry, error handling, and caching.
 */
async function fetchJson<T>(
  url: string,
  revalidateSec = 300,
  options: { logFinalFailure?: boolean } = {}
): Promise<VSMovApiResult<T>> {
  const logFinalFailure = options.logFinalFailure ?? true;
  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt++) {
    const timeout = createTimeoutController(DEFAULT_API_TIMEOUT_MS);
    let failure: VSMovApiResult<T> | null = null;
    let shouldRetry = false;

    try {
      const res = await fetch(url, {
        next: { revalidate: revalidateSec },
        signal: timeout.controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VSMovApp/1.0',
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const error: VSMovApiError = {
          type: res.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR',
          message: `HTTP ${res.status} error requesting ${url}`,
          statusCode: res.status,
          url,
        };
        failure = { data: null, error };
        shouldRetry = isRetryableStatus(res.status);
      } else {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.toLowerCase().includes('application/json')) {
          const error: VSMovApiError = {
            type: 'INVALID_RESPONSE',
            message: `Expected JSON response but received ${contentType} for ${url}`,
            url,
          };
          if (logFinalFailure) logApiError(error);
          return { data: null, error };
        }

        try {
          const json = (await res.json()) as T;
          return { data: json, error: null };
        } catch (err: unknown) {
          const error: VSMovApiError = {
            type: 'INVALID_RESPONSE',
            message: `Invalid JSON response from ${url}: ${getErrorMessage(err)}`,
            url,
            cause: getErrorMessage(err),
          };
          if (logFinalFailure) logApiError(error);
          return { data: null, error };
        }
      }
    } catch (err: unknown) {
      const timedOut = timeout.controller.signal.aborted;
      const cause = getErrorMessage(err);
      const error: VSMovApiError = {
        type: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: timedOut
          ? `Request timed out after ${DEFAULT_API_TIMEOUT_MS}ms requesting ${url}`
          : `Network error fetching ${url}: ${cause}`,
        url,
        cause,
      };
      failure = { data: null, error };
      shouldRetry = true;
    } finally {
      timeout.cleanup();
    }

    if (failure && shouldRetry && attempt < MAX_API_ATTEMPTS) {
      await waitBeforeRetry();
      continue;
    }

    if (failure) {
      if (logFinalFailure) logApiError(failure.error as VSMovApiError);
      return failure;
    }
  }

  const error: VSMovApiError = {
    type: 'NETWORK_ERROR',
    message: `Request failed without a response for ${url}`,
    url,
  };
  if (logFinalFailure) logApiError(error);
  return { data: null, error };
}

/**
 * Fetch newest updated movies list
 */
export async function getLatestMovies(page = 1): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: VSMovApiError | null;
}> {
  const url = `${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 60);

  if (!data || !Array.isArray(data.items)) {
    return { items: [], pagination: DEFAULT_PAGINATION, error };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    error: null,
  };
}

/**
 * Fetch movie list by preset slug (e.g., phim-le, phim-bo, subteam, hoathinh, tvshows)
 */
export async function getMovieListBySlug(
  slug: string,
  page = 1
): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  title: string;
  error?: VSMovApiError | null;
}> {
  const titlesMap: Record<string, string> = {
    'phim-le': 'Phim Lẻ',
    'phim-bo': 'Phim Bộ',
    'subteam': 'Phim Vietsub Subteam',
    'phim-moi': 'Phim Mới Cập Nhật',
    'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
    'hoathinh': 'Phim Hoạt Hình',
    'tvshows': 'TV Shows',
  };

  const url = `${BASE_URL}/danh-sach/${slug}?page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 180);

  const fallbackTitle = titlesMap[slug] || 'Danh Sách Phim';

  if (!data || !Array.isArray(data.items)) {
    return {
      items: [],
      pagination: DEFAULT_PAGINATION,
      title: fallbackTitle,
      error,
    };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    title: fallbackTitle,
    error: null,
  };
}

/**
 * Fetch movies filtered by genre slug
 */
export async function getMoviesByGenre(
  slug: string,
  page = 1
): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: VSMovApiError | null;
}> {
  const url = `${BASE_URL}/the-loai/${slug}?page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

  if (!data || !Array.isArray(data.items)) {
    return { items: [], pagination: DEFAULT_PAGINATION, error };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    error: null,
  };
}

/**
 * Fetch movies filtered by country slug
 */
export async function getMoviesByCountry(
  slug: string,
  page = 1
): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: VSMovApiError | null;
}> {
  const url = `${BASE_URL}/quoc-gia/${slug}?page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

  if (!data || !Array.isArray(data.items)) {
    return { items: [], pagination: DEFAULT_PAGINATION, error };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    error: null,
  };
}

/**
 * Fetch movies filtered by release year
 */
export async function getMoviesByYear(
  year: string | number,
  page = 1
): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: VSMovApiError | null;
}> {
  const url = `${BASE_URL}/nam/${year}?page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

  if (!data || !Array.isArray(data.items)) {
    return { items: [], pagination: DEFAULT_PAGINATION, error };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    error: null,
  };
}

/**
 * Search movies by keyword
 */
export async function searchMovies(
  keyword: string,
  page = 1
): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  error?: VSMovApiError | null;
}> {
  const cleanKeyword = keyword ? keyword.trim() : '';
  if (!cleanKeyword) {
    return { items: [], pagination: DEFAULT_PAGINATION, error: null };
  }

  const url = `${BASE_URL}/tim-kiem?keyword=${encodeURIComponent(cleanKeyword)}&page=${page}`;
  const { data, error } = await fetchJson<VSMovListResponse>(url, 60);

  if (!data || !Array.isArray(data.items)) {
    return { items: [], pagination: DEFAULT_PAGINATION, error };
  }

  return {
    items: data.items.map(normalizeMovie),
    pagination: data.pagination || DEFAULT_PAGINATION,
    error: null,
  };
}

/**
 * Fetch detailed movie information and episode servers by movie slug (React request-memoized)
 */
export const getMovieDetail = cache(
  async (
    slug: string
  ): Promise<{ movie: MovieDetailModel | null; error?: VSMovApiError | null }> => {
    if (!slug) return { movie: null, error: null };
    const url = `${BASE_URL}/phim/${slug}`;
    const { data, error } = await fetchJson<VSMovDetailResponse>(url, 60, { logFinalFailure: false });

    let needFallback = false;
    let finalFallbackError: VSMovApiError | null = null;
    if (!data || !data.movie) {
      needFallback = true;
    } else if (data.episodes && data.episodes[0]?.server_data?.length) {
      // Check if primary server is missing early episodes (e.g., starts at episode 551 or 1156)
      const firstEpName = data.episodes[0].server_data[0]?.name || '';
      const match = firstEpName.match(/(\d+)/);
      if (match && parseInt(match[1], 10) > 20) {
        needFallback = true;
      }
    }

    if (needFallback) {
      const candidateSlugs = [slug];
      if (slug === 'one-piece') candidateSlugs.push('dao-hai-tac');
      if (slug === 'dao-hai-tac') candidateSlugs.push('one-piece');
      for (const candidate of candidateSlugs) {
        const fallbackUrl = `https://phimapi.com/phim/${candidate}`;
        const { data: fallbackData, error: fallbackError } = await fetchJson<VSMovDetailResponse>(fallbackUrl, 300, { logFinalFailure: false });
        if (fallbackError) finalFallbackError = fallbackError;
        if (fallbackData && fallbackData.movie && fallbackData.episodes?.length) {
          const normalized = normalizeMovieDetail(fallbackData);
          if (normalized) {
            return { movie: normalized, error: null };
          }
        }
      }
    }

    if (!data || !data.movie) {
      const finalError = finalFallbackError ?? error;
      if (finalError) logApiError(finalError);
      return { movie: null, error };
    }

    return {
      movie: normalizeMovieDetail(data),
      error: null,
    };
  }
);

/**
 * Fetch all categories / genres taxonomy (React request-memoized)
 */
export const getGenresList = cache(async (): Promise<CategoryModel[]> => {
  const url = `${BASE_URL}/the-loai`;
  const { data } = await fetchJson<VSMovTaxonomyResponse>(url, 86400);

  if (!data || !data.data || !Array.isArray(data.data.items)) {
    return [];
  }

  return data.data.items.map((item) => ({
    id: item._id,
    name: item.name,
    slug: item.slug,
  }));
});

/**
 * Fetch all countries taxonomy (React request-memoized)
 */
export const getCountriesList = cache(async (): Promise<CountryModel[]> => {
  const url = `${BASE_URL}/quoc-gia`;
  const { data } = await fetchJson<VSMovTaxonomyResponse>(url, 86400);

  if (!data || !data.data || !Array.isArray(data.data.items) || data.data.items.length === 0) {
    return POPULAR_COUNTRIES_FALLBACK;
  }

  return data.data.items.map((item) => ({
    id: item._id,
    name: item.name,
    slug: item.slug,
  }));
});

/**
 * Fetch all release years taxonomy from VSMov API /api/nam (React request-memoized)
 */
export const getYearsList = cache(async (): Promise<YearOptionModel[]> => {
  const url = `${BASE_URL}/nam`;
  const { data } = await fetchJson<VSMovTaxonomyResponse>(url, 86400);

  if (!data || !data.data || !Array.isArray(data.data.items) || data.data.items.length === 0) {
    return generateFallbackYears();
  }

  const parsed = data.data.items
    .map((item) => {
      const num = parseInt(item.name || item.slug, 10);
      return {
        id: item._id,
        name: item.name,
        slug: item.slug,
        year: isNaN(num) ? 0 : num,
      };
    })
    .filter((item) => item.year >= 1900 && item.year <= 2030)
    .sort((a, b) => b.year - a.year);

  return parsed.length > 0 ? parsed : generateFallbackYears();
});

function generateFallbackYears(): YearOptionModel[] {
  const currentYear = new Date().getFullYear();
  const years: YearOptionModel[] = [];
  for (let y = currentYear; y >= 2000; y--) {
    years.push({
      id: String(y),
      name: String(y),
      slug: String(y),
      year: y,
    });
  }
  return years;
}

/**
 * Fetches movies for discovery/catalog based on a resolved CatalogRequest
 */
export async function getCatalogMovies(request: CatalogRequest): Promise<{
  items: MovieCardModel[];
  pagination: VSMovPagination;
  title: string;
  error?: VSMovApiError | null;
}> {
  const { endpointType, slug, query } = request;
  const page = query.page || 1;

  if (endpointType === 'genre' && slug) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (query.country) params.set('country', query.country);
    if (query.year) params.set('year', String(query.year));
    if (query.type) params.set('type', query.type);

    const url = `${BASE_URL}/the-loai/${slug}?${params.toString()}`;
    const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

    if (!data || !Array.isArray(data.items)) {
      return { items: [], pagination: DEFAULT_PAGINATION, title: 'Khám Phá Phim', error };
    }

    return {
      items: data.items.map(normalizeMovie),
      pagination: data.pagination || DEFAULT_PAGINATION,
      title: 'Khám Phá Phim',
      error: null,
    };
  }

  if (endpointType === 'country' && slug) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (query.year) params.set('year', String(query.year));
    if (query.type) params.set('type', query.type);

    const url = `${BASE_URL}/quoc-gia/${slug}?${params.toString()}`;
    const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

    if (!data || !Array.isArray(data.items)) {
      return { items: [], pagination: DEFAULT_PAGINATION, title: 'Khám Phá Phim', error };
    }

    return {
      items: data.items.map(normalizeMovie),
      pagination: data.pagination || DEFAULT_PAGINATION,
      title: 'Khám Phá Phim',
      error: null,
    };
  }

  if (endpointType === 'year' && slug) {
    const url = `${BASE_URL}/nam/${slug}?page=${page}`;
    const { data, error } = await fetchJson<VSMovListResponse>(url, 300);

    if (!data || !Array.isArray(data.items)) {
      return { items: [], pagination: DEFAULT_PAGINATION, title: 'Khám Phá Phim', error };
    }

    return {
      items: data.items.map(normalizeMovie),
      pagination: data.pagination || DEFAULT_PAGINATION,
      title: 'Khám Phá Phim',
      error: null,
    };
  }

  if (endpointType === 'type' && slug) {
    return getMovieListBySlug(slug, page);
  }

  // Default: latest updated movies
  return getLatestMovies(page).then((res) => ({
    ...res,
    title: 'Tất Cả Phim Mới Cập Nhật',
  }));
}

/**
 * Helper to fetch aggregated homepage rails
 */
export async function getHomepageData() {
  const [latestRes, singleRes, seriesRes, subteamRes, hoathinhRes] = await Promise.all([
    getLatestMovies(1).catch(() => ({ items: [], pagination: DEFAULT_PAGINATION, error: null })),
    getMovieListBySlug('phim-le', 1).catch(() => ({ items: [], pagination: DEFAULT_PAGINATION, title: 'Phim Lẻ', error: null })),
    getMovieListBySlug('phim-bo', 1).catch(() => ({ items: [], pagination: DEFAULT_PAGINATION, title: 'Phim Bộ', error: null })),
    getMovieListBySlug('subteam', 1).catch(() => ({ items: [], pagination: DEFAULT_PAGINATION, title: 'Subteam', error: null })),
    getMoviesByGenre('hoat-hinh', 1).catch(() => ({ items: [], pagination: DEFAULT_PAGINATION, error: null })),
  ]);

  const heroMovies = latestRes.items.length > 0
    ? latestRes.items.slice(0, 5)
    : [...singleRes.items, ...seriesRes.items].slice(0, 5);

  return {
    heroMovies,
    latestMovies: latestRes.items.slice(0, 16),
    singleMovies: singleRes.items.slice(0, 16),
    seriesMovies: seriesRes.items.slice(0, 16),
    subteamMovies: subteamRes.items.slice(0, 16),
    hoathinhMovies: hoathinhRes.items.slice(0, 16),
  };
}
