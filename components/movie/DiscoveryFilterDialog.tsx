'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Filter, RotateCcw, Search, X } from 'lucide-react';
import type {
  CategoryModel,
  CountryModel,
  MovieBrowseFilter,
  MovieBrowseLanguage,
  MovieBrowseOrder,
  MovieBrowseSort,
  MovieBrowseType,
  MovieProviderCapabilities,
  YearOptionModel,
} from '@/types/movie';
import { countActiveBrowseFilters, getUnsupportedBrowseFilterReason } from '@/lib/api/discovery-resolver';

interface DiscoveryFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: MovieBrowseFilter;
  genres: CategoryModel[];
  countries: CountryModel[];
  years: YearOptionModel[];
  capabilities: MovieProviderCapabilities;
  onApply: (filters: MovieBrowseFilter) => void;
}

const POPULAR_SLUGS = ['han-quoc', 'trung-quoc', 'au-my', 'nhat-ban', 'viet-nam', 'thai-lan', 'hong-kong', 'dai-loan'];
const TYPE_OPTIONS: ReadonlyArray<{ value: MovieBrowseType; label: string }> = [
  { value: 'phim-bo', label: 'Phim Bộ' },
  { value: 'phim-le', label: 'Phim Lẻ' },
  { value: 'hoat-hinh', label: 'Hoạt Hình' },
  { value: 'tv-shows', label: 'TV Shows' },
];
const LANGUAGE_OPTIONS: ReadonlyArray<{ value: MovieBrowseLanguage; label: string }> = [
  { value: 'vietsub', label: 'Vietsub' },
  { value: 'thuyet-minh', label: 'Thuyết minh' },
  { value: 'long-tieng', label: 'Lồng tiếng' },
];
const SORT_OPTIONS: ReadonlyArray<{ value: MovieBrowseSort; label: string }> = [
  { value: 'updated', label: 'Mới cập nhật' },
  { value: 'created', label: 'Mới đăng' },
  { value: 'year', label: 'Năm phát hành' },
];

