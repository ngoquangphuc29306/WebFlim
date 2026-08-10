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
    <div className="flex flex-wrap items-center justify-center gap-2 my-12">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#141414] border border-[#262626] text-sm text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] text-sm text-[#525252] cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </button>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-[#737373] text-sm">
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
              className={`min-w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                isCurrent
                  ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/20'
                  : 'bg-[#141414] border border-[#262626] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f]'
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
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#141414] border border-[#262626] text-sm text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] transition-colors"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] text-sm text-[#525252] cursor-not-allowed"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
