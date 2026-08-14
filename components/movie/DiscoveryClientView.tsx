'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Filter, RotateCcw, X, ChevronDown, Loader2 } from 'lucide-react';
import type {
  CategoryModel,
  CountryModel,
  MovieBrowseFilter,
  MovieCardModel,
  MovieProviderCapabilities,
  VSMovPagination,
  YearOptionModel,
} from '@/types/movie';
import {
  buildMovieBrowseUrl,
  countActiveBrowseFilters,
  withBrowseFilterChange,
} from '@/lib/api/discovery-resolver';
import DiscoveryFilterDialog from '@/components/movie/DiscoveryFilterDialog';
import MovieGrid from '@/components/movie/MovieGrid';
import Pagination from '@/components/movie/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

interface DiscoveryClientViewProps {
  filters: MovieBrowseFilter;
  genres: CategoryModel[];
  countries: CountryModel[];
  years: YearOptionModel[];
  items: MovieCardModel[];
  pagination: VSMovPagination;
  title: string;
  error?: string | null;
  capabilities: MovieProviderCapabilities;
}

const TYPE_LABELS: Record<string, string> = {
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'tv-shows': 'TV shows',
  'hoat-hinh': 'Hoạt hình',
};

const LANGUAGE_LABELS: Record<string, string> = {
  vietsub: 'Vietsub',
  'thuyet-minh': 'Thuyết minh',
  'long-tieng': 'Lồng tiếng',
};

const SORT_LABELS: Record<string, string> = {
  updated: 'Mới cập nhật',
  created: 'Mới đăng',
  year: 'Năm phát hành',
};

