import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMovieListBySlug } from '@/lib/api/vsmov';
import MovieGrid from '@/components/movie/MovieGrid';
import { Film } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const titlesMap: Record<string, string> = {
    'phim-le': 'Phim Lẻ Mới Nhất',
    'phim-bo': 'Phim Bộ Mới Cập Nhật',
    'subteam': 'Phim Vietsub Subteam',
    'phim-moi': 'Phim Mới Cập Nhật',
    'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
  };

  const title = titlesMap[slug] || 'Danh Sách Phim';

  return {
    title: `${title} HD Vietsub | PHEVO`,
    description: `Danh sách ${title} tuyển chọn chất lượng cao, cập nhật nhanh nhất trên PHEVO Stream.`,
  };
}

export default async function MovieListPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  const res = await getMovieListBySlug(slug, pageNum);

  if (!res || (res.items.length === 0 && pageNum === 1)) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* List Header Banner */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Film className="w-4 h-4" />
            <span>Danh Sách Tuyển Chọn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{res.title}</h1>
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
        baseUrl={`/danh-sach/${slug}`}
      />
    </div>
  );
}
