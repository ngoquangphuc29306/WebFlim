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

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Reset focus/mobile search & cancel active requests on route change
  useEffect(() => {
    const reqRef = requestIdRef;
    const abortRef = abortControllerRef;
    const timer = setTimeout(() => {
      setMobileSearchOpen(false);
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

  // Outside click listener
  useEffect(() => {
    if (!searchFocused) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchFocused]);

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
    }
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Mobile Compact Search Trigger */}
      {!mobileSearchOpen && (
        <button
          type="button"
          onClick={() => {
            setMobileSearchOpen(true);
            setSearchFocused(true);
          }}
          className="sm:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a3a3a3] hover:text-white rounded-full hover:bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          aria-label="Mở tìm kiếm"
          title="Tìm kiếm phim"
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* Form Input (Inline on desktop, overlay/expandable on mobile) */}
      <form
        onSubmit={handleSearchSubmit}
        className={`relative ${
          mobileSearchOpen ? 'flex items-center gap-1.5 w-full' : 'hidden sm:block'
        }`}
      >
        <input
          type="text"
          placeholder="Tìm tên phim..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={handleKeyDownSearch}
          aria-label="Tìm kiếm phim"
          className="w-full sm:w-56 md:w-64 bg-[#121212] text-white text-xs sm:text-sm pl-8 sm:pl-9 pr-8 sm:pr-3 py-1.5 sm:py-2 rounded-full border border-[#2a2a2a] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all placeholder:text-[#737373]"
        />
        <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#737373] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
        {mobileSearchOpen && (
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false);
              setSearchFocused(false);
            }}
            className="sm:hidden text-xs font-medium text-[#a3a3a3] hover:text-white px-2.5 py-1.5 min-h-[36px] flex items-center shrink-0 rounded-lg hover:bg-[#1a1a1a]"
          >
            Hủy
          </button>
        )}
      </form>

      {/* Suggestions / Recent Searches Overlay */}
      {searchFocused && (
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
