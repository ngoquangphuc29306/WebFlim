import React from 'react';
import { MovieGridSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 space-y-6">
      {/* Header Banner Skeleton */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-4 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-[#222] rounded" />
          <div className="h-8 w-64 bg-[#222] rounded" />
          <div className="h-4 w-96 bg-[#222] rounded" />
        </div>
        <div className="h-12 w-36 bg-[#222] rounded-xl" />
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-[#222] rounded animate-pulse" />
        <MovieGridSkeleton count={16} />
      </div>
    </div>
  );
}