export default function DiscoveryFilterDialog({
  isOpen,
  onClose,
  currentFilters,
  genres,
  countries,
  years,
  capabilities,
  onApply,
}: DiscoveryFilterDialogProps) {
  const [draft, setDraft] = useState<MovieBrowseFilter>(currentFilters);
  const [countrySearch, setCountrySearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    triggerElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
    triggerElementRef.current?.focus();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  const popularCountries = useMemo(() => countries.filter((country) => POPULAR_SLUGS.includes(country.slug)), [countries]);
  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    return term ? countries.filter((country) => country.name.toLowerCase().includes(term)) : countries;
  }, [countries, countrySearch]);
  const filteredYears = useMemo(() => {
    const term = yearSearch.trim();
    return term ? years.filter((year) => String(year.year).includes(term) || year.name.includes(term)) : years;
  }, [years, yearSearch]);

  if (!isOpen) return null;

  const activeDraftCount = countActiveBrowseFilters(draft);
  const unsupportedReason = getUnsupportedBrowseFilterReason(draft, capabilities);
  const isSupportedCombination = !unsupportedReason;
  const activeRange = Boolean(draft.yearFrom || draft.yearTo);
  const setYearValue = (key: 'yearFrom' | 'yearTo', value: string) => {
    const numericValue = /^\d{4}$/.test(value) ? Number(value) : undefined;
    setDraft((previous) => ({ ...previous, year: undefined, [key]: numericValue }));
  };
  const toggleType = (type: MovieBrowseType) => setDraft((previous) => ({ ...previous, type: previous.type === type ? undefined : type }));
  const toggleLanguage = (language: MovieBrowseLanguage) => setDraft((previous) => ({ ...previous, language: previous.language === language ? undefined : language }));
  const toggleSort = (sort: MovieBrowseSort) => setDraft((previous) => ({ ...previous, sort: previous.sort === sort ? undefined : sort }));
  const toggleOrder = (order: MovieBrowseOrder) => setDraft((previous) => ({ ...previous, order: previous.order === order ? undefined : order }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title">
      <div className="absolute inset-0 hidden sm:block" onClick={handleClose} aria-hidden="true" />
      <div ref={dialogRef} className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] bg-[#121212] border-0 sm:border border-[#262626] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#262626] bg-[#161616] shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#e50914]" />
            <h2 id="filter-dialog-title" className="text-base sm:text-lg font-bold text-white">Bộ Lọc Phim</h2>
            {activeDraftCount > 0 && <span className="bg-[#e50914] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{activeDraftCount}</span>}
          </div>
          <button ref={closeButtonRef} type="button" onClick={handleClose} aria-label="Đóng bộ lọc" className="p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 divide-y divide-[#262626]">
          <FilterSection title="1. Thể Loại Phim">
            <div className="flex flex-wrap gap-1.5">{genres.map((genre) => <SelectionButton key={genre.slug} selected={draft.genre === genre.slug} onClick={() => setDraft((previous) => ({ ...previous, genre: previous.genre === genre.slug ? undefined : genre.slug }))}>{genre.name}</SelectionButton>)}</div>
          </FilterSection>

          <FilterSection title={`2. Quốc Gia (${countries.length})`} className="pt-5">
            <SearchInput value={countrySearch} onChange={setCountrySearch} placeholder="Tìm tên quốc gia..." label="Tìm kiếm quốc gia trong bộ lọc" />
            {!countrySearch.trim() && popularCountries.length > 0 && <div><div className="text-[10px] text-[#737373] mb-1">Quốc gia phổ biến:</div><div className="flex flex-wrap gap-1.5">{popularCountries.map((country) => <SelectionButton key={`popular-${country.slug}`} selected={draft.country === country.slug} onClick={() => setDraft((previous) => ({ ...previous, country: previous.country === country.slug ? undefined : country.slug }))}>{country.name}</SelectionButton>)}</div></div>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">{filteredCountries.map((country) => <SelectionButton key={country.slug} selected={draft.country === country.slug} onClick={() => setDraft((previous) => ({ ...previous, country: previous.country === country.slug ? undefined : country.slug }))} className="text-left truncate">{country.name}</SelectionButton>)}</div>
          </FilterSection>

          <FilterSection title={`3. Năm Sản Xuất (${years.length})`} className="pt-5">
            <SearchInput value={yearSearch} onChange={setYearSearch} placeholder="Nhập năm (VD: 2024)..." label="Tìm kiếm năm trong bộ lọc" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">{filteredYears.map((year) => <SelectionButton key={year.slug || year.year} selected={draft.year === year.year} onClick={() => setDraft((previous) => ({ ...previous, year: previous.year === year.year ? undefined : year.year, yearFrom: undefined, yearTo: undefined }))}>{year.name || year.year}</SelectionButton>)}</div>
            <fieldset disabled={!capabilities.yearRange} className="space-y-2 disabled:opacity-50"><legend className="text-[11px] font-medium text-[#a3a3a3]">Hoặc lọc theo khoảng năm</legend><div className="flex flex-wrap items-center gap-2"><input value={draft.yearFrom ?? ''} onChange={(event) => setYearValue('yearFrom', event.target.value)} inputMode="numeric" placeholder="Từ năm" aria-label="Từ năm" className="w-28 bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]" /><span className="text-[#737373]">đến</span><input value={draft.yearTo ?? ''} onChange={(event) => setYearValue('yearTo', event.target.value)} inputMode="numeric" placeholder="Đến năm" aria-label="Đến năm" className="w-28 bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]" />{activeRange && <button type="button" onClick={() => setDraft((previous) => ({ ...previous, yearFrom: undefined, yearTo: undefined }))} className="text-[11px] text-[#e50914] hover:underline">Xóa khoảng năm</button>}</div></fieldset>
          </FilterSection>

          <FilterSection title="4. Loại Phim" className="pt-5"><div className="flex flex-wrap gap-2">{TYPE_OPTIONS.map((option) => <SelectionButton key={option.value} selected={draft.type === option.value} disabled={!capabilities.browseTypes.includes(option.value)} onClick={() => toggleType(option.value)} className="px-4 py-2.5">{option.label}</SelectionButton>)}</div></FilterSection>
          <FilterSection title="5. Ngôn Ngữ" className="pt-5"><div className="flex flex-wrap gap-2">{LANGUAGE_OPTIONS.map((option) => <SelectionButton key={option.value} selected={draft.language === option.value} disabled={!capabilities.languageFilter} onClick={() => toggleLanguage(option.value)} className="px-4 py-2.5">{option.label}</SelectionButton>)}</div></FilterSection>
          <FilterSection title="6. Sắp Xếp" className="pt-5 pb-4"><div className="flex flex-wrap gap-2">{SORT_OPTIONS.map((option) => <SelectionButton key={option.value} selected={draft.sort === option.value} disabled={!capabilities.sorting} onClick={() => toggleSort(option.value)} className="px-4 py-2.5">{option.label}</SelectionButton>)}</div><div className="flex flex-wrap gap-2 pt-2"><SelectionButton selected={draft.order === 'desc'} disabled={!capabilities.sorting} onClick={() => toggleOrder('desc')}>Giảm dần</SelectionButton><SelectionButton selected={draft.order === 'asc'} disabled={!capabilities.sorting} onClick={() => toggleOrder('asc')}>Tăng dần</SelectionButton></div></FilterSection>
        </div>

        {!isSupportedCombination && <div className="px-4 sm:px-5 py-2.5 bg-amber-950/50 border-t border-amber-800/50 flex items-center gap-2 text-amber-200 text-xs shrink-0"><AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" /><span>{unsupportedReason}</span></div>}
        <div style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-t border-[#262626] bg-[#161616] shrink-0">
          <button type="button" onClick={() => setDraft({})} disabled={activeDraftCount === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#262626] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"><RotateCcw className="w-3.5 h-3.5" /><span>Đặt lại tất cả</span></button>
          <div className="flex items-center gap-2"><button type="button" onClick={handleClose} className="px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-medium text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-colors">Hủy</button><button type="button" onClick={() => { if (!isSupportedCombination) return; onApply({ ...draft, page: 1 }); handleClose(); }} disabled={!isSupportedCombination} className="px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#e50914] hover:bg-[#b80710] disabled:opacity-40 disabled:hover:bg-[#e50914] shadow-lg shadow-[#e50914]/30 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span>Áp dụng bộ lọc</span>{activeDraftCount > 0 && <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px]">{activeDraftCount}</span>}</button></div>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return <section className={`space-y-3 ${className}`}><h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">{title}</h3>{children}</section>;
}

function SelectionButton({ selected, disabled = false, onClick, children, className = '' }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/30 font-semibold' : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626] border border-[#262626]'} ${className}`}>{children}</button>;
}

function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <div className="relative max-w-full sm:max-w-xs"><input type="text" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-3 py-2 rounded-md border border-[#262626] focus:outline-none focus:border-[#e50914]" /><Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" /></div>;
}
