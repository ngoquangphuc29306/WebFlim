import type { Metadata } from 'next';
import { MovieCardModel } from '@/types/movie';
import {
  getGenresList,
  getCountriesList,
  getYearsList,
  getCatalogMovies,
} from '@/lib/api/vsmov';
import {
  parseCatalogFilters,
  resolveCatalogRequest,
} from '@/lib/api/discovery-resolver';
import DiscoveryClientView from '@/components/movie/DiscoveryClientView';

export const metadata: Metadata = {
  title: 'Khám Phá Phim - Bộ Lọc Phim Thông Minh VSMov',
  description:
    'Lọc phim theo thể loại, quốc gia, năm sản xuất và loại phim nhanh chóng, chính xác nhất.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DiscoveryPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filters = parseCatalogFilters(resolvedParams);

  const [genres, countries, years] = await Promise.all([
    getGenresList(),
    getCountriesList(),
    getYearsList(),
  ]);

  const resolved = resolveCatalogRequest(filters);

  let items: MovieCardModel[] = [];
  let pagination = {
    totalItems: 0,
    totalItemsPerPage: 24,
    currentPage: 1,
    totalPages: 1,
  };
  let title = 'Khám Phá Phim';
  let errorMsg: string | null = null;

  if (resolved.supported && resolved.request) {
    const res = await getCatalogMovies(resolved.request);
    items = res.items;
    pagination = res.pagination;
    title = res.title;
    if (res.error) {
      errorMsg = res.error.message;
    }
  }

  return (
    <DiscoveryClientView
      filters={filters}
      resolved={resolved}
      genres={genres}
      countries={countries}
      years={years}
      items={items}
      pagination={pagination}
      title={title}
      error={errorMsg}
    />
  );
}
