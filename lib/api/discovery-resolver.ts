import {
  CatalogFilters,
  CatalogResolverResult,
  MovieBrowseFilter,
  MovieBrowseLanguage,
  MovieBrowseOrder,
  MovieBrowseSort,
  MovieBrowseType,
  MovieProviderCapabilities,
} from '@/types/movie';

const MIN_RELEASE_YEAR = 1900;
const maxReleaseYear = () => new Date().getFullYear() + 1;
const browseTypes: readonly MovieBrowseType[] = ['phim-le', 'phim-bo', 'tv-shows', 'hoat-hinh'];
const browseLanguages: readonly MovieBrowseLanguage[] = ['vietsub', 'thuyet-minh', 'long-tieng'];
const browseSorts: readonly MovieBrowseSort[] = ['updated', 'created', 'year'];
const browseOrders: readonly MovieBrowseOrder[] = ['asc', 'desc'];

function cleanValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validYear(value: string | undefined): number | undefined {
  if (!value || !/^\d{4}$/.test(value)) return undefined;
  const year = Number(value);
  return year >= MIN_RELEASE_YEAR && year <= maxReleaseYear() ? year : undefined;
}

function enumValue<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && allowed.includes(value as T) ? value as T : undefined;
}

function normalizeBrowseType(value: string | undefined): MovieBrowseType | undefined {
  if (value === 'series') return 'phim-bo';
  if (value === 'single') return 'phim-le';
  return enumValue(value, browseTypes);
}

/** Parse the public /kham-pha query contract into one normalized filter state. */
export function parseMovieBrowseFilter(searchParams: {
  [key: string]: string | string[] | undefined;
}): MovieBrowseFilter {
  const year = validYear(cleanValue(searchParams.year));
  const yearFrom = validYear(cleanValue(searchParams.yearFrom));
  const yearTo = validYear(cleanValue(searchParams.yearTo));
  const validRange = !year && yearFrom && yearTo && yearFrom <= yearTo
    ? { yearFrom, yearTo }
    : {};
  const parsedPage = Number(cleanValue(searchParams.page));

  return {
    type: normalizeBrowseType(cleanValue(searchParams.type)),
    genre: cleanValue(searchParams.genre),
    country: cleanValue(searchParams.country),
    year,
    ...validRange,
    language: enumValue(cleanValue(searchParams.language), browseLanguages),
    sort: enumValue(cleanValue(searchParams.sort), browseSorts),
    order: enumValue(cleanValue(searchParams.order), browseOrders),
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };
}

/** Build the canonical public URL without provider-specific query names. */
export function buildMovieBrowseUrl(filter: MovieBrowseFilter): string {
  const params = new URLSearchParams();
  if (filter.type) params.set('type', filter.type);
  if (filter.genre) params.set('genre', filter.genre);
  if (filter.country) params.set('country', filter.country);
  if (filter.year) params.set('year', String(filter.year));
  else if (filter.yearFrom && filter.yearTo && filter.yearFrom <= filter.yearTo) {
    params.set('yearFrom', String(filter.yearFrom));
    params.set('yearTo', String(filter.yearTo));
  }
  if (filter.language) params.set('language', filter.language);
  if (filter.sort) params.set('sort', filter.sort);
  if (filter.order) params.set('order', filter.order);
  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  const query = params.toString();
  return query ? `/kham-pha?${query}` : '/kham-pha';
}

/** Filter changes are navigation changes and therefore always restart at page one. */
export function withBrowseFilterChange(
  current: MovieBrowseFilter,
  change: Partial<MovieBrowseFilter>,
): MovieBrowseFilter {
  const next = { ...current, ...change };
  const changedNonPageKey = Object.keys(change).some((key) => key !== 'page' && (
    current[key as keyof MovieBrowseFilter] !== next[key as keyof MovieBrowseFilter]
  ));
  return { ...next, page: changedNonPageKey ? 1 : Math.max(1, next.page ?? 1) };
}

export function countActiveBrowseFilters(filter: MovieBrowseFilter): number {
  return [
    filter.type,
    filter.genre,
    filter.country,
    filter.year ?? (filter.yearFrom && filter.yearTo ? `${filter.yearFrom}-${filter.yearTo}` : undefined),
    filter.language,
    filter.sort,
    filter.order,
  ].filter(Boolean).length;
}

/**
 * Keep UI capability messaging provider-neutral. Adapters remain responsible
 * for their actual upstream query serialization and any narrower validation.
 */
