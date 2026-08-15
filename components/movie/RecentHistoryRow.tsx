'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, History, Trash2, ArrowRight, X } from 'lucide-react';
import { useWatchHistory } from '@/lib/utils/history';
import { usePlaybackProgress } from '@/lib/utils/progress';

export default function RecentHistoryRow() {
  const { history, removeHistoryItem, clearHistory, isMounted: historyMounted } = useWatchHistory();
  const { continueWatching, removeProgress, isMounted: progressMounted } = usePlaybackProgress();

  if (!historyMounted || !progressMounted) return null;

  const hasRealProgress = continueWatching && continueWatching.length > 0;
  const hasHistory = history && history.length > 0;

  if (!hasRealProgress && !hasHistory) return null;

  const titleText = hasRealProgress ? 'Tiếp Tục Xem' : 'Đã Xem Gần Đây';

  return (
    <section className="my-6 sm:my-8 lg:my-10 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1920px] mx-auto">
      <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#e50914]" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight">
            {titleText}
          </h2>
        </div>

        {!hasRealProgress && (
          <div className="flex items-center gap-3">
            <button
              onClick={clearHistory}
              className="text-xs text-[#a3a3a3] hover:text-[#e50914] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] rounded px-1"
              title="Xóa tất cả lịch sử xem"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa lịch sử</span>
            </button>

            <Link
              href="/lich-su"
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#a3a3a3] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] rounded px-1.5 py-0.5 group/link"
            >
              <span>Tất cả</span>
              <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform text-[#e50914]" />
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2">
        {hasRealProgress
          ? continueWatching.slice(0, 8).map((item) => {
              const progressPct = Math.min(
                100,
                Math.round((item.currentTime / item.duration) * 100)
              );
              const watchUrl = `/xem-phim/${item.movieSlug}?ep=${item.episodeSlug}${
                item.serverIndex !== undefined ? `&server=${item.serverIndex}` : ''
              }`;

              return (
                <div
                  key={`${item.movieSlug}-${item.episodeSlug}`}
                  className="relative w-52 sm:w-64 shrink-0 snap-start bg-[#181818] border border-[#262626] hover:border-[#e50914] rounded-xl overflow-hidden p-2.5 flex flex-col justify-between group transition-all shadow-lg"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeProgress(item.movieSlug, item.episodeSlug);
                    }}
                    className="absolute top-1.5 right-1.5 z-10 min-w-[32px] min-h-[32px] p-1.5 rounded-full bg-black/80 text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    title="Xóa khỏi Tiếp tục xem"
                    aria-label={`Xóa ${item.movieTitle} tập ${item.episodeName || ''} khỏi Tiếp tục xem`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <Link href={watchUrl} className="flex gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] rounded-lg">
                    <div className="relative w-14 aspect-[2/3] rounded-md overflow-hidden bg-[#202020] shrink-0 border border-[#333]">
                      {item.posterUrl && (
                        <Image
                          src={item.posterUrl}
                          alt={item.movieTitle}
                          fill
                          sizes="56px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center min-w-0 flex-1 pr-5">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-[#e50914] transition-colors">
                        {item.movieTitle}
                      </h4>
                      <span className="text-[11px] text-[#e50914] font-semibold mt-1 truncate">
                        Tập {item.episodeName || '1'} ({progressPct}%)
                      </span>
                      <span className="text-[10px] text-[#8c8c8c] mt-0.5 truncate">
                        {item.serverName || 'Vietsub'}
                      </span>
                    </div>
                  </Link>

                  {/* Real progress bar */}
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                    aria-label={`Đã xem ${progressPct}%`}
                    className="mt-2.5 w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      className="bg-[#e50914] h-full rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          : history.slice(0, 8).map((item) => {
              const watchUrl = `/xem-phim/${item.slug}?ep=${item.episodeSlug}${
                item.serverIndex !== undefined ? `&server=${item.serverIndex}` : ''
              }`;

              return (
                <div
                  key={item.slug}
                  className="relative w-48 sm:w-60 shrink-0 snap-start bg-[#181818] border border-[#262626] hover:border-[#e50914] rounded-xl overflow-hidden p-2.5 flex gap-3 group transition-all shadow-lg"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeHistoryItem(item.slug);
                    }}
                    className="absolute top-1.5 right-1.5 z-10 min-w-[32px] min-h-[32px] p-1.5 rounded-full bg-black/80 text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    title="Xóa khỏi lịch sử xem"
                    aria-label={`Xóa ${item.title} khỏi lịch sử xem`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <Link href={watchUrl} className="flex gap-3 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] rounded-lg">
                    <div className="relative w-14 aspect-[2/3] rounded-md overflow-hidden bg-[#202020] shrink-0 border border-[#333]">
                      {item.posterUrl && (
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          fill
                          sizes="56px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center min-w-0 flex-1 pr-5">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-[#e50914] transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[11px] text-[#e50914] font-semibold mt-1 truncate">
                        Đã xem: Tập {item.episodeName}
                      </span>
                      <span className="text-[10px] text-[#8c8c8c] mt-0.5 truncate">
                        {item.serverName || 'Vietsub'}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
      </div>
    </section>
  );
}
