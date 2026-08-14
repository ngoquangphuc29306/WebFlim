'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWatchHistory } from '@/lib/utils/history';
import { usePlaybackProgress } from '@/lib/persistence/progress';
import { History, Play, Trash2, X, Clock } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export default function WatchHistoryPage() {
  const { history, removeHistoryItem, clearHistory, isMounted } = useWatchHistory();
  const { progressList } = usePlaybackProgress();

  if (!isMounted) {
    return (
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="bg-[#121212] border border-[#262626] p-6 sm:p-8 rounded-2xl animate-pulse h-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 bg-[#141414] border border-[#222] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* History Header */}
      <div className="bg-[#121212] border border-[#262626] p-5 sm:p-6 lg:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Nhật ký xem phim</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Lịch Sử Xem Phim
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs text-[#a3a3a3] bg-[#181818] border border-[#2a2a2a] px-3.5 py-1.5 rounded-xl font-medium">
            <strong className="text-white font-bold">{history.length}</strong> bộ phim đã xem
          </span>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              aria-label="Xóa tất cả lịch sử xem phim"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-[#a3a3a3] hover:text-[#e50914] hover:border-[#e50914]/50 hover:bg-[#e50914]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa lịch sử</span>
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon="film"
          title="Chưa có lịch sử xem phim"
          description="Những bộ phim bạn đã thưởng thức sẽ xuất hiện ở đây để bạn dễ dàng tiếp tục theo dõi tiến trình tập phim bất cứ lúc nào."
          actionLabel="Khám phá phim hay"
          actionHref="/kham-pha"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {history.map((item) => {
            const watchUrl = `/xem-phim/${item.slug}?ep=${item.episodeSlug}${
              item.serverIndex !== undefined ? `&server=${item.serverIndex}` : ''
            }`;

            // Check if there is playback progress for this item
            const progress = progressList.find(
              (p) => p.movieSlug === item.slug && p.episodeSlug === item.episodeSlug
            );

            const percent = progress && progress.duration > 0
              ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
              : 0;

            return (
              <div
                key={item.slug}
                className="group relative bg-[#121212] border border-[#242424] hover:border-[#383838] p-3 sm:p-3.5 rounded-2xl flex gap-3.5 transition-all shadow-md hover:shadow-xl"
              >
                {/* Remove Item Button with accessible touch target */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeHistoryItem(item.slug);
                  }}
                  aria-label={`Xóa ${item.title} khỏi lịch sử`}
                  className="absolute top-2 right-2 z-10 w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-black/80 hover:bg-[#e50914] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                  title="Xóa mục này"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Media link */}
                <Link
                  href={watchUrl}
                  aria-label={`Tiếp tục xem phim ${item.title} tập ${item.episodeName}`}
                  className="flex gap-3.5 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-xl"
                >
                  {/* Thumbnail / Poster Box */}
                  <div className="relative w-20 sm:w-22 aspect-[2/3] rounded-xl overflow-hidden bg-[#181818] border border-[#262626] shrink-0">
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      fill
                      sizes="90px"
                      referrerPolicy="no-referrer"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-md">
                        <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Progress Bar overlay */}
                    {percent > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#141414]"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ ${percent}%`}
                      >
                        <div
                          className="h-full bg-[#e50914] transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Metadata and Resume info */}
                  <div className="flex flex-col justify-between min-w-0 flex-1 pr-6 py-0.5">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#e50914] transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-[#e50914] bg-[#e50914]/10 border border-[#e50914]/20 px-2 py-0.5 rounded-md">
                          Tập {item.episodeName}
                        </span>
                        <span className="text-[11px] text-[#888888] font-medium truncate">
                          {item.serverName || 'Vietsub'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      {percent > 0 ? (
                        <div className="text-[11px] font-semibold text-[#a3a3a3] flex items-center gap-1">
                          <span>Đã xem {percent}%</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#737373] flex items-center gap-1">
                          <Play className="w-3 h-3 text-[#e50914]" />
                          <span>Xem tiếp</span>
                        </div>
                      )}

                      <div className="text-[10px] text-[#525252] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
