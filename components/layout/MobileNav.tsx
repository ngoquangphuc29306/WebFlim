'use client';

import React, { useEffect, useRef, useState } from 'react';
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MobileNav({
  navLinks,
  genres = [],
  countries: initialCountries = [],
  years: initialYears = [],
  onClose,
}: MobileNavProps) {
  const [expandedSection, setExpandedSection] = useState<'genre' | 'country' | 'year' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { countries, loading: countryLoading, loadCountries } = useTaxonomyCountries(initialCountries);
  const { years, loading: yearLoading, loadYears } = useTaxonomyYears(initialYears);

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const firstFocusable = navRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !navRef.current) return;

      const focusableElements = Array.from(
        navRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, []);

  const toggleSection = (section: 'genre' | 'country' | 'year') => {
    if (section === 'country') {
      loadCountries();
    } else if (section === 'year') {
      loadYears();
    }
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div
      ref={navRef}
      role="dialog"
      aria-label="Menu điều hướng"
      aria-modal="true"
      className="lg:hidden bg-[#0c0c0c]/98 backdrop-blur-md border-b border-[#1f1f1f] px-4 pt-2 pb-6 max-h-[80vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200"
    >
      <div className="space-y-1 py-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium text-[#f5f5f5] hover:bg-[#181818] flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
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
            className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#141414] border border-[#2a2a2a] hover:bg-[#1f1f1f] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <Bookmark className="w-4 h-4 text-[#e50914]" />
            <span>Yêu thích</span>
          </Link>
          <Link
            href="/lich-su"
            onClick={onClose}
            className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#141414] border border-[#2a2a2a] hover:bg-[#1f1f1f] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <History className="w-4 h-4 text-[#e50914]" />
            <span>Lịch sử</span>
          </Link>
        </div>

        {/* Mobile Collapsible: Thể Loại */}
        <div className="pt-1 border-t border-[#1a1a1a]">
          <button
            type="button"
            onClick={() => toggleSection('genre')}
            aria-expanded={expandedSection === 'genre'}
            className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-[#161616] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <span>Thể Loại ({genres.length})</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'genre' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'genre' && (
            <div className="grid grid-cols-2 gap-1 px-1 py-1 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
              {genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  onClick={onClose}
                  className="min-h-[40px] px-2.5 py-2 rounded-lg text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
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
            aria-expanded={expandedSection === 'country'}
            className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-[#161616] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <span>Quốc Gia {countries.length > 0 ? `(${countries.length})` : ''}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'country' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'country' && (
            <div className="px-1 py-1 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
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
                      className="min-h-[40px] px-2.5 py-2 rounded-lg text-xs text-[#a3a3a3] hover:text-white hover:bg-[#181818] truncate flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
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
            aria-expanded={expandedSection === 'year'}
            className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-[#a3a3a3] hover:text-white uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-[#161616] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <span>Năm Sản Xuất {years.length > 0 ? `(${years.length})` : ''}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedSection === 'year' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'year' && (
            <div className="px-1 py-1 max-h-44 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
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
                      className="min-h-[38px] px-2 py-1.5 rounded-lg text-xs text-center text-[#a3a3a3] hover:text-white hover:bg-[#181818] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
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
