import type { CatalogRequest } from '@/types/movie';
import type { MovieProvider, MovieListResult, MovieListWithTitleResult, MovieDetailResult } from '@/lib/api/providers/movie-provider';
import {
  asPage,
  cleanSlug,
  emptyHomepageData,
  emptyPagination,
  invalidProviderError,
  mergeHomepageData,
} from '@/lib/api/providers/movie-provider';
import { KkPhimClient, type KkPhimClientContract } from '@/lib/api/providers/kkphim/client';
import {
  mapKkDetailResponse,
  mapKkListResponse,
  mapKkCategory,
  mapKkCountry,
  providerErrorForKkResponse,
} from '@/lib/api/providers/kkphim/mapper';
import type { KkPhimTaxonomyDto } from '@/types/kkphim';

const LIST_TITLES: Record<string, string> = {
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Phim hoạt hình',
  'tv-shows': 'TV Shows',
  'phim-chieu-rap': 'Phim chiếu rạp',
  'phim-moi': 'Phim mới cập nhật',
  'phim-moi-cap-nhat': 'Phim mới cập nhật',
};

const TYPE_SLUGS: Record<string, string> = {
  'phim-le': 'phim-le',
  'phim-bo': 'phim-bo',
  hoathinh: 'hoat-hinh',
  'hoat-hinh': 'hoat-hinh',
  tvshows: 'tv-shows',
  'tv-shows': 'tv-shows',
  'phim-chieu-rap': 'phim-chieu-rap',
};

/** Explicit compatibility aliases observed during WEB-K1; no fuzzy matching. */
export const KKPHIM_SLUG_ALIASES: Record<string, string> = {
  'hai-trai-tim-2026': 'hai-trai-tim',
  'minions-va-quai-vat': 'minions-quai-vat',
  'nhan-ngu': 'nhan-ngu-2026',
  'cuoc-dua-sinh-tu-phan-1': 'cuoc-dua-sinh-tu',
  'tinh-yeu-dong-dieu': 'dong-dieu-yeu-thuong',
};

function titleFor(slug: string): string {
  return LIST_TITLES[slug] ?? 'Danh sách phim';
}

function failedList(error: ReturnType<typeof providerErrorForKkResponse>): MovieListResult {
  return { items: [], pagination: emptyPagination(), error };
}

function failedDetail(error: ReturnType<typeof providerErrorForKkResponse>): MovieDetailResult {
  return { movie: null, error };
}

function mapTaxonomy(items: KkPhimTaxonomyDto[] | null | undefined) {
  return Array.isArray(items) ? items.map(mapKkCategory).filter((item): item is NonNullable<ReturnType<typeof mapKkCategory>> => item !== null) : [];
}

export class KkPhimMovieProvider implements MovieProvider {
  readonly key = 'kkphim' as const;

  constructor(private readonly client: KkPhimClientContract = new KkPhimClient()) {}

  async getLatestMovies(page = 1): Promise<MovieListResult> {
    const response = await this.client.list(asPage(page));
    if (!response.data) return failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no catalog data'));
    return { ...mapKkListResponse(response.data), error: null };
  }

  async getMovieListBySlug(slug: string, page = 1): Promise<MovieListWithTitleResult> {
    const requested = cleanSlug(slug);
    if (!requested) {
      return { items: [], pagination: emptyPagination(), title: 'Danh sách phim', error: invalidProviderError('kkphim', 'Movie list slug is required') };
    }
    const typeSlug = TYPE_SLUGS[requested];
    if (requested === 'phim-moi' || requested === 'phim-moi-cap-nhat') {
      const result = await this.getLatestMovies(page);
      return { ...result, title: titleFor(requested) };
    }
    if (!typeSlug) {
      return {
        items: [],
        pagination: emptyPagination(),
        title: titleFor(requested),
        error: invalidProviderError('kkphim', `KKPhim list slug is not supported: ${requested}`),
      };
    }
    const response = await this.client.listByType(typeSlug, asPage(page));
    if (!response.data) {
      return { ...failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no list data')), title: titleFor(requested) };
    }
    return { ...mapKkListResponse(response.data), title: titleFor(requested), error: null };
  }

  async getMoviesByGenre(slug: string, page = 1): Promise<MovieListResult> {
    const requested = cleanSlug(slug);
    if (!requested) return failedList(invalidProviderError('kkphim', 'Genre slug is required'));
    const response = await this.client.byGenre(requested, asPage(page));
    if (!response.data) return failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no genre data'));
    return { ...mapKkListResponse(response.data), error: null };
  }

  async getMoviesByCountry(slug: string, page = 1): Promise<MovieListResult> {
    const requested = cleanSlug(slug);
    if (!requested) return failedList(invalidProviderError('kkphim', 'Country slug is required'));
    const response = await this.client.byCountry(requested, asPage(page));
    if (!response.data) return failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no country data'));
    return { ...mapKkListResponse(response.data), error: null };
  }

  async getMoviesByYear(year: string | number, page = 1): Promise<MovieListResult> {
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 1900) {
      return failedList(invalidProviderError('kkphim', 'A valid release year is required'));
    }
    const response = await this.client.byYear(parsedYear, asPage(page));
    if (!response.data) return failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no year data'));
    return { ...mapKkListResponse(response.data), error: null };
  }

