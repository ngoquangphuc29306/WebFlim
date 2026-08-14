'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Filter, RotateCcw, X } from 'lucide-react';
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

const TYPE_LABELS = {
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'tv-shows': 'TV shows',
  'hoat-hinh': 'Hoạt hình',
} as const;

const LANGUAGE_LABELS = {
  vietsub: 'Vietsub',
  'thuyet-minh': 'Thuyết minh',
  'long-tieng': 'Lồng tiếng',
} as const;

const SORT_LABELS = {
  updated: 'Mới cập nhật',
  created: 'Mới đăng',
  year: 'Năm phát hành',
} as const;

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeCount = countActiveBrowseFilters(filters);
  const selectedGenreName = genres.find((genre) => genre.slug === filters.genre)?.name ?? filters.genre;
  const selectedCountryName = countries.find((country) => country.slug === filters.country)?.name ?? filters.country;

  const updateFilters = (change: Partial<MovieBrowseFilter>) => {
    router.push(buildMovieBrowseUrl(withBrowseFilterChange(filters, change)));
  };

  const selectedYear = filters.year ?? (filters.yearFrom && filters.yearTo ? `${filters.yearFrom}–${filters.yearTo}` : undefined);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6">
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

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="px-5 py-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm shadow-lg shadow-[#e50914]/30 transition-all flex items-center justify-center gap-2.5 self-start md:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Filter className="w-4 h-4" />
          <span>Bộ Lọc Phim</span>
          {activeCount > 0 && <span className="bg-white text-[#e50914] text-xs font-black px-2 py-0.5 rounded-full">{activeCount}</span>}
        </button>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-[#141414] border border-[#222] p-3 sm:p-4 rounded-xl">
          <span className="text-xs font-semibold text-[#a3a3a3] mr-1">Đang lọc theo:</span>
          {filters.genre && <FilterChip label={`Thể loại: ${selectedGenreName}`} onRemove={() => updateFilters({ genre: undefined })} />}
          {filters.country && <FilterChip label={`Quốc gia: ${selectedCountryName}`} onRemove={() => updateFilters({ country: undefined })} />}
          {selectedYear && <FilterChip label={`Năm: ${selectedYear}`} onRemove={() => updateFilters({ year: undefined, yearFrom: undefined, yearTo: undefined })} />}
          {filters.type && <FilterChip label={`Loại: ${TYPE_LABELS[filters.type]}`} onRemove={() => updateFilters({ type: undefined })} />}
          {filters.language && <FilterChip label={`Ngôn ngữ: ${LANGUAGE_LABELS[filters.language]}`} onRemove={() => updateFilters({ language: undefined })} />}
          {(filters.sort || filters.order) && (
            <FilterChip
              label={`Sắp xếp: ${filters.sort ? SORT_LABELS[filters.sort] : 'Mặc định'}${filters.order ? ` (${filters.order === 'asc' ? 'tăng dần' : 'giảm dần'})` : ''}`}
              onRemove={() => updateFilters({ sort: undefined, order: undefined })}
            />
          )}
          <button type="button" onClick={() => router.push('/kham-pha')} className="ml-auto text-xs font-medium text-[#a3a3a3] hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#222] transition-colors">
            <RotateCcw className="w-3 h-3 text-[#e50914]" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      <div className="space-y-6">
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
              <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
              <span className="text-xs text-[#a3a3a3]">Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} phim)</span>
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
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40">
      <span>{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Xóa ${label}`} className="p-0.5 hover:bg-[#e50914] hover:text-white rounded-full transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
