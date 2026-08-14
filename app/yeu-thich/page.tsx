'use client';

import React from 'react';
import MovieGrid from '@/components/movie/MovieGrid';
import { useWatchlist } from '@/lib/utils/favorites';
import { Bookmark } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export default function WatchlistPage() {
  const { watchlist, isMounted } = useWatchlist();

  if (!isMounted) {
    return (
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="bg-[#121212] border border-[#262626] p-6 sm:p-8 rounded-2xl animate-pulse h-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Watchlist Context Header */}
      <div className="bg-[#121212] border border-[#262626] p-5 sm:p-6 lg:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Bộ sưu tập cá nhân</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Danh Sách Phim Yêu Thích
          </h1>
        </div>

        <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#2a2a2a] px-3.5 py-1.5 rounded-xl font-medium self-start sm:self-auto">
          Đã lưu <strong className="text-white font-bold">{watchlist.length}</strong> bộ phim
        </span>
      </div>

      {/* Grid or Cinematic Empty State */}
      {watchlist.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Chưa có phim yêu thích"
          description="Hãy nhấn vào biểu tượng Bookmark trên poster phim hoặc trang chi tiết để lưu những bộ phim bạn muốn xem vào đây."
          actionLabel="Khám phá phim ngay"
          actionHref="/kham-pha"
        />
      ) : (
        <MovieGrid
          movies={watchlist}
          emptyMessage="Bạn chưa thêm bộ phim nào vào danh sách yêu thích."
        />
      )}
    </div>
  );
}
