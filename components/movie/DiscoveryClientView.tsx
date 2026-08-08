'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, X, RotateCcw, AlertCircle, Compass } from 'lucide-react';
import {
  CategoryModel,
  CountryModel,
  YearOptionModel,
  MovieCardModel,
  VSMovPagination,
  CatalogFilters,
  CatalogResolverResult,
} from '@/types/movie';
import {
  buildCatalogUrl,
  countActiveFilters,
} from '@/lib/api/discovery-resolver';
import MovieGrid from '@/components/movie/MovieGrid';
import Pagination from '@/components/movie/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import DiscoveryFilterDialog from '@/components/movie/DiscoveryFilterDialog';

interface DiscoveryClientViewProps {
  filters: CatalogFilters;
  resolved: CatalogResolverResult;
  genres: CategoryModel[];
  countries: CountryModel[];
  years: YearOptionModel[];
  items: MovieCardModel[];
  pagination: VSMovPagination;
  title: string;
  error?: string | null;
}

export default function DiscoveryClientView({
  filters,
  resolved,
  genres,
  countries,
  years,
  items,
  pagination,
  title,
  error,
}: DiscoveryClientViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCount = countActiveFilters(filters);

  // Lookup names for chips
  const selectedGenreName = genres.find((g) => g.slug === filters.genre)?.name || filters.genre;
  const selectedCountryName = countries.find((c) => c.slug === filters.country)?.name || filters.country;
  const selectedTypeName =
    filters.type === 'series' ? 'Phim Bộ' : filters.type === 'single' ? 'Phim Lẻ' : undefined;

  const handleApplyFilters = (newFilters: CatalogFilters) => {
    const url = buildCatalogUrl(newFilters);
    router.push(url);
  };

  const handleRemoveGenre = () => {
    handleApplyFilters({ ...filters, genre: undefined, page: 1 });
  };

  const handleRemoveCountry = () => {
    handleApplyFilters({ ...filters, country: undefined, page: 1 });
  };

  const handleRemoveYear = () => {
    handleApplyFilters({ ...filters, year: undefined, page: 1 });
  };

  const handleRemoveType = () => {
    handleApplyFilters({ ...filters, type: undefined, page: 1 });
  };

  const handleClearAll = () => {
    router.push('/kham-pha');
  };

  const handlePageChange = (newPage: number) => {
    const url = buildCatalogUrl({ ...filters, page: newPage });
    router.push(url);
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6">
      {/* Top Banner & Filter Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e50914] text-xs sm:text-sm font-semibold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Danh Mục Phim Smarthub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Khám Phá Phim
          </h1>
          <p className="text-xs sm:text-sm text-[#a3a3a3] max-w-2xl">
            Lọc phim theo thể loại, quốc gia, năm sản xuất và loại phim.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="px-5 py-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-sm shadow-lg shadow-[#e50914]/30 transition-all flex items-center justify-center gap-2.5 self-start md:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Filter className="w-4 h-4" />
          <span>Bộ Lọc Phim</span>
          {activeCount > 0 && (
            <span className="bg-white text-[#e50914] text-xs font-black px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Active Filter Chips Bar */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-[#141414] border border-[#222] p-3 sm:p-4 rounded-xl">
          <span className="text-xs font-semibold text-[#a3a3a3] mr-1">
            Đang lọc theo:
          </span>

          {filters.genre && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40">
              <span>Thể loại: {selectedGenreName}</span>
              <button
                type="button"
                onClick={handleRemoveGenre}
                aria-label={`Xóa bộ lọc thể loại ${selectedGenreName}`}
                className="p-0.5 hover:bg-[#e50914] hover:text-white rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.country && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40">
              <span>Quốc gia: {selectedCountryName}</span>
              <button
                type="button"
                onClick={handleRemoveCountry}
                aria-label={`Xóa bộ lọc quốc gia ${selectedCountryName}`}
                className="p-0.5 hover:bg-[#e50914] hover:text-white rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.year && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40">
              <span>Năm: {filters.year}</span>
              <button
                type="button"
                onClick={handleRemoveYear}
                aria-label={`Xóa bộ lọc năm ${filters.year}`}
                className="p-0.5 hover:bg-[#e50914] hover:text-white rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.type && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e50914]/20 text-[#ff4d4d] border border-[#e50914]/40">
              <span>Loại: {selectedTypeName}</span>
              <button
                type="button"
                onClick={handleRemoveType}
                aria-label={`Xóa bộ lọc loại phim ${selectedTypeName}`}
                className="p-0.5 hover:bg-[#e50914] hover:text-white rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="ml-auto text-xs font-medium text-[#a3a3a3] hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#222] transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-[#e50914]" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}

      {/* Unsupported Combination Notice */}
      {!resolved.supported && (
        <div className="bg-[#1c1212] border border-[#e50914]/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#e50914]/20 text-[#e50914] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Tổ Hợp Bộ Lọc Chưa Được Hỗ Trợ
            </h3>
            <p className="text-xs sm:text-sm text-[#d4d4d4] max-w-lg mx-auto">
              {resolved.reason ||
                'Nguồn dữ liệu chưa hỗ trợ trực tiếp kết hợp bộ lọc này.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#e50914] hover:bg-[#b80710] transition-colors"
            >
              Chỉnh sửa bộ lọc
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#a3a3a3] hover:text-white bg-[#222] transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      {/* Results View */}
      {resolved.supported && (
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
              {/* Heading & Count */}
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {title}
                </h2>
                <span className="text-xs text-[#a3a3a3]">
                  Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalItems} phim)
                </span>
              </div>

              {/* Movie Grid */}
              <MovieGrid movies={items} />

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pt-6">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    baseUrl={buildCatalogUrl(filters)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filter Modal Dialog */}
      <DiscoveryFilterDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        currentFilters={filters}
        genres={genres}
        countries={countries}
        years={years}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
