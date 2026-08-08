import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMovieDetail, getMoviesByGenre, getLatestMovies } from '@/lib/api/vsmov';
import { MovieCardModel } from '@/types/movie';
import MovieDetails from '@/components/movie/MovieDetails';
import MovieRow from '@/components/movie/MovieRow';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { movie } = await getMovieDetail(slug);

  if (!movie) {
    return {
      title: 'Phim không tồn tại - VSMov Stream',
    };
  }

  return {
    title: `${movie.title} ${movie.year ? `(${movie.year})` : ''} - Xem Phim HD Vietsub | VSMov`,
    description: movie.synopsis || `Xem phim ${movie.title} vietsub thuyết minh miễn phí chất lượng cao trên VSMov.`,
    openGraph: {
      title: movie.title,
      description: movie.synopsis,
      images: [movie.posterUrl],
    },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { movie } = await getMovieDetail(slug);

  if (!movie) {
    notFound();
  }

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
      <MovieDetails movie={movie} />

      {relatedMovies.length > 0 && (
        <MovieRow
          title="Phim Cùng Thể Loại & Đề Xuất"
          movies={relatedMovies.slice(0, 12)}
        />
      )}
    </div>
  );
}
