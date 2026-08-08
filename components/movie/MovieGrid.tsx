'use client';

import React from 'react';
import { MovieCardModel, VSMovPagination } from '@/types/movie';
import MovieCard from './MovieCard';
import Pagination from './Pagination';
import EmptyState from '@/components/ui/EmptyState';

interface MovieGridProps {
  movies: MovieCardModel[];
  pagination?: VSMovPagination;
  baseUrl?: string;
  emptyMessage?: string;
}

export default function MovieGrid({
  movies,
  pagination,
  baseUrl,
  emptyMessage = 'Không tìm thấy bộ phim nào phù hợp.',
}: MovieGridProps) {
  if (!movies || movies.length === 0) {
    return (
      <EmptyState
        title="Chưa có nội dung"
        description={emptyMessage}
        icon="film"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
        {movies.map((movie) => (
          <MovieCard key={movie.slug} movie={movie} />
        ))}
      </div>

      {pagination && baseUrl && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          baseUrl={baseUrl}
        />
      )}
    </div>
  );
}
