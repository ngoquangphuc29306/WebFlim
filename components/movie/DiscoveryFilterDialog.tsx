'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, RotateCcw, Filter, AlertTriangle } from 'lucide-react';
import {
  CategoryModel,
  CountryModel,
  YearOptionModel,
  CatalogFilters,
} from '@/types/movie';
import {
  countActiveFilters,
  resolveCatalogRequest,
} from '@/lib/api/discovery-resolver';

interface DiscoveryFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: CatalogFilters;
  genres: CategoryModel[];
  countries: CountryModel[];
  years: YearOptionModel[];
  onApply: (filters: CatalogFilters) => void;
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

export default function DiscoveryFilterDialog({
  isOpen,
  onClose,
  currentFilters,
  genres = [],
  countries = [],
  years = [],
  onApply,
}: DiscoveryFilterDialogProps) {
  // Local draft state
  const [draft, setDraft] = useState<CatalogFilters>(currentFilters);
  const [countrySearch, setCountrySearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Sync draft state during render when modal opens
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setDraft({
        genre: currentFilters.genre,
        country: currentFilters.country,
        year: currentFilters.year,
        type: currentFilters.type,
      });
      setCountrySearch('');
      setYearSearch('');
    }
  }

  // Handle focus memory and auto-focus when opened
  useEffect(() => {
    if (!isOpen) return;

    if (document.activeElement instanceof HTMLElement) {
      triggerElementRef.current = document.activeElement;
    }

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Restore focus on close
  const handleClose = React.useCallback(() => {
    onClose();
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
  }, [onClose]);

  // Keyboard navigation: Escape key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock background body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Popular vs Filtered countries
  const popularCountries = useMemo(() => {
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

  if (!isOpen) return null;

  const activeDraftCount = countActiveFilters(draft);

  // Single Source of Truth for Filter Capabilities using discovery resolver
  const resolution = resolveCatalogRequest({ ...draft, page: 1 });
  const isSupportedCombination = resolution.supported;
  const unsupportedReason = resolution.reason;

  const handleToggleGenre = (slug: string) => {
    setDraft((prev) => ({
      ...prev,
      genre: prev.genre === slug ? undefined : slug,
    }));
  };

  const handleToggleCountry = (slug: string) => {
    setDraft((prev) => ({
      ...prev,
      country: prev.country === slug ? undefined : slug,
    }));
  };

  const handleToggleYear = (yearNum: number) => {
    setDraft((prev) => ({
      ...prev,
      year: prev.year === yearNum ? undefined : yearNum,
    }));
  };

  const handleToggleType = (typeVal: 'series' | 'single') => {
    setDraft((prev) => ({
      ...prev,
      type: prev.type === typeVal ? undefined : typeVal,
    }));
  };

  const handleResetDraft = () => {
    setDraft({});
  };

  const handleApply = () => {
    if (!isSupportedCombination) return;
    onApply({ ...draft, page: 1 });
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-dialog-title"
    >
      {/* Backdrop overlay click */}
      <div className="absolute inset-0 hidden sm:block" onClick={handleClose} aria-hidden="true" />

      {/* Modal Card Container (Full screen on mobile < sm, centered modal on sm+) */}
      <div
        ref={dialogRef}
        className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] bg-[#121212] border-0 sm:border border-[#262626] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header (Sticky top) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#262626] bg-[#161616] shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#e50914]" />
            <h2 id="filter-dialog-title" className="text-base sm:text-lg font-bold text-white">
              Bộ Lọc Phim
            </h2>
            {activeDraftCount > 0 && (
              <span className="bg-[#e50914] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {activeDraftCount}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Đóng bộ lọc"
            className="p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filter Options Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 divide-y divide-[#262626]">
          {/* Section 1: Thể Loại */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                1. Thể Loại Phim
              </h3>
              {draft.genre && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, genre: undefined }))}
                  className="text-[11px] text-[#e50914] hover:underline"
                >
                  Xóa chọn thể loại
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => {
                const isSelected = draft.genre === g.slug;
                return (
                  <button
                    key={g.slug}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleGenre(g.slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                      isSelected
                        ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/30 font-semibold'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Quốc Gia */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                2. Quốc Gia ({countries.length})
              </h3>
              {draft.country && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, country: undefined }))}
                  className="text-[11px] text-[#e50914] hover:underline"
                >
                  Xóa chọn quốc gia
                </button>
              )}
            </div>

            {/* Search Country */}
            <div className="relative max-w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Tìm tên quốc gia..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                aria-label="Tìm kiếm quốc gia trong bộ lọc"
                className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-3 py-2 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]"
              />
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Popular countries chips when no search term */}
            {!countrySearch.trim() && popularCountries.length > 0 && (
              <div>
                <div className="text-[10px] text-[#737373] mb-1">Quốc gia phổ biến:</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {popularCountries.map((c) => {
                    const isSelected = draft.country === c.slug;
                    return (
                      <button
                        key={`pop-${c.slug}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleCountry(c.slug)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#e50914] text-white font-semibold'
                            : 'bg-[#1a1a1a] text-[#d4d4d4] hover:bg-[#262626]'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All countries scroll grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredCountries.map((c) => {
                const isSelected = draft.country === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleCountry(c.slug)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left truncate transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] ${
                      isSelected
                        ? 'bg-[#e50914] text-white font-semibold'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Năm Sản Xuất */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                3. Năm Sản Xuất ({years.length})
              </h3>
              {draft.year && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, year: undefined }))}
                  className="text-[11px] text-[#e50914] hover:underline"
                >
                  Xóa chọn năm
                </button>
              )}
            </div>

            {/* Search Year */}
            <div className="relative max-w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Nhập năm (VD: 2024)..."
                value={yearSearch}
                onChange={(e) => setYearSearch(e.target.value)}
                aria-label="Tìm kiếm năm trong bộ lọc"
                className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-3 py-2 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]"
              />
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredYears.map((y) => {
                const isSelected = draft.year === y.year;
                return (
                  <button
                    key={y.slug || y.year}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleYear(y.year)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] ${
                      isSelected
                        ? 'bg-[#e50914] text-white font-semibold'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'
                    }`}
                  >
                    {y.name || y.year}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Loại Phim */}
          <div className="pt-5 space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                4. Loại Phim
              </h3>
              {draft.type && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, type: undefined }))}
                  className="text-[11px] text-[#e50914] hover:underline"
                >
                  Xóa chọn loại phim
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={draft.type === 'series'}
                onClick={() => handleToggleType('series')}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  draft.type === 'series'
                    ? 'bg-[#e50914] text-white font-bold shadow-md shadow-[#e50914]/30'
                    : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'
                }`}
              >
                Phim Bộ
              </button>

              <button
                type="button"
                aria-pressed={draft.type === 'single'}
                onClick={() => handleToggleType('single')}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  draft.type === 'single'
                    ? 'bg-[#e50914] text-white font-bold shadow-md shadow-[#e50914]/30'
                    : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'
                }`}
              >
                Phim Lẻ
              </button>
            </div>
          </div>
        </div>

        {/* Unsupported Combination Banner (Evaluated dynamically via resolver) */}
        {!isSupportedCombination && (
          <div className="px-4 sm:px-5 py-2.5 bg-amber-950/50 border-t border-amber-800/50 flex items-center gap-2 text-amber-200 text-xs shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {unsupportedReason ||
                'Tổ hợp bộ lọc chưa được nguồn dữ liệu hỗ trợ trực tiếp. Vui lòng chọn thêm thể loại hoặc quốc gia.'}
            </span>
          </div>
        )}

        {/* Footer (Sticky bottom with safe area padding) */}
        <div
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-t border-[#262626] bg-[#161616] shrink-0"
        >
          <button
            type="button"
            onClick={handleResetDraft}
            disabled={activeDraftCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#262626] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại tất cả</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isSupportedCombination}
              className="px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#e50914] hover:bg-[#b80710] disabled:opacity-40 disabled:hover:bg-[#e50914] shadow-lg shadow-[#e50914]/30 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Áp dụng bộ lọc</span>
              {activeDraftCount > 0 && (
                <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                  {activeDraftCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
