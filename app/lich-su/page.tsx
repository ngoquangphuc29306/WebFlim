'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWatchHistory } from '@/lib/utils/history';
import { History, Play, Trash2, X } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';


export default function WatchHistoryPage() {
  const { history, removeHistoryItem, clearHistory, isMounted } = useWatchHistory();

  if (!isMounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl animate-pulse h-24" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Nhật ký hoạt động</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Lịch Sử Xem Phim
          </h1>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181818] border border-[#262626] text-xs text-[#a3a3a3] hover:text-[#e50914] hover:border-[#e50914] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon="film"
          title="Chưa có lịch sử xem phim"
          description="Những bộ phim bạn đã xem sẽ xuất hiện ở đây để bạn dễ dàng tiếp tục theo dõi bất cứ lúc nào."
          actionLabel="Khám phá phim hay"
          actionHref="/"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {history.map((item) => {
            const watchUrl = `/xem-phim/${item.slug}?ep=${item.episodeSlug}${
              item.serverIndex !== undefined ? `&server=${item.serverIndex}` : ''
            }`;

            return (
              <div
                key={item.slug}
                className="relative bg-[#101010] border border-[#222] hover:border-[#e50914] p-3 rounded-2xl flex gap-3 group transition-all"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeHistoryItem(item.slug);
                  }}
                  className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-black/70 text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors"
                  title="Xóa mục này"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <Link href={watchUrl} className="flex gap-3 min-w-0 flex-1">
                  <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden bg-[#1f1f1f] shrink-0">
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-6 h-6 fill-white text-white" />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center min-w-0 flex-1 space-y-1 pr-6">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-[#e50914] transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-xs text-[#e50914] font-semibold">
                      Tập {item.episodeName}
                    </span>
                    <span className="text-[11px] text-[#737373]">
                      {item.serverName || 'Vietsub'}
                    </span>
                    <span className="text-[10px] text-[#525252]">
                      {new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
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
