import React from 'react';

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col w-full h-full animate-pulse select-none">
      <div className="w-full aspect-[2/3] rounded-lg bg-[#181818] border border-[#222]" />
      <div className="pt-2.5 space-y-2">
        <div className="h-4 bg-[#1e1e1e] rounded w-5/6" />
        <div className="flex items-center gap-2">
          <div className="h-3 bg-[#141414] rounded w-1/3" />
          <div className="h-3 bg-[#141414] rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function MovieRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="my-8 sm:my-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-[#1a1a1a] rounded animate-pulse" />
        <div className="h-4 w-20 bg-[#141414] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="w-full h-[70vh] min-h-[500px] bg-[#101010] animate-pulse relative border-b border-[#1f1f1f]">
      <div className="max-w-[1920px] mx-auto h-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col justify-end pb-12 z-10 space-y-4">
        <div className="h-5 w-28 bg-[#1c1c1c] rounded" />
        <div className="h-10 sm:h-14 w-3/4 max-w-xl bg-[#222222] rounded-lg" />
        <div className="h-4 w-1/2 max-w-md bg-[#181818] rounded" />
        <div className="flex gap-3 pt-3">
          <div className="h-11 w-36 bg-[#262626] rounded-lg" />
          <div className="h-11 w-28 bg-[#1a1a1a] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MovieDetailsSkeleton() {
  return (
    <div className="relative text-white min-h-screen pb-16 animate-pulse">
      {/* Backdrop Skeleton */}
      <div className="relative w-full h-[50vh] min-h-[380px] max-h-[550px] bg-[#121212]" />

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 sm:-mt-80 z-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
          {/* Poster Skeleton */}
          <div className="w-48 sm:w-64 md:w-72 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] w-full rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a]" />
            <div className="mt-4 h-12 w-full bg-[#e50914]/40 rounded-xl" />
          </div>

          {/* Info Column Skeleton */}
          <div className="flex-1 space-y-5 pt-2 w-full">
            <div className="space-y-2">
              <div className="h-8 sm:h-12 bg-[#222] rounded-lg w-3/4" />
              <div className="h-4 bg-[#181818] rounded w-1/2" />
            </div>

            <div className="flex gap-3">
              <div className="h-7 w-24 bg-[#1c1c1c] rounded-lg" />
              <div className="h-7 w-20 bg-[#1c1c1c] rounded-lg" />
              <div className="h-7 w-28 bg-[#1c1c1c] rounded-lg" />
            </div>

            <div className="h-32 bg-[#121212] border border-[#222] rounded-2xl p-4" />
            <div className="h-28 bg-[#121212] border border-[#222] rounded-2xl p-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