export function getUnsupportedBrowseFilterReason(
  filter: MovieBrowseFilter,
  capabilities: MovieProviderCapabilities,
): string | undefined {
  if ((filter.yearFrom || filter.yearTo) && (!filter.yearFrom || !filter.yearTo || filter.yearFrom > filter.yearTo)) {
    return 'Khoảng năm không hợp lệ. Hãy nhập đủ năm bắt đầu và năm kết thúc.';
  }
  if (filter.type && !capabilities.browseTypes.includes(filter.type)) {
    return 'Nguồn dữ liệu hiện tại chưa hỗ trợ loại phim này.';
  }
  if ((filter.yearFrom || filter.yearTo) && !capabilities.yearRange) {
    return 'Nguồn dữ liệu hiện tại chưa hỗ trợ lọc theo khoảng năm.';
  }
  if (filter.language && !capabilities.languageFilter) {
    return 'Nguồn dữ liệu hiện tại chưa hỗ trợ lọc theo ngôn ngữ.';
  }
  if ((filter.sort || filter.order) && !capabilities.sorting) {
    return 'Nguồn dữ liệu hiện tại chưa hỗ trợ sắp xếp tùy chọn.';
  }
  return undefined;
}

/**
 * Parses raw search parameters from URL into typed CatalogFilters.
 * Handles validation and sanitization.
 */
export function parseCatalogFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): CatalogFilters {
  const genre =
    typeof searchParams.genre === 'string' && searchParams.genre.trim()
      ? searchParams.genre.trim()
      : undefined;

  const country =
    typeof searchParams.country === 'string' && searchParams.country.trim()
      ? searchParams.country.trim()
      : undefined;

  let year: number | undefined = undefined;
  if (typeof searchParams.year === 'string' && searchParams.year.trim()) {
    const parsedYear = parseInt(searchParams.year, 10);
    if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= new Date().getFullYear() + 1) {
      year = parsedYear;
    }
  }

  let type: 'series' | 'single' | undefined = undefined;
  if (searchParams.type === 'series' || searchParams.type === 'single') {
    type = searchParams.type;
  }

  let page = 1;
  if (typeof searchParams.page === 'string' && searchParams.page.trim()) {
    const parsedPage = parseInt(searchParams.page, 10);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }

  return { genre, country, year, type, page };
}

/**
 * Builds canonical shareable discovery URL string from CatalogFilters.
 */
export function buildCatalogUrl(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.country) params.set('country', filters.country);
  if (filters.year) params.set('year', String(filters.year));
  if (filters.type) params.set('type', filters.type);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));

  const queryString = params.toString();
  return queryString ? `/kham-pha?${queryString}` : '/kham-pha';
}

/**
 * Counts the number of active filter criteria (excluding pagination page).
 */
export function countActiveFilters(filters: CatalogFilters): number {
  let count = 0;
  if (filters.genre) count++;
  if (filters.country) count++;
  if (filters.year) count++;
  if (filters.type) count++;
  return count;
}

/**
 * Resolves legacy catalog filters into a deterministic provider request strategy.
 * Prevents silent dropping of unsupported query parameter combinations.
 */
export function resolveCatalogRequest(filters: CatalogFilters): CatalogResolverResult {
  const { genre, country, year, type, page = 1 } = filters;

  // 1. Genre priority; the active adapter owns the upstream serialization.
  if (genre) {
    return {
      supported: true,
      request: {
        endpointType: 'genre',
        slug: genre,
        query: { country, year, type, page },
      },
    };
  }

  // 2. Country priority; the active adapter owns the upstream serialization.
  if (country) {
    return {
      supported: true,
      request: {
        endpointType: 'country',
        slug: country,
        query: { year, type, page },
      },
    };
  }

  // 3. Year priority.
  if (year) {
    // Keep the public legacy combination explicit rather than silently dropping type.
    if (type) {
      return {
        supported: false,
        reason:
          'Tổ hợp Năm sản xuất và Loại phim chưa được nguồn dữ liệu hỗ trợ trực tiếp. Vui lòng chọn thêm Thể loại hoặc Quốc gia.',
      };
    }

    return {
      supported: true,
      request: {
        endpointType: 'year',
        slug: String(year),
        query: { page },
      },
    };
  }

  // 4. Type priority.
  if (type) {
    return {
      supported: true,
      request: {
        endpointType: 'type',
        slug: type === 'series' ? 'phim-bo' : 'phim-le',
        query: { page },
      },
    };
  }

  // 5. Default unfiltered catalog.
  return {
    supported: true,
    request: {
      endpointType: 'default',
      slug: 'phim-moi-cap-nhat',
      query: { page },
    },
  };
}
