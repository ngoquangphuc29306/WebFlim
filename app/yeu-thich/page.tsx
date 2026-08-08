'use client';

import React from 'react';
import MovieGrid from '@/components/movie/MovieGrid';
import { useWatchlist } from '@/lib/utils/favorites';
import { Bookmark, Heart } from 'lucide-react';

export default function WatchlistPage() {
  const { watchlist, isMounted } = useWatchlist();

  if (!isMounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl animate-pulse h-24" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#141414] border border-[#222] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Bộ sưu tập cá nhân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Danh Sách Phim Yêu Thích
          </h1>
        </div>

        <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#262626] px-3 py-1.5 rounded-lg">
          Đã lưu <strong className="text-white">{watchlist.length}</strong> bộ phim
        </span>
      </div>

      <MovieGrid
        movies={watchlist}
        emptyMessage="Bạn chưa thêm bộ phim nào vào danh sách yêu thích. Hãy nhấn nút biểu tượng Bookmark trên poster phim để lưu lại!"
      />
    </div>
  );
}
