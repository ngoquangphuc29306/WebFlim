import React from 'react';
import { Metadata } from 'next';
import { searchMovies } from '@/lib/api/movies';
import MovieGrid from '@/components/movie/MovieGrid';
import SearchForm from '@/components/search/SearchForm';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ keyword?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { keyword } = await searchParams;
  return {
    title: keyword ? `Tìm kiếm: "${keyword}" - PHEVO Stream` : 'Tìm kiếm phim - PHEVO Stream',
    description: 'Tìm kiếm bộ phim yêu thích của bạn trên PHEVO Stream.',
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
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Search Header & Search Form */}
      <div className="bg-[#121212] border border-[#262626] p-5 sm:p-6 lg:p-8 rounded-2xl space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
              <Search className="w-4 h-4" />
              <span>Tìm kiếm phim</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {keyword ? (
                <>
                  Kết quả cho: <span className="text-[#e50914]">&quot;{keyword}&quot;</span>
                </>
              ) : (
                'Tìm Kiếm Phim'
              )}
            </h1>
          </div>

          {keyword && result.pagination && result.pagination.totalItems > 0 && (
            <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#2a2a2a] px-3.5 py-1.5 rounded-xl self-start sm:self-auto font-medium">
              Tìm thấy <strong className="text-white font-bold">{result.pagination.totalItems}</strong> bộ phim
            </span>
          )}
        </div>

        {/* Prominent Search Bar */}
        <SearchForm initialKeyword={keyword} />
      </div>

      {/* Grid Results */}
      <div className="space-y-4">
        {keyword && result.items.length > 0 && (
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="text-sm font-semibold text-white">
              Danh sách kết quả
            </span>
            {result.pagination && (
              <span className="text-xs text-[#737373]">
                Trang {result.pagination.currentPage} / {result.pagination.totalPages}
              </span>
            )}
          </div>
        )}

        <MovieGrid
          movies={result.items}
          pagination={result.pagination}
          baseUrl={`/tim-kiem?keyword=${encodeURIComponent(keyword)}`}
          emptyMessage={
            keyword
              ? `Không tìm thấy kết quả nào phù hợp với từ khóa "${keyword}". Bạn hãy thử tìm kiếm với từ khóa khác hoặc khám phá kho phim.`
              : 'Vui lòng nhập tên bộ phim, diễn viên hoặc thể loại vào thanh tìm kiếm ở trên để bắt đầu.'
          }
        />
      </div>
    </div>
  );
}