export default function DiscoveryClientView({
  filters,
  genres,
  countries,
  years,
  items,
  pagination,
  title,
  error,
  capabilities,
}: DiscoveryClientViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeCount = countActiveBrowseFilters(filters);
  const selectedGenreName = genres.find((genre) => genre.slug === filters.genre)?.name ?? filters.genre;
  const selectedCountryName = countries.find((country) => country.slug === filters.country)?.name ?? filters.country;

  const updateFilters = (change: Partial<MovieBrowseFilter>) => {
    startTransition(() => {
      router.push(buildMovieBrowseUrl(withBrowseFilterChange(filters, change)));
    });
  };

  const selectedYear = filters.year ?? (filters.yearFrom && filters.yearTo ? `${filters.yearFrom}–${filters.yearTo}` : undefined);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6">
      {/* Top Context & Discovery Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs sm:text-sm font-semibold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Danh mục phim</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Khám Phá Phim</h1>
          <p className="text-xs sm:text-sm text-[#a3a3a3] max-w-2xl">
            Lọc phim theo thể loại, quốc gia, năm sản xuất, ngôn ngữ và cách sắp xếp.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {isPending && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#e50914] bg-[#e50914]/10 border border-[#e50914]/30 px-3 py-2 rounded-xl animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Đang tải phim...</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="Mở bộ lọc phim đầy đủ"
            className={`px-5 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-h-[44px] ${
              activeCount > 0
                ? 'bg-[#e50914] hover:bg-[#b80710] shadow-[#e50914]/30 ring-2 ring-[#e50914]/50'
                : 'bg-[#1e1e1e] hover:bg-[#282828] border border-[#333] hover:border-[#444]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Bộ Lọc Phim</span>
            {activeCount > 0 && (
              <span className="bg-white text-[#e50914] text-xs font-black px-2 py-0.5 rounded-full shadow">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Quick Filters Bar */}
      <div className="hidden lg:flex items-center gap-3 bg-[#121212] border border-[#242424] p-3.5 rounded-2xl overflow-x-auto">
        <span className="text-xs font-bold text-[#888] uppercase tracking-wider pl-2 pr-1 shrink-0">
          Lọc nhanh:
        </span>

        {/* Quick Type Select */}
        <div className="relative shrink-0">
          <select
            value={filters.type || ''}
            onChange={(e) => updateFilters({ type: e.target.value ? (e.target.value as MovieBrowseFilter['type']) : undefined })}
            aria-label="Lọc nhanh loại phim"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors"
          >
            <option value="">Tất cả loại phim</option>
            <option value="phim-le">Phim lẻ</option>
            <option value="phim-bo">Phim bộ</option>
            <option value="hoat-hinh">Hoạt hình</option>
            <option value="tv-shows">TV Shows</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Genre Select */}
        <div className="relative shrink-0">
          <select
            value={filters.genre || ''}
            onChange={(e) => updateFilters({ genre: e.target.value || undefined })}
            aria-label="Lọc nhanh thể loại"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors max-w-[160px] truncate"
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Country Select */}
        <div className="relative shrink-0">
          <select
            value={filters.country || ''}
            onChange={(e) => updateFilters({ country: e.target.value || undefined })}
            aria-label="Lọc nhanh quốc gia"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors max-w-[150px] truncate"
          >
            <option value="">Tất cả quốc gia</option>
            {countries.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Year Select */}
        <div className="relative shrink-0">
          <select
            value={filters.year || ''}
            onChange={(e) => updateFilters({ year: e.target.value ? Number(e.target.value) : undefined, yearFrom: undefined, yearTo: undefined })}
            aria-label="Lọc nhanh năm phát hành"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors"
          >
            <option value="">Tất cả các năm</option>
            {years.map((y) => (
              <option key={y.slug || y.year} value={y.year}>
                {y.name || y.year}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Language Select */}
        <div className="relative shrink-0">
          <select
            value={filters.language || ''}
            onChange={(e) => updateFilters({ language: e.target.value ? (e.target.value as MovieBrowseFilter['language']) : undefined })}
            disabled={!capabilities.languageFilter}
            aria-label="Lọc nhanh ngôn ngữ"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Tất cả ngôn ngữ</option>
            <option value="vietsub">Vietsub</option>
            <option value="thuyet-minh">Thuyết minh</option>
            <option value="long-tieng">Lồng tiếng</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Sort Select */}
        <div className="relative shrink-0">
          <select
            value={`${filters.sort || ''}${filters.order ? `:${filters.order}` : ''}`}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                updateFilters({ sort: undefined, order: undefined });
              } else {
                const [s, o] = val.split(':');
                updateFilters({
                  sort: (s as MovieBrowseFilter['sort']) || undefined,
                  order: (o as MovieBrowseFilter['order']) || undefined,
                });
              }
            }}
            disabled={!capabilities.sorting}
            aria-label="Sắp xếp phim"
            className="appearance-none bg-[#1a1a1a] hover:bg-[#222] border border-[#2e2e2e] hover:border-[#444] text-xs font-semibold text-[#e5e5e5] pl-3.5 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-[#e50914] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Sắp xếp: Mặc định</option>
            <option value="updated:desc">Mới cập nhật (Mới → Cũ)</option>
            <option value="updated:asc">Mới cập nhật (Cũ → Mới)</option>
            <option value="created:desc">Mới đăng (Mới nhất)</option>
            <option value="created:asc">Mới đăng (Cũ nhất)</option>
            <option value="year:desc">Năm phát hành (Mới nhất)</option>
            <option value="year:asc">Năm phát hành (Cũ nhất)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#737373] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="ml-auto text-xs font-semibold text-[#e50914] hover:text-[#ff4d4d] px-3 py-2 rounded-xl hover:bg-[#e50914]/10 transition-colors shrink-0"
        >
          + Thêm tùy chọn nâng cao
        </button>
      </div>

      {/* Active Filter Chips Bar */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-[#141414] border border-[#262626] p-3 sm:p-4 rounded-xl">
          <span className="text-xs font-semibold text-[#a3a3a3] mr-1">Đang lọc theo:</span>
          {filters.genre && <FilterChip label={`Thể loại: ${selectedGenreName}`} onRemove={() => updateFilters({ genre: undefined })} />}
          {filters.country && <FilterChip label={`Quốc gia: ${selectedCountryName}`} onRemove={() => updateFilters({ country: undefined })} />}
          {selectedYear && <FilterChip label={`Năm: ${selectedYear}`} onRemove={() => updateFilters({ year: undefined, yearFrom: undefined, yearTo: undefined })} />}
          {filters.type && <FilterChip label={`Loại: ${TYPE_LABELS[filters.type] || filters.type}`} onRemove={() => updateFilters({ type: undefined })} />}
          {filters.language && <FilterChip label={`Ngôn ngữ: ${LANGUAGE_LABELS[filters.language] || filters.language}`} onRemove={() => updateFilters({ language: undefined })} />}
          {(filters.sort || filters.order) && (
            <FilterChip
              label={`Sắp xếp: ${filters.sort ? SORT_LABELS[filters.sort] || filters.sort : 'Mặc định'}${filters.order ? ` (${filters.order === 'asc' ? 'tăng dần' : 'giảm dần'})` : ''}`}
              onRemove={() => updateFilters({ sort: undefined, order: undefined })}
            />
          )}
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                router.push('/kham-pha');
              });
            }}
            className="ml-auto text-xs font-semibold text-[#a3a3a3] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#222] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#e50914]" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`space-y-6 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {error ? (
          <ErrorState description={error} onRetry={() => router.refresh()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy phim phù hợp"
            description="Không có bộ phim nào khớp với các tiêu chí lọc hiện tại. Thử bỏ bớt hoặc thay đổi bộ lọc."
            icon="search"
            actionLabel="Chỉnh sửa bộ lọc"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h2>
              <span className="text-xs text-[#a3a3a3] font-medium text-right">
                <span className="hidden sm:inline">
                  Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} phim)
                </span>
                <span className="sm:hidden">
                  {pagination.currentPage}/{pagination.totalPages} · {pagination.totalItems} phim
                </span>
              </span>
            </div>
            <MovieGrid movies={items} />
            {pagination.totalPages > 1 && (
              <div className="pt-6">
                <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} baseUrl={buildMovieBrowseUrl(filters)} />
              </div>
            )}
          </>
        )}
      </div>

      {dialogOpen && (
        <DiscoveryFilterDialog
          isOpen
          onClose={() => setDialogOpen(false)}
          currentFilters={filters}
          genres={genres}
          countries={countries}
          years={years}
          capabilities={capabilities}
          onApply={updateFilters}
        />
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs font-semibold bg-[#e50914]/15 text-[#ff6666] border border-[#e50914]/30 max-w-full truncate">
      <span className="truncate max-w-[200px] sm:max-w-none">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Xóa ${label}`}
        className="w-6 h-6 min-w-[24px] min-h-[24px] flex items-center justify-center hover:bg-[#e50914] hover:text-white text-[#ff6666] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
