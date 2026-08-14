'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSiteUrl } from '@/lib/site-config';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string; // e.g. /danh-sach/phim-le or /tim-kiem?keyword=abc
  paramName?: string; // default 'page'
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  paramName = 'page',
}: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const hasQuery = baseUrl.includes('?');
    if (hasQuery) {
      // replace or append page param
      const url = new URL(baseUrl, getSiteUrl());
      url.searchParams.set(paramName, String(page));
      return `${url.pathname}${url.search}`;
    }
    return `${baseUrl}?${paramName}=${page}`;
  };

  // Generate list of page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-8 sm:my-12">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          aria-label="Chuyển đến trang trước"
          className="flex items-center gap-1 px-3 sm:px-3.5 min-h-[40px] sm:min-h-[36px] rounded-xl bg-[#141414] border border-[#262626] text-xs sm:text-sm font-medium text-[#d4d4d4] hover:text-white hover:bg-[#202020] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </Link>
      ) : (
        <button
          disabled
          aria-disabled="true"
          aria-label="Trang trước (không khả dụng)"
          className="flex items-center gap-1 px-3 sm:px-3.5 min-h-[40px] sm:min-h-[36px] rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] text-xs sm:text-sm text-[#404040] cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </button>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1.5 sm:px-2 py-1 text-[#737373] text-xs sm:text-sm font-medium select-none">
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isCurrent = pageNum === currentPage;

          return (
            <Link
              key={pageNum}
              href={buildUrl(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Trang ${pageNum}`}
              className={`min-w-[38px] sm:min-w-9 h-[38px] sm:h-9 flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isCurrent
                  ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/25'
                  : 'bg-[#141414] border border-[#262626] text-[#a3a3a3] hover:text-white hover:bg-[#202020]'
              }`}
            >
              {pageNum}
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          aria-label="Chuyển đến trang sau"
          className="flex items-center gap-1 px-3 sm:px-3.5 min-h-[40px] sm:min-h-[36px] rounded-xl bg-[#141414] border border-[#262626] text-xs sm:text-sm font-medium text-[#d4d4d4] hover:text-white hover:bg-[#202020] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          disabled
          aria-disabled="true"
          aria-label="Trang sau (không khả dụng)"
          className="flex items-center gap-1 px-3 sm:px-3.5 min-h-[40px] sm:min-h-[36px] rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] text-xs sm:text-sm text-[#404040] cursor-not-allowed"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </nav>
  );
}
