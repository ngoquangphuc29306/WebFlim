import React from 'react';
import { HeroBannerSkeleton, MovieRowSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="-mt-16 sm:-mt-20 space-y-6 pb-16">
      <HeroBannerSkeleton />
      <MovieRowSkeleton count={6} />
      <MovieRowSkeleton count={6} />
      <MovieRowSkeleton count={6} />
    </div>
  );
}
