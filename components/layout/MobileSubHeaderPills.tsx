'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Determine current active genre if on a genre page
  const activeGenre = genres.find((g) => pathname === `/the-loai/${g.slug}`);

  useEffect(() => {
    if (!isCategoryModalOpen) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };

    // Lock the document itself so touch scrolling cannot leak through the modal on iOS.
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overscrollBehavior = 'none';

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.width = previousBodyStyles.width;
      document.body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      window.scrollTo(0, scrollY);

      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
      previouslyFocusedRef.current = null;
    };
  }, [isCategoryModalOpen]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsCategoryModalOpen(false);
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
      {isCategoryModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-dialog-title"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden overscroll-contain bg-[#080808] text-white animate-in fade-in zoom-in-95 duration-200"
          >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 [padding-top:max(3rem,env(safe-area-inset-top))] pb-4">
            <span id="mobile-category-dialog-title" className="text-base font-bold text-white tracking-wide">
              Chọn Thể Loại
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Đóng bảng thể loại"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categories List (Netflix Centered Scrollable List) */}
          <div className="min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto px-6 py-8 text-center space-y-5 custom-scrollbar">
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
          <div className="flex shrink-0 justify-center border-t border-white/10 px-6 pt-6 [padding-bottom:calc(2.5rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="min-h-[48px] min-w-[48px] rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
