'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import type { SearchSuggestion } from '@/types/search';
import MovieImage from '@/components/ui/MovieImage';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/utils/search-history';

interface HeaderSearchProps {
  pathname: string;
}

export default function HeaderSearch({ pathname }: HeaderSearchProps) {
  const router = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Reset focus, collapse search & cancel active requests on route change
  useEffect(() => {
    const reqRef = requestIdRef;
    const abortRef = abortControllerRef;
    const timer = setTimeout(() => {
      setIsExpanded(false);
      setSearchFocused(false);
    }, 0);
    return () => {
      clearTimeout(timer);
      reqRef.current++;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [pathname]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Load recent searches when search input is focused
  useEffect(() => {
    if (searchFocused) {
      queueMicrotask(() => setRecentSearches(getRecentSearches()));
    }
  }, [searchFocused]);

  // Reset highlight index when query or suggestions change
  useEffect(() => {
    queueMicrotask(() => setHighlightedIndex(-1));
  }, [suggestions, searchQuery]);

  // Outside click listener: collapse if empty
  useEffect(() => {
    if (!isExpanded && !searchFocused) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
        if (!searchQuery.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, searchFocused, searchQuery]);

  // Debounced live search with AbortController and Generation Guard
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      requestIdRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      queueMicrotask(() => {
        setSuggestions([]);
        setSearching(false);
      });
      return;
    }

    const timer = setTimeout(async () => {
      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentReqId = ++requestIdRef.current;
      setSearching(true);

      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: SearchSuggestion[] = await res.json();

        // Generation guard & abort check
        if (currentReqId === requestIdRef.current && !controller.signal.aborted) {
          setSuggestions(data);
          setSearching(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignore abort errors silently
          return;
        }
        // Handle real errors safely
        if (currentReqId === requestIdRef.current) {
          setSuggestions([]);
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSubmit = customQuery ?? searchQuery;
    if (queryToSubmit.trim()) {
      addRecentSearch(queryToSubmit.trim());
      setRecentSearches(getRecentSearches());
      setSearchFocused(false);
      router.push(`/tim-kiem?keyword=${encodeURIComponent(queryToSubmit.trim())}`);
    }
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setSearchFocused(true);
    } else {
      if (!searchQuery.trim()) {
        setIsExpanded(false);
        setSearchFocused(false);
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const handleClearQuery = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, item: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = removeRecentSearch(item);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchFocused && e.key !== 'Enter') return;

    const isLiveSearch = searchQuery.trim().length >= 2;
    const maxIndex = isLiveSearch ? suggestions.length - 1 : recentSearches.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        if (isLiveSearch && suggestions[highlightedIndex]) {
          const item = suggestions[highlightedIndex];
          addRecentSearch(item.title);
          setSearchFocused(false);
          router.push(`/phim/${item.slug}`);
        } else if (!isLiveSearch && recentSearches[highlightedIndex]) {
          const selected = recentSearches[highlightedIndex];
          setSearchQuery(selected);
          handleSearchSubmit(undefined, selected);
        }
      } else {
        handleSearchSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      if (!searchQuery.trim()) {
        setIsExpanded(false);
      }
    }
  };

  return (
    <div ref={searchContainerRef} className="relative flex items-center">
      {/* Expanding Search Bar (Netflix Style) */}
      <form
        onSubmit={handleSearchSubmit}
        className={`flex items-center transition-all duration-300 ease-out ${
          isExpanded
            ? 'w-48 sm:w-64 md:w-72 lg:w-80 bg-black/90 border border-white/80 shadow-lg px-2.5 py-1 sm:py-1.5 rounded'
            : 'w-9 h-9 sm:w-10 sm:h-10 bg-transparent border border-transparent'
        }`}
      >
        {/* Search Icon / Trigger Button */}
        <button
          type="button"
          onClick={handleToggleExpand}
          className={`flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded cursor-pointer ${
            isExpanded
              ? 'text-white/80 hover:text-white mr-2'
              : 'w-full h-full text-[#e5e5e5] hover:text-white hover:bg-[#202020] rounded-full'
          }`}
          aria-label={isExpanded ? 'Tìm kiếm' : 'Mở thanh tìm kiếm'}
          title="Tìm kiếm phim"
        >
          <Search className="w-4 h-4 xl:w-5 xl:h-5" />
        </button>

        {/* Expandable Text Input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Phim, diễn viên, thể loại..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            setIsExpanded(true);
            setSearchFocused(true);
          }}
          onKeyDown={handleKeyDownSearch}
          aria-label="Tìm kiếm phim"
          className={`bg-transparent text-white text-xs sm:text-sm placeholder:text-[#808080] outline-none transition-all duration-300 min-w-0 ${
            isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        />

        {/* Clear Button (X) when query exists */}
        {isExpanded && searchQuery && (
          <button
            type="button"
            onClick={handleClearQuery}
            className="p-1 text-[#808080] hover:text-white transition-colors shrink-0 focus-visible:outline-none"
            title="Xóa nội dung tìm kiếm"
            aria-label="Xóa từ khóa"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </form>

      {/* Suggestions / Recent Searches Overlay */}
      {isExpanded && searchFocused && (
        <div className="fixed sm:absolute top-14 sm:top-full right-2 left-2 sm:left-auto sm:right-0 sm:w-96 bg-[#121212] border border-[#2a2a2a] rounded-xl mt-1.5 shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 max-h-[75vh] overflow-y-auto">
          {searchQuery.trim().length >= 2 ? (
            searching ? (
              <div className="p-4 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                Đang tìm kiếm...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="divide-y divide-[#1f1f1f]">
                {suggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <Link
                      key={item.slug}
                      href={`/phim/${item.slug}`}
                      onClick={() => {
                        addRecentSearch(item.title);
                        setSearchFocused(false);
                        setIsExpanded(false);
                      }}
                      className={`flex items-center gap-3 p-2.5 transition-colors group focus-visible:outline-none focus-visible:bg-[#202020] ${
                        isHighlighted ? 'bg-[#202020] text-white' : 'hover:bg-[#181818]'
                      }`}
                    >
                      <div className="relative w-10 h-14 rounded overflow-hidden bg-[#1f1f1f] shrink-0 border border-[#2a2a2a]">
                        <MovieImage
                          src={item.thumbUrl || item.posterUrl}
                          alt={item.title}
                          title={item.title}
                          sizes="40px"
                          className="group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs font-semibold truncate transition-colors ${
                            isHighlighted ? 'text-[#e50914]' : 'text-white group-hover:text-[#e50914]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.originalTitle && (
                          <p className="text-[11px] text-[#a3a3a3] truncate mt-0.5">
                            {item.originalTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#737373]">
                          {item.year && <span>{item.year}</span>}
                          {item.episodeCurrent && (
                            <span className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[#a3a3a3]">
                              {item.episodeCurrent}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={(e) => handleSearchSubmit(e)}
                  className="w-full p-2.5 text-center text-xs text-[#e50914] font-medium hover:bg-[#181818] transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                >
                  Xem tất cả kết quả cho &quot;{searchQuery}&quot;
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#737373]">
                Không tìm thấy phim phù hợp
              </div>
            )
          ) : (
            /* Recent Searches View */
            <div className="p-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#222] mb-1">
                <span className="text-[11px] font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#e50914]" />
                  Lịch sử tìm kiếm
                </span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRecent}
                    className="text-[11px] text-[#737373] hover:text-[#e50914] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa tất cả</span>
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="space-y-0.5">
                  {recentSearches.map((item, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSearchQuery(item);
                          handleSearchSubmit(undefined, item);
                        }}
                        className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[#202020] text-white'
                            : 'text-[#d4d4d4] hover:bg-[#181818] hover:text-white'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{item}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecentSearch(e, item)}
                          className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[#525252] hover:text-[#e50914] rounded transition-colors opacity-80 group-hover:opacity-100"
                          title="Xóa khỏi lịch sử"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#525252]">
                  Chưa có lịch sử tìm kiếm
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
