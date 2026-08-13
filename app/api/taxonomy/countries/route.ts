import { NextResponse } from 'next/server';
import { getCountriesList } from '@/lib/api/movies';

export async function GET() {
  try {
    const countries = await getCountriesList();
    const minimal = countries.map((c) => ({
      id: c.id || c.slug,
      name: c.name,
      slug: c.slug,
    }));
    return NextResponse.json(minimal, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[API /api/taxonomy/countries] Error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
