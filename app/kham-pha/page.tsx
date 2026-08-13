import type { Metadata } from 'next';
import {
  activeMovieProvider,
  activeMovieProviderCapabilities,
  browseMovies,
  getCountriesList,
  getGenresList,
  getYearsList,
} from '@/lib/api/movies';
import { parseMovieBrowseFilter } from '@/lib/api/discovery-resolver';
import DiscoveryClientView from '@/components/movie/DiscoveryClientView';

export const metadata: Metadata = {
  title: 'Khám Phá Phim - Bộ Lọc Phim PHEVO',
  description: 'Lọc phim theo thể loại, quốc gia, năm sản xuất, ngôn ngữ và cách sắp xếp.',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DiscoveryPage({ searchParams }: PageProps) {
  const filters = parseMovieBrowseFilter(await searchParams);
  const [genres, countries, years, browseResult] = await Promise.all([
    getGenresList(),
    getCountriesList(),
    getYearsList(),
    browseMovies(filters),
  ]);

  return (
    <DiscoveryClientView
      filters={filters}
      genres={genres}
      countries={countries}
      years={years}
      items={browseResult.items}
      pagination={browseResult.pagination}
      title={browseResult.title}
      error={browseResult.error?.message}
      provider={activeMovieProvider}
      capabilities={activeMovieProviderCapabilities}
    />
  );
}
