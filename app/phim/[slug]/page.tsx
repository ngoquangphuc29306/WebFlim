import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByGenre, getLatestMovies } from '@/lib/api/movies';
import { getEnrichedMovieDetail, toMovieDetailModel } from '@/lib/tmdb/enrichment';
import { MovieCardModel } from '@/types/movie';
import MovieDetails from '@/components/movie/MovieDetails';
import MovieRow from '@/components/movie/MovieRow';

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

  // Fetch related content by first category or fallback
  let relatedMovies: MovieCardModel[] = [];
  if (movie.categories && movie.categories.length > 0) {
    const firstCat = movie.categories[0].slug;
    const catRes = await getMoviesByGenre(firstCat, 1);
    relatedMovies = catRes.items.filter((m) => m.slug !== movie.slug);
  }

  if (relatedMovies.length < 5) {
    const fallbackRes = await getLatestMovies(1);
    const extra = fallbackRes.items.filter(
      (m) => m.slug !== movie.slug && !relatedMovies.some((r) => r.slug === m.slug)
    );
    relatedMovies = [...relatedMovies, ...extra];
  }

  return (
    <div className="space-y-12">
      <MovieDetails movie={toMovieDetailModel(enriched)} />

      {relatedMovies.length > 0 && (
        <MovieRow
          title="Phim Cùng Thể Loại & Đề Xuất"
          movies={relatedMovies.slice(0, 12)}
        />
      )}
    </div>
  );
}
