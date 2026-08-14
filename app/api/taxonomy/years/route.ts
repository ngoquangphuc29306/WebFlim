import { NextResponse } from 'next/server';
import { getYearsList } from '@/lib/api/movies';

export async function GET() {
  try {
    const years = await getYearsList();
    const minimal = years.map((y) => ({
      id: y.id || y.slug || String(y.year),
      name: y.name || String(y.year),
      slug: y.slug || String(y.year),
      year: y.year,
    }));
    return NextResponse.json(minimal, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[API /api/taxonomy/years] Error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
