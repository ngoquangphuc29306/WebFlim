'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Bookmark,
  History,
  Play,
  Compass,
  Clock,
  Trash2,
} from 'lucide-react';
import { searchMovies } from '@/lib/api/vsmov';
import { CategoryModel, CountryModel, MovieCardModel, YearOptionModel } from '@/types/movie';
import MovieImage from '@/components/ui/MovieImage';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '@/lib/utils/search-history';
import UserAccountMenu from '@/components/layout/UserAccountMenu';



interface HeaderProps {
  genres?: CategoryModel[];
  countries?: CountryModel[];
  years?: YearOptionModel[];
}

const POPULAR_SLUGS = [
  'han-quoc',
  'trung-quoc',
  'au-my',
  'nhat-ban',
  'viet-nam',
  'thai-lan',
  'hong-kong',
  'dai-loan',
];

export default function Header({ genres = [], countries = [], years = [] }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'genre' | 'country' | 'year' | null>(null);

  // Search input inside taxonomy dropdowns
  const [countrySearch, setCountrySearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');

  // Global Header Live Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<MovieCardModel[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches on focus
  useEffect(() => {
    if (searchFocused) {
      queueMicrotask(() => setRecentSearches(getRecentSearches()));
    }
  }, [searchFocused]);

  // Reset highlight index when query or suggestions change
  useEffect(() => {
    queueMicrotask(() => setHighlightedIndex(-1));
  }, [suggestions, searchQuery]);

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
    if (!searchFocused) return;

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


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus & reset dropdown search on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileSearchOpen(false);
      setActiveDropdown(null);
      setSearchFocused(false);
      setCountrySearch('');
      setYearSearch('');
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Outside click listener for search and dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setSearchFocused(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced live search suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      const timer = setTimeout(() => {
        setSuggestions([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchMovies(searchQuery, 1);
        setSuggestions(res.items.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Popular vs All countries memoization
  const popularCountries = useMemo(() => {
    if (!countries.length) return [];
    return countries.filter((c) => POPULAR_SLUGS.includes(c.slug));
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const term = countrySearch.trim().toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(term));
  }, [countries, countrySearch]);

  const filteredYears = useMemo(() => {
    if (!yearSearch.trim()) return years;
    const term = yearSearch.trim();
    return years.filter((y) => String(y.year).includes(term) || y.name.includes(term));
  }, [years, yearSearch]);

  const navLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Khám Phá', href: '/kham-pha', icon: Compass },
    { name: 'Phim Lẻ', href: '/danh-sach/phim-le' },
    { name: 'Phim Bộ', href: '/danh-sach/phim-bo' },
    { name: 'Subteam', href: '/danh-sach/subteam' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080808]/95 backdrop-blur-md border-b border-[#1f1f1f] py-3 shadow-2xl'
          : 'bg-header-gradient py-4'
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Trang chủ VSMov"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-[#e50914] flex items-center justify-center text-white shadow-lg shadow-[#e50914]/30 group-hover:scale-105 transition-transform duration-200">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="font-extrabold tracking-wider text-2xl">
              VS<span className="text-[#e50914]">MOV</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" ref={dropdownRef} aria-label="Điều hướng chính">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    active
                      ? 'text-white bg-[#1a1a1a] font-semibold border border-[#333]'
                      : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-[#e50914]" />}
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Dropdown: Thể Loại */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('genre')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'genre' ? null : 'genre'))}
                aria-expanded={activeDropdown === 'genre'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/the-loai')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Thể Loại</span>
                <ChevronDown
                  className={`w-4 h-4 opacity-70 transition-transform duration-200 ${
                    activeDropdown === 'genre' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'genre' && (
                <div className="absolute top-full left-0 w-[480px] bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-2xl grid grid-cols-3 gap-1.5 z-50 animate-in fade-in duration-150 max-h-96 overflow-y-auto">
                  {genres.length > 0 ? (
                    genres.map((g) => (
                      <Link
                        key={g.slug}
                        href={`/the-loai/${g.slug}`}
                        onClick={() => setActiveDropdown(null)}
                        className="px-2.5 py-1.5 rounded-md text-xs text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                      >
                        {g.name}
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-3 text-xs text-[#737373] p-2 text-center">
                      Đang tải thể loại...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dropdown: Quốc Gia (Full 187 items + Search + Popular section) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('country')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'country' ? null : 'country'))}
                aria-expanded={activeDropdown === 'country'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/quoc-gia')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Quốc Gia</span>
                <ChevronDown
                  className={`w-4 h-4 opacity-70 transition-transform duration-200 ${
                    activeDropdown === 'country' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'country' && (
                <div className="absolute top-full left-0 w-[400px] bg-[#121212] border border-[#262626] rounded-xl p-3 shadow-2xl z-50 animate-in fade-in duration-150">
                  {/* Search input */}
                  <div className="mb-2 relative">
                    <input
                      type="text"
                      placeholder="Tìm quốc gia..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      aria-label="Tìm kiếm quốc gia"
                      className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {!countrySearch.trim() && popularCountries.length > 0 && (
                    <div className="mb-2 border-b border-[#262626] pb-2">
                      <div className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider mb-1 px-1">
                        Phổ biến
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {popularCountries.map((c) => (
                          <Link
                            key={`pop-${c.slug}`}
                            href={`/quoc-gia/${c.slug}`}
                            onClick={() => setActiveDropdown(null)}
                            className="px-2 py-1 rounded text-xs text-[#f5f5f5] bg-[#1a1a1a] hover:bg-[#e50914] hover:text-white transition-colors truncate"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider mb-1 px-1">
                    {countrySearch.trim() ? 'Kết quả' : `Tất cả quốc gia (${countries.length})`}
                  </div>

                  <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/quoc-gia/${c.slug}`}
                          onClick={() => setActiveDropdown(null)}
                          className="px-2 py-1 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors truncate"
                        >
                          {c.name}
                        </Link>
                      ))
                    ) : (
                      <div className="col-span-2 text-xs text-[#737373] p-2 text-center">
                        Không thấy quốc gia phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown: Năm (Full taxonomy list + Search) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('year')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'year' ? null : 'year'))}
                aria-expanded={activeDropdown === 'year'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/nam')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Năm</span>
                <ChevronDown
                  className={`w-4 h-4 opacity-70 transition-transform duration-200 ${
                    activeDropdown === 'year' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'year' && (
                <div className="absolute top-full left-0 w-60 bg-[#121212] border border-[#262626] rounded-xl p-3 shadow-2xl z-50 animate-in fade-in duration-150">
                  <div className="mb-2 relative">
                    <input
                      type="text"
                      placeholder="Tìm năm..."
                      value={yearSearch}
                      onChange={(e) => setYearSearch(e.target.value)}
                      aria-label="Tìm kiếm năm"
                      className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
                    {filteredYears.length > 0 ? (
                      filteredYears.map((y) => (
                        <Link
                          key={y.slug || y.year}
                          href={`/nam/${y.slug || y.year}`}
                          onClick={() => setActiveDropdown(null)}
                          className="px-2 py-1.5 rounded text-xs text-center text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors"
                        >
                          {y.name || y.year}
                        </Link>
                      ))
                    ) : (
                      <div className="col-span-2 text-xs text-[#737373] p-2 text-center">
                        Không thấy năm phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </nav>

          {/* Right Section: Search & Shortcuts */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Live Search Input */}
            <div ref={searchRef} className="relative">
              {/* Mobile Compact Search Trigger */}
              {!mobileSearchOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen(true);
                    setSearchFocused(true);
                  }}
                  className="sm:hidden p-2 text-[#a3a3a3] hover:text-white rounded-full hover:bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                  aria-label="Mở tìm kiếm"
                  title="Tìm kiếm phim"
                >
                  <Search className="w-5 h-5" />
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
                  className="w-full sm:w-56 md:w-64 bg-[#141414] text-white text-xs sm:text-sm pl-8 sm:pl-9 pr-8 sm:pr-3 py-1.5 sm:py-2 rounded-full border border-[#262626] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all placeholder:text-[#737373]"
                />
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#737373] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
                {mobileSearchOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchFocused(false);
                    }}
                    className="sm:hidden text-xs font-medium text-[#a3a3a3] hover:text-white px-2 py-1 shrink-0"
                  >
                    Hủy
                  </button>
                )}
              </form>

              {/* Suggestions / Recent Searches Overlay */}
              {searchFocused && (
                <div className="fixed sm:absolute top-14 sm:top-full right-2 left-2 sm:left-auto sm:right-0 sm:w-96 bg-[#121212] border border-[#262626] rounded-xl mt-1 shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150 max-h-[75vh] overflow-y-auto">
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
                              className={`flex items-center gap-3 p-2.5 transition-colors group focus-visible:outline-none ${
                                isHighlighted ? 'bg-[#222222] text-white' : 'hover:bg-[#1a1a1a]'
                              }`}
                            >
                              <div className="relative w-10 h-14 rounded overflow-hidden bg-[#1f1f1f] shrink-0">
                                <MovieImage
                                  src={item.thumbUrl || item.posterUrl}
                                  alt={item.title}
                                  title={item.title}
                                  sizes="40px"
                                  className="group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-xs font-semibold truncate transition-colors ${
                                  isHighlighted ? 'text-[#e50914]' : 'text-white group-hover:text-[#e50914]'
                                }`}>
                                  {item.title}
                                </h4>
                                {item.originalTitle && (
                                  <p className="text-[11px] text-[#a3a3a3] truncate">
                                    {item.originalTitle}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#737373]">
                                  {item.year && <span>{item.year}</span>}
                                  {item.episodeCurrent && (
                                    <span className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#a3a3a3]">
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
                          className="w-full p-2.5 text-center text-xs text-[#e50914] font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-1"
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
                            className="text-[11px] text-[#737373] hover:text-[#e50914] transition-colors flex items-center gap-1"
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
                                  isHighlighted ? 'bg-[#222] text-white' : 'text-[#d4d4d4] hover:bg-[#181818] hover:text-white'
                                }`}
                              >
                                <span className="truncate flex-1 pr-2">{item}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveRecentSearch(e, item)}
                                  className="p-1 text-[#525252] hover:text-[#e50914] rounded transition-colors opacity-80 group-hover:opacity-100"
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

            {/* Watchlist Shortcut (Desktop & Tablet) */}
            <Link
              href="/yeu-thich"
              title="Danh sách yêu thích"
              aria-label="Danh sách yêu thích"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/yeu-thich'
                  ? 'text-white bg-[#1f1f1f]'
                  : 'text-[#a3a3a3] hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Bookmark className="w-5 h-5" />
            </Link>

            {/* Watch History Shortcut (Desktop & Tablet) */}
            <Link
              href="/lich-su"
              title="Lịch sử xem phim"
              aria-label="Lịch sử xem phim"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/lich-su'
                  ? 'text-white bg-[#1f1f1f]'
                  : 'text-[#a3a3a3] hover:text-white hover:bg-[#141414]'
              }`}
            >
              <History className="w-5 h-5" />
            </Link>

            {/* User Account Menu */}
            <UserAccountMenu />


            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0c0c0c] border-b border-[#1f1f1f] px-4 pt-3 pb-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 py-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-[#181818] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  {Icon && <Icon className="w-4 h-4 text-[#e50914]" />}
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Watchlist & History on mobile menu */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a1a1a] my-2">
              <Link
                href="/yeu-thich"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#161616] border border-[#262626] hover:bg-[#222222] flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-[#e50914]" />
                <span>Yêu thích</span>
              </Link>
              <Link
                href="/lich-su"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#161616] border border-[#262626] hover:bg-[#222222] flex items-center gap-2"
              >
                <History className="w-4 h-4 text-[#e50914]" />
                <span>Lịch sử</span>
              </Link>
            </div>

            {/* Mobile Genres */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider px-3 mb-2">
                Thể Loại
              </div>
              <div className="grid grid-cols-2 gap-1 px-1 max-h-40 overflow-y-auto">
                {genres.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/the-loai/${g.slug}`}
                    className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Countries */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider px-3 mb-2">
                Quốc Gia ({countries.length})
              </div>
              <div className="grid grid-cols-2 gap-1 px-1 max-h-40 overflow-y-auto">
                {countries.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/quoc-gia/${c.slug}`}
                    className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Years */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider px-3 mb-2">
                Năm Sản Xuất ({years.length})
              </div>
              <div className="grid grid-cols-3 gap-1 px-1 max-h-36 overflow-y-auto">
                {years.map((y) => (
                  <Link
                    key={y.slug || y.year}
                    href={`/nam/${y.slug || y.year}`}
                    className="px-2 py-1.5 rounded text-xs text-center text-[#a3a3a3] hover:text-white hover:bg-[#181818]"
                  >
                    {y.name || y.year}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
