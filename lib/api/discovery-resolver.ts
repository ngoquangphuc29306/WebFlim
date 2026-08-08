import { CatalogFilters, CatalogResolverResult } from '@/types/movie';

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
 * Resolves active filters into a deterministic VSMov API request strategy.
 * Prevents silent dropping of unsupported query parameter combinations.
 */
export function resolveCatalogRequest(filters: CatalogFilters): CatalogResolverResult {
  const { genre, country, year, type, page = 1 } = filters;

  // 1. Genre Priority: /api/the-loai/{genre}?country=...&year=...&type=...&page=...
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

  // 2. Country Priority: /api/quoc-gia/{country}?year=...&type=...&page=...
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

  // 3. Year Priority: /api/nam/{year}?page=...
  if (year) {
    // VSMov server endpoint /api/nam/{year} does not support type parameter without genre/country
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

  // 4. Type Priority: /api/danh-sach/phim-bo or /api/danh-sach/phim-le
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

  // 5. Default Unfiltered: /api/danh-sach/phim-moi-cap-nhat
  return {
    supported: true,
    request: {
      endpointType: 'default',
      slug: 'phim-moi-cap-nhat',
      query: { page },
    },
  };
}
