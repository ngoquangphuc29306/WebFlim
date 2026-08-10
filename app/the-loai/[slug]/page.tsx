import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByGenre, getGenresList } from '@/lib/api/vsmov';
import MovieGrid from '@/components/movie/MovieGrid';
import { Tag } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genres = await getGenresList();
  const genre = genres.find((g) => g.slug === slug);

  return {
    title: `Phim Thể Loại ${genre ? genre.name : slug} Vietsub | PHEVO`,
    description: `Xem danh sách phim thể loại ${genre ? genre.name : slug} được cập nhật trên PHEVO.`,
  };
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  const [res, genres] = await Promise.all([
    getMoviesByGenre(slug, pageNum),
    getGenresList(),
  ]);

  const currentGenre = genres.find((g) => g.slug === slug);

  if (!res || (res.items.length === 0 && pageNum === 1 && !currentGenre)) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Genre Header Banner */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Tag className="w-4 h-4" />
            <span>Danh mục thể loại</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {currentGenre ? currentGenre.name : 'Thể Loại Phim'}
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
        baseUrl={`/the-loai/${slug}`}
        emptyMessage={`Chưa có phim nào thuộc thể loại này.`}
      />
    </div>
  );
}
