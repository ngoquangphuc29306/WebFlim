'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { CategoryModel, CountryModel, YearOptionModel } from '@/types/movie';
import { useTaxonomyCountries, useTaxonomyYears } from '@/lib/hooks/useTaxonomy';

interface TaxonomyDropdownsProps {
  genres?: CategoryModel[];
  countries?: CountryModel[];
  years?: YearOptionModel[];
  pathname: string;
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

export default function TaxonomyDropdowns({
  genres = [],
  countries: initialCountries = [],
  years: initialYears = [],
  pathname,
}: TaxonomyDropdownsProps) {
  const [activeDropdown, setActiveDropdown] = useState<'genre' | 'country' | 'year' | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');

  const { countries, loading: countryLoading, loadCountries } = useTaxonomyCountries(initialCountries);
  const { years, loading: yearLoading, loadYears } = useTaxonomyYears(initialYears);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click ONLY when a dropdown is open
  useEffect(() => {
    if (!activeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const handleOpenCountry = () => {
    loadCountries();
    setActiveDropdown((prev) => (prev === 'country' ? null : 'country'));
  };

  const handleOpenYear = () => {
    loadYears();
    setActiveDropdown((prev) => (prev === 'year' ? null : 'year'));
  };

  // Derived filtered lists
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

  return (
    <div className="flex items-center gap-1 xl:gap-1.5" ref={dropdownRef}>
      {/* Dropdown: Thể Loại */}
      <div
        className="relative"
      >
        <button
          type="button"
          onClick={() => setActiveDropdown((prev) => (prev === 'genre' ? null : 'genre'))}
          aria-expanded={activeDropdown === 'genre'}
          className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
            pathname.startsWith('/the-loai')
              ? 'text-[#f5f5f5] bg-[#181818] font-semibold border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
          }`}
        >
          <span>Thể Loại</span>
          <ChevronDown
            className={`w-3.5 h-3.5 xl:w-4 xl:h-4 opacity-70 transition-transform duration-200 ${
              activeDropdown === 'genre' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {activeDropdown === 'genre' && (
          <div className="absolute top-full left-0 w-[480px] bg-[#121212] border border-[#2a2a2a] rounded-xl p-4 shadow-2xl grid grid-cols-3 gap-1.5 z-50 animate-in fade-in duration-150 max-h-96 overflow-y-auto custom-scrollbar">
            {genres.length > 0 ? (
              genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  onClick={() => setActiveDropdown(null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-[#a3a3a3] hover:text-white hover:bg-[#1c1c1c] transition-colors truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
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
      >
        <button
          type="button"
          onClick={handleOpenCountry}
          aria-expanded={activeDropdown === 'country'}
          className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
            pathname.startsWith('/quoc-gia')
              ? 'text-[#f5f5f5] bg-[#181818] font-semibold border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
          }`}
        >
          <span>Quốc Gia</span>
          <ChevronDown
            className={`w-3.5 h-3.5 xl:w-4 xl:h-4 opacity-70 transition-transform duration-200 ${
              activeDropdown === 'country' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {activeDropdown === 'country' && (
          <div className="absolute top-full left-0 w-[400px] bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 shadow-2xl z-50 animate-in fade-in duration-150">
            {countryLoading && countries.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải danh sách quốc gia...</span>
              </div>
            ) : (
              <>
                {/* Search input */}
                <div className="mb-2 relative">
                  <input
                    type="text"
                    placeholder="Tìm quốc gia..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    aria-label="Tìm kiếm quốc gia"
                    className="w-full bg-[#161616] text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#2a2a2a] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {!countrySearch.trim() && popularCountries.length > 0 && (
                  <div className="mb-2 border-b border-[#222] pb-2">
                    <div className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider mb-1 px-1">
                      Phổ biến
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {popularCountries.map((c) => (
                        <Link
                          key={`pop-${c.slug}`}
                          href={`/quoc-gia/${c.slug}`}
                          onClick={() => setActiveDropdown(null)}
                          className="px-2 py-1 rounded text-xs text-[#f5f5f5] bg-[#181818] border border-[#262626] hover:bg-[#e50914] hover:text-white transition-colors truncate"
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

                <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Dropdown: Năm */}
      <div
        className="relative"
      >
        <button
          type="button"
          onClick={handleOpenYear}
          aria-expanded={activeDropdown === 'year'}
          className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
            pathname.startsWith('/nam')
              ? 'text-[#f5f5f5] bg-[#181818] font-semibold border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
          }`}
        >
          <span>Năm</span>
          <ChevronDown
            className={`w-3.5 h-3.5 xl:w-4 xl:h-4 opacity-70 transition-transform duration-200 ${
              activeDropdown === 'year' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {activeDropdown === 'year' && (
          <div className="absolute top-full left-0 w-60 bg-[#121212] border border-[#2a2a2a] rounded-xl p-3.5 shadow-2xl z-50 animate-in fade-in duration-150">
            {yearLoading && years.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải danh sách năm...</span>
              </div>
            ) : (
              <>
                <div className="mb-2 relative">
                  <input
                    type="text"
                    placeholder="Tìm năm..."
                    value={yearSearch}
                    onChange={(e) => setYearSearch(e.target.value)}
                    aria-label="Tìm kiếm năm"
                    className="w-full bg-[#161616] text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#2a2a2a] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
