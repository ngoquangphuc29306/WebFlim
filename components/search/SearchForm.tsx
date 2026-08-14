'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';

interface SearchFormProps {
  initialKeyword?: string;
}

export default function SearchForm({ initialKeyword = '' }: SearchFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [prevInitialKeyword, setPrevInitialKeyword] = useState(initialKeyword);

  if (initialKeyword !== prevInitialKeyword) {
    setPrevInitialKeyword(initialKeyword);
    setKeyword(initialKeyword);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed) {
      router.push(`/tim-kiem?keyword=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleClear = () => {
    setKeyword('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <Search className="w-4 h-4 text-[#737373] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Input */}
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nhập tên phim, diễn viên hoặc từ khóa..."
          aria-label="Tìm kiếm phim"
          className="w-full h-11 sm:h-12 bg-[#141414] text-white text-xs sm:text-sm pl-10 sm:pl-11 pr-24 sm:pr-28 rounded-xl border border-[#262626] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all placeholder:text-[#525252]"
        />

        {/* Action buttons inside input */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {keyword && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Xóa từ khóa tìm kiếm"
              className="w-8 h-8 sm:w-9 sm:h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#737373] hover:text-white rounded-lg hover:bg-[#222] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            aria-label="Tìm kiếm"
            className="h-8 sm:h-9 px-3 sm:px-3.5 bg-[#e50914] hover:bg-[#b80710] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-[#e50914]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="hidden xs:inline">Tìm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}