  async searchMovies(keyword: string, page = 1): Promise<MovieListResult> {
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) return { items: [], pagination: emptyPagination(), error: null };
    const response = await this.client.search(cleanKeyword, asPage(page));
    if (!response.data) return failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no search data'));
    return { ...mapKkListResponse(response.data), error: null };
  }

  async getGenresList() {
    const response = await this.client.genres();
    return mapTaxonomy(response.data?.data?.items);
  }

  async getCountriesList() {
    const response = await this.client.countries();
    return Array.isArray(response.data?.data?.items)
      ? response.data.data.items.map(mapKkCountry).filter((item): item is NonNullable<ReturnType<typeof mapKkCountry>> => item !== null)
      : [];
  }

  async getYearsList() {
    const response = await this.client.years();
    const items = response.data?.data?.items;
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const rawYear = item.year ?? item.name ?? item.slug;
      const year = Number(rawYear);
      return {
        id: item.id ?? item._id ?? item.slug ?? String(rawYear ?? ''),
        name: String(item.name ?? rawYear ?? ''),
        slug: String(item.slug ?? rawYear ?? ''),
        year: Number.isFinite(year) ? year : 0,
      };
    }).filter((item) => item.year >= 1900 && item.year <= new Date().getFullYear() + 1)
      .sort((a, b) => b.year - a.year);
  }

  async getMovieDetail(slug: string): Promise<MovieDetailResult> {
    const requested = cleanSlug(slug);
    if (!requested) return { movie: null, error: null };
    const candidates = [requested];
    const alias = KKPHIM_SLUG_ALIASES[requested];
    if (alias && alias !== requested) candidates.push(alias);
    let lastError: ReturnType<typeof providerErrorForKkResponse> | null = null;
    for (const candidate of candidates) {
      const response = await this.client.detail(candidate);
      if (response.data) {
        const movie = mapKkDetailResponse(response.data, requested);
        if (movie) return { movie, error: null };
        lastError = providerErrorForKkResponse('KKPhim detail response did not contain a valid movie', 'INVALID_RESPONSE');
      } else if (response.error) {
        lastError = response.error;
      }
    }
    return failedDetail(lastError ?? providerErrorForKkResponse('KKPhim movie was not found', 'NOT_FOUND'));
  }

  async getCatalogMovies(request: CatalogRequest): Promise<MovieListWithTitleResult> {
    const page = asPage(request.query.page);
    if (request.endpointType === 'genre' && request.slug) {
      if (request.query.type) return { ...failedList(invalidProviderError('kkphim', 'KKPhim does not expose this genre/type combination')), title: 'Khám phá phim' };
      const response = await this.client.byGenre(request.slug, page, request.query.country, request.query.year);
      const result = response.data
        ? { ...mapKkListResponse(response.data), error: null }
        : failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no genre data'));
      return { ...result, title: 'Khám phá phim' };
    }
    if (request.endpointType === 'country' && request.slug) {
      if (request.query.type) return { ...failedList(invalidProviderError('kkphim', 'KKPhim does not expose this country/type combination')), title: 'Khám phá phim' };
      const response = await this.client.byCountry(request.slug, page, request.query.year);
      const result = response.data
        ? { ...mapKkListResponse(response.data), error: null }
        : failedList(response.error ?? providerErrorForKkResponse('KKPhim returned no country data'));
      return { ...result, title: 'Khám phá phim' };
    }
    if (request.endpointType === 'year' && request.slug) {
      if (request.query.type) return { ...failedList(invalidProviderError('kkphim', 'KKPhim does not expose this year/type combination')), title: 'Khám phá phim' };
      const result = await this.getMoviesByYear(request.slug, page);
      return { ...result, title: 'Khám phá phim' };
    }
    if (request.endpointType === 'type' && request.slug) {
      return this.getMovieListBySlug(request.slug, page);
    }
    return this.getLatestMovies(page).then((result) => ({ ...result, title: 'Tất cả phim mới cập nhật' }));
  }

  async getHomepageData() {
    const [latest, single, series, subteam, animation] = await Promise.all([
      this.getLatestMovies(1),
      this.getMovieListBySlug('phim-le', 1),
      this.getMovieListBySlug('phim-bo', 1),
      this.getMovieListBySlug('subteam', 1),
      this.getMovieListBySlug('hoat-hinh', 1),
    ]);
    if (!latest && !single && !series && !subteam && !animation) return emptyHomepageData();
    return mergeHomepageData(latest, single, series, subteam, animation);
  }
}
