import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByCountry, getCountriesList } from '@/lib/api/vsmov';
import MovieGrid from '@/components/movie/MovieGrid';
import { Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const countries = await getCountriesList();
  const country = countries.find((c) => c.slug === slug);

  return {
    title: `Phim Quốc Gia ${country ? country.name : slug} HD Vietsub | VSMov`,
    description: `Xem danh sách phim sản xuất tại ${country ? country.name : slug} cập nhật mới nhất với chất lượng HD/4K.`,
  };
}

export default async function CountryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  const [res, countries] = await Promise.all([
    getMoviesByCountry(slug, pageNum),
    getCountriesList(),
  ]);

  const currentCountry = countries.find((c) => c.slug === slug);

  if (!res || (res.items.length === 0 && pageNum === 1 && !currentCountry)) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Country Header Banner */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Phim Theo Quốc Gia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {currentCountry ? currentCountry.name : 'Quốc Gia Phim'}
          </h1>
        </div>

        {res.pagination && res.pagination.totalItems > 0 && (
          <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#262626] px-3 py-1.5 rounded-lg">
            Tổng số: <strong className="text-white">{res.pagination.totalItems}</strong> phim
          </span>
        )}
      </div>

      {/* Grid Results */}
      <MovieGrid
        movies={res.items}
        pagination={res.pagination}
        baseUrl={`/quoc-gia/${slug}`}
        emptyMessage={`Chưa có phim nào thuộc quốc gia này.`}
      />
    </div>
  );
}
