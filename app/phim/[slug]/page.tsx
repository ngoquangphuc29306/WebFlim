import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getEnrichedMovieDetail, toMovieDetailModel } from '@/lib/tmdb/enrichment';
import { getRelatedMovies } from '@/lib/tmdb/related';
import MovieDetails from '@/components/movie/MovieDetails';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const enriched = await getEnrichedMovieDetail(slug);

  if (!enriched) {
    return {
      title: 'Phim không tồn tại - PHEVO Stream',
    };
  }

  return {
    title: `${enriched.display.title} ${enriched.display.year ? `(${enriched.display.year})` : ''} - Xem Phim Vietsub | PHEVO`,
    description: enriched.display.overview || `Xem phim ${enriched.display.title} vietsub thuyết minh trên PHEVO.`,
    openGraph: {
      title: enriched.display.title,
      description: enriched.display.overview,
      images: enriched.display.posterUrl ? [enriched.display.posterUrl] : undefined,
    },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const enriched = await getEnrichedMovieDetail(slug);

  if (!enriched) {
    notFound();
  }

  const movie = enriched.provider;
  const relatedMovies = await getRelatedMovies(movie);

  return (
    <div className="min-h-screen">
      <MovieDetails
        movie={toMovieDetailModel(enriched)}
        relatedMovies={relatedMovies}
      />
    </div>
  );
}
