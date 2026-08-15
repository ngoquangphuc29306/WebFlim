import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetail, getMoviesByGenre } from '@/lib/api/movies';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: 'Missing movie slug' }, { status: 400 });
    }

    const detailResult = await getMovieDetail(slug);
    if (!detailResult || !detailResult.movie) {
      return NextResponse.json(
        { error: detailResult?.error?.message || 'Movie not found' },
        { status: 404 }
      );
    }

    // Optionally fetch related movies by primary genre
    let relatedMovies: any[] = [];
    const primaryGenre = detailResult.movie.categories?.[0]?.slug;
    if (primaryGenre) {
      try {
        const genreResult = await getMoviesByGenre(primaryGenre, 1);
        if (genreResult && Array.isArray(genreResult.items)) {
          relatedMovies = genreResult.items
            .filter((m) => m.slug !== slug)
            .slice(0, 6);
        }
      } catch {
        // Silently continue without related movies
      }
    }

    return NextResponse.json({
      success: true,
      movie: detailResult.movie,
      relatedMovies,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
