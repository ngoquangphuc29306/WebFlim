import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByYear } from '@/lib/api/vsmov';
import MovieGrid from '@/components/movie/MovieGrid';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Phim Phát Hành Năm ${year} HD Vietsub | VSMov`,
    description: `Xem danh sách phim ra mắt năm ${year} cập nhật mới nhất chất lượng cao.`,
  };
}

export default async function YearPage({ params, searchParams }: PageProps) {
  const { year } = await params;
  const { page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  const res = await getMoviesByYear(year, pageNum);

  if (!res || (res.items.length === 0 && pageNum === 1)) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Year Header Banner */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Năm Phát Hành</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Phim Năm {year}
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
        baseUrl={`/nam/${year}`}
        emptyMessage={`Chưa có phim nào ra mắt trong năm ${year}.`}
      />
    </div>
  );
}
