'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, History, ChevronDown } from 'lucide-react';
import { CategoryModel, CountryModel, YearOptionModel } from '@/types/movie';
import { useTaxonomyCountries, useTaxonomyYears } from '@/lib/hooks/useTaxonomy';

interface NavLinkItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MobileNavProps {
  navLinks: NavLinkItem[];
  genres?: CategoryModel[];
  countries?: CountryModel[];
  years?: YearOptionModel[];
  onClose: () => void;
}

export default function MobileNav({
  navLinks,
  genres = [],
  countries: initialCountries = [],
  years: initialYears = [],
  onClose,
}: MobileNavProps) {
  const [expandedSection, setExpandedSection] = useState<'genre' | 'country' | 'year' | null>(null);

  const { countries, loading: countryLoading, loadCountries } = useTaxonomyCountries(initialCountries);
  const { years, loading: yearLoading, loadYears } = useTaxonomyYears(initialYears);

  const toggleSection = (section: 'genre' | 'country' | 'year') => {
    if (section === 'country') {
      loadCountries();
    } else if (section === 'year') {
      loadYears();
    }
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="lg:hidden bg-[#0c0c0c] border-b border-[#1f1f1f] px-4 pt-3 pb-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
      <div className="space-y-1 py-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
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
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#161616] border border-[#262626] hover:bg-[#222222] flex items-center gap-2"
          >
            <Bookmark className="w-4 h-4 text-[#e50914]" />
            <span>Yêu thích</span>
          </Link>
          <Link
            href="/lich-su"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#161616] border border-[#262626] hover:bg-[#222222] flex items-center gap-2"
          >
            <History className="w-4 h-4 text-[#e50914]" />
            <span>Lịch sử</span>
          </Link>
        </div>

        {/* Mobile Collapsible: Thể Loại */}
        <div className="pt-2 border-t border-[#1a1a1a]">
          <button
            type="button"
            onClick={() => toggleSection('genre')}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded hover:bg-[#141414]"
          >
            <span>Thể Loại ({genres.length})</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'genre' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'genre' && (
            <div className="grid grid-cols-2 gap-1 px-1 py-1 max-h-48 overflow-y-auto animate-in fade-in duration-150">
              {genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Collapsible: Quốc Gia */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => toggleSection('country')}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded hover:bg-[#141414]"
          >
            <span>Quốc Gia {countries.length > 0 ? `(${countries.length})` : ''}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'country' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'country' && (
            <div className="px-1 py-1 max-h-48 overflow-y-auto animate-in fade-in duration-150">
              {countryLoading && countries.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải quốc gia...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {countries.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/quoc-gia/${c.slug}`}
                      onClick={onClose}
                      className="px-2.5 py-1.5 rounded text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Collapsible: Năm Sản Xuất */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => toggleSection('year')}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded hover:bg-[#141414]"
          >
            <span>Năm Sản Xuất {years.length > 0 ? `(${years.length})` : ''}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'year' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'year' && (
            <div className="px-1 py-1 max-h-40 overflow-y-auto animate-in fade-in duration-150">
              {yearLoading && years.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#a3a3a3] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải năm sản xuất...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {years.map((y) => (
                    <Link
                      key={y.slug || y.year}
                      href={`/nam/${y.slug || y.year}`}
                      onClick={onClose}
                      className="px-2 py-1.5 rounded text-xs text-center text-[#a3a3a3] hover:text-white hover:bg-[#181818]"
                    >
                      {y.name || y.year}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
