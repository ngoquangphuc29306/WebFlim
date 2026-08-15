'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, X, Check } from 'lucide-react';
import { CategoryModel } from '@/types/movie';

interface MobileSubHeaderPillsProps {
  genres: CategoryModel[];
}

const filterItems = [
  { name: 'Phim Lẻ', href: '/danh-sach/phim-le' },
  { name: 'Phim Bộ', href: '/danh-sach/phim-bo' },
  { name: 'Hoạt Hình', href: '/danh-sach/hoat-hinh' },
  { name: 'TV Shows', href: '/danh-sach/tv-shows' },
  { name: 'Phim Chiếu Rạp', href: '/danh-sach/phim-chieu-rap' },
];

export default function MobileSubHeaderPills({ genres }: MobileSubHeaderPillsProps) {
  const pathname = usePathname();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Determine current active genre if on a genre page
  const activeGenre = genres.find((g) => pathname === `/the-loai/${g.slug}`);

  return (
    <>
      {/* Scrollable Quick Filter Pills (Netflix Mobile Style) */}
      <div className="lg:hidden flex items-center gap-2 py-1 px-3 sm:px-4 overflow-x-auto no-scrollbar scroll-smooth">
        {filterItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 shrink-0 select-none cursor-pointer active:scale-95 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-black/40 text-white/90 border border-white/20 hover:border-white/50 backdrop-blur-md hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          );
        })}

        {/* Thể loại ▾ (Category Dropdown Trigger) */}
        <button
          type="button"
          onClick={() => setIsCategoryModalOpen(true)}
          className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight flex items-center gap-1.5 transition-all duration-200 shrink-0 select-none cursor-pointer active:scale-95 whitespace-nowrap ${
            activeGenre
              ? 'bg-white text-black font-bold shadow-md'
              : 'bg-black/40 text-white/90 border border-white/20 hover:border-white/50 backdrop-blur-md hover:text-white'
          }`}
          aria-expanded={isCategoryModalOpen}
          aria-label="Mở danh sách thể loại phim"
        >
          <span>{activeGenre ? activeGenre.name : 'Thể loại'}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>

      {/* Fullscreen Netflix Category Sheet / Modal */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh mục thể loại phim"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-white/10">
            <span className="text-base font-bold text-white tracking-wide">
              Chọn Thể Loại
            </span>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all focus-visible:outline-none"
              aria-label="Đóng bảng thể loại"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categories List (Netflix Centered Scrollable List) */}
          <div className="flex-1 overflow-y-auto py-8 px-6 text-center space-y-5 custom-scrollbar">
            <Link
              href="/"
              onClick={() => setIsCategoryModalOpen(false)}
              className={`block text-lg transition-colors ${
                pathname === '/' ? 'text-white font-black text-xl' : 'text-[#a3a3a3] hover:text-white'
              }`}
            >
              Tất Cả Thể Loại
            </Link>

            {genres.map((genre) => {
              const isActive = pathname === `/the-loai/${genre.slug}`;
              return (
                <Link
                  key={genre.slug}
                  href={`/the-loai/${genre.slug}`}
                  onClick={() => setIsCategoryModalOpen(false)}
                  className={`flex items-center justify-center gap-2 text-base transition-colors ${
                    isActive
                      ? 'text-white font-bold text-lg'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                >
                  <span>{genre.name}</span>
                  {isActive && <Check className="w-4 h-4 text-[#e50914]" />}
                </Link>
              );
            })}
          </div>

          {/* Bottom Close Button */}
          <div className="p-6 pb-10 flex justify-center border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
              aria-label="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
