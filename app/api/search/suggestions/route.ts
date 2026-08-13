import { NextRequest, NextResponse } from 'next/server';
import { searchMovies } from '@/lib/api/movies';
import type { SearchSuggestion } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get('q') || '';
    const q = rawQ.trim().slice(0, 100);

    if (!q || q.length < 2) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const res = await searchMovies(q, 1);

    if (res.error) {
      return NextResponse.json([], {
        status: 502,
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const items = res.items || [];

    const suggestions: SearchSuggestion[] = items.slice(0, 6).map((item) => ({
      slug: item.slug,
      title: item.title,
      originalTitle: item.originalTitle || undefined,
      posterUrl: item.posterUrl || undefined,
      thumbUrl: item.thumbUrl || undefined,
      year: item.year || undefined,
      episodeCurrent: item.episodeCurrent || undefined,
    }));

    return NextResponse.json(suggestions, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[API /api/search/suggestions] Error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
