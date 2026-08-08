'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { searchMovies } from '@/lib/api/vsmov';
import { CategoryModel, CountryModel, MovieCardModel } from '@/types/movie';
import MovieImage from '@/components/ui/MovieImage';

interface HeaderProps {
  genres?: CategoryModel[];
  countries?: CountryModel[];
}

export default function Header({ genres = [], countries = [] }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'genre' | 'country' | 'year' | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<MovieCardModel[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Years options
  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

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

  // Close menus when route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
      setActiveDropdown(null);
      setSearchFocused(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Handle outside click for search suggestions & dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchFocused(false);
      router.push(`/tim-kiem?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Phim Lẻ', href: '/danh-sach/phim-le' },
    { name: 'Phim Bộ', href: '/danh-sach/phim-bo' },
    { name: 'Subteam', href: '/danh-sach/subteam' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080808]/90 backdrop-blur-md border-b border-[#1f1f1f] py-3 shadow-2xl'
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
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Điều hướng chính">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    active
                      ? 'text-white bg-[#1a1a1a] font-semibold'
                      : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                  }`}
                >
                  {link.name}
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
                aria-expanded={activeDropdown === 'genre'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/the-loai')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Thể Loại</span>
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {activeDropdown === 'genre' && (
                <div className="absolute top-full left-0 w-[480px] bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-2xl grid grid-cols-3 gap-1.5 z-50 animate-in fade-in duration-150">
                  {genres.length > 0 ? (
                    genres.slice(0, 24).map((g) => (
                      <Link
                        key={g.slug}
                        href={`/the-loai/${g.slug}`}
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

            {/* Dropdown: Quốc Gia */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('country')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                aria-expanded={activeDropdown === 'country'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/quoc-gia')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Quốc Gia</span>
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {activeDropdown === 'country' && (
                <div className="absolute top-full left-0 w-[360px] bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-2xl grid grid-cols-2 gap-1.5 z-50 animate-in fade-in duration-150">
                  {countries.length > 0 ? (
                    countries.slice(0, 16).map((c) => (
                      <Link
                        key={c.slug}
                        href={`/quoc-gia/${c.slug}`}
                        className="px-2.5 py-1.5 rounded-md text-xs text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                      >
                        {c.name}
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-[#737373] p-2 text-center">
                      Đang tải quốc gia...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dropdown: Năm */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('year')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                aria-expanded={activeDropdown === 'year'}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  pathname.startsWith('/nam')
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#121212]'
                }`}
              >
                <span>Năm</span>
                <ChevronDown className="w-4 h-4 opacity-70" />
              </button>

              {activeDropdown === 'year' && (
                <div className="absolute top-full left-0 w-44 bg-[#121212] border border-[#262626] rounded-xl p-2 shadow-2xl grid grid-cols-2 gap-1 z-50 animate-in fade-in duration-150">
                  {years.map((y) => (
                    <Link
                      key={y}
                      href={`/nam/${y}`}
                      className="px-2.5 py-1.5 rounded-md text-xs text-center text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Section: Search & Watchlist & History */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Search Input */}
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Tìm tên phim, diễn viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  aria-label="Search movies"
                  className="w-36 sm:w-56 md:w-64 bg-[#141414] text-white text-xs sm:text-sm pl-9 pr-3 py-2 rounded-full border border-[#262626] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all placeholder:text-[#737373]"
                />
                <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
              </form>

              {/* Suggestions Overlay */}
              {searchFocused && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full right-0 w-80 sm:w-96 bg-[#121212] border border-[#262626] rounded-xl mt-2 shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
                  {searching ? (
                    <div className="p-4 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                      Đang tìm kiếm...
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="divide-y divide-[#1f1f1f]">
                      {suggestions.map((item) => (
                        <Link
                          key={item.slug}
                          href={`/phim/${item.slug}`}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center gap-3 p-2.5 hover:bg-[#1a1a1a] transition-colors group focus-visible:outline-none focus-visible:bg-[#1a1a1a]"
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
                            <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#e50914] transition-colors">
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
                      ))}

                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full p-2.5 text-center text-xs text-[#e50914] font-medium hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-1"
                      >
                        Xem tất cả kết quả cho &quot;{searchQuery}&quot;
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-[#737373]">
                      Không tìm thấy phim phù hợp
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Watchlist Shortcut */}
            <Link
              href="/yeu-thich"
              title="Danh sách yêu thích"
              aria-label="Danh sách yêu thích"
              className={`p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/yeu-thich'
                  ? 'text-white bg-[#1f1f1f]'
                  : 'text-[#a3a3a3] hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Bookmark className="w-5 h-5" />
            </Link>

            {/* Watch History Shortcut */}
            <Link
              href="/lich-su"
              title="Lịch sử xem phim"
              aria-label="Lịch sử xem phim"
              className={`p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/lich-su'
                  ? 'text-white bg-[#1f1f1f]'
                  : 'text-[#a3a3a3] hover:text-white hover:bg-[#141414]'
              }`}
            >
              <History className="w-5 h-5" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Toggle Navigation Menu"
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-[#181818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              >
                {link.name}
              </Link>
            ))}

            {/* Mobile Genres Accordion */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider px-3 mb-2">
                Thể Loại
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {genres.slice(0, 16).map((g) => (
                  <Link
                    key={g.slug}
                    href={`/the-loai/${g.slug}`}
                    className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Countries Accordion */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider px-3 mb-2">
                Quốc Gia
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {countries.slice(0, 12).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/quoc-gia/${c.slug}`}
                    className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
                  >
                    {c.name}
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
