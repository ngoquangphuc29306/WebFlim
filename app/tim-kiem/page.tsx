import React from 'react';
import { Metadata } from 'next';
import { searchMovies } from '@/lib/api/vsmov';
import MovieGrid from '@/components/movie/MovieGrid';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ keyword?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { keyword } = await searchParams;
  return {
    title: keyword ? `Tìm kiếm: "${keyword}" - VSMov Stream` : 'Tìm kiếm phim - VSMov Stream',
    description: 'Tìm kiếm bộ phim yêu thích của bạn trên VSMov Stream.',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { keyword = '', page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  const result = await searchMovies(keyword, pageNum);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search Header */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Search className="w-4 h-4" />
            <span>Kết quả tìm kiếm</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            {keyword ? (
              <>
                Từ khóa: <span className="text-[#e50914]">&quot;{keyword}&quot;</span>
              </>
            ) : (
              'Vui lòng nhập từ khóa để tìm kiếm'
            )}
          </h1>
        </div>

        {result.pagination && result.pagination.totalItems > 0 && (
          <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#262626] px-3 py-1.5 rounded-lg">
            Tìm thấy <strong className="text-white">{result.pagination.totalItems}</strong> bộ phim
          </span>
        )}
      </div>

      {/* Grid Results */}
      <MovieGrid
        movies={result.items}
        pagination={result.pagination}
        baseUrl={`/tim-kiem?keyword=${encodeURIComponent(keyword)}`}
        emptyMessage={
          keyword
            ? `Không tìm thấy kết quả nào cho từ khóa "${keyword}".`
            : 'Hãy nhập tên phim hoặc từ khóa vào thanh tìm kiếm trên.'
        }
      />
    </div>
  );
}
