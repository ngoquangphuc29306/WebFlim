import React from 'react';
import { MovieDetailsSkeleton, MovieRowSkeleton } from '@/components/ui/Skeleton';

export default function DetailLoading() {
  return (
    <div className="space-y-12">
      <MovieDetailsSkeleton />
      <MovieRowSkeleton count={6} />
    </div>
  );
}
