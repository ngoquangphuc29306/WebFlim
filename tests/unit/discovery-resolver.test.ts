import { describe, expect, it } from 'vitest';
import {
  buildCatalogUrl,
  buildMovieBrowseUrl,
  countActiveBrowseFilters,
  countActiveFilters,
  getUnsupportedBrowseFilterReason,
  parseMovieBrowseFilter,
  parseCatalogFilters,
  resolveCatalogRequest,
  withBrowseFilterChange,
} from '@/lib/api/discovery-resolver';
import { VsmovMovieProvider } from '@/lib/api/providers/vsmov/provider';

describe('discovery resolver', () => {
  it('sanitizes query values and normalizes invalid pagination', () => {
    expect(
      parseCatalogFilters({
        genre: '  hanh-dong  ',
        country: ' ',
        year: '1899',
        type: 'invalid',
        page: '0',
      })
    ).toEqual({ genre: 'hanh-dong', country: undefined, year: undefined, type: undefined, page: 1 });
  });

  it('builds a stable URL without adding page one', () => {
    expect(
      buildCatalogUrl({ genre: 'hanh-dong', country: 'han-quoc', year: 2024, type: 'series', page: 2 })
    ).toBe('/kham-pha?genre=hanh-dong&country=han-quoc&year=2024&type=series&page=2');
    expect(buildCatalogUrl({ page: 1 })).toBe('/kham-pha');
  });

  it('counts only active filters and preserves supported combinations', () => {
    const filters = { genre: 'hanh-dong', country: 'han-quoc', year: 2024, type: 'series', page: 2 } as const;
    const result = resolveCatalogRequest(filters);

    expect(countActiveFilters(filters)).toBe(4);
    expect(result.supported).toBe(true);
    expect(result.request).toEqual({
      endpointType: 'genre',
      slug: 'hanh-dong',
      query: { country: 'han-quoc', year: 2024, type: 'series', page: 2 },
    });
  });

  it('rejects the currently unsupported year and type combination', () => {
    const result = resolveCatalogRequest({ year: 2024, type: 'series', page: 3 });

    expect(result.supported).toBe(false);
    expect(result.request).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });
});

describe('provider-neutral browse filter contract', () => {
  it('normalizes supported URL fields, legacy types, and invalid values', () => {
    expect(parseMovieBrowseFilter({
      type: 'series', genre: ' hanh-dong ', country: 'han-quoc', year: '2024',
      language: 'vietsub', sort: 'updated', order: 'desc', page: '2',
    })).toEqual({
      type: 'phim-bo', genre: 'hanh-dong', country: 'han-quoc', year: 2024,
      language: 'vietsub', sort: 'updated', order: 'desc', page: 2,
    });
    expect(parseMovieBrowseFilter({ yearFrom: '2025', yearTo: '2020', language: 'unknown', page: '-1' }))
      .toEqual({ type: undefined, genre: undefined, country: undefined, year: undefined, language: undefined, sort: undefined, order: undefined, page: 1 });
  });

  it('round-trips a canonical combined filter URL and serializes a valid year range', () => {
    const filter = parseMovieBrowseFilter({
      type: 'phim-bo', genre: 'hanh-dong', country: 'han-quoc', yearFrom: '2020', yearTo: '2024',
      language: 'vietsub', sort: 'year', order: 'asc', page: '3',
    });
    expect(buildMovieBrowseUrl(filter)).toBe('/kham-pha?type=phim-bo&genre=hanh-dong&country=han-quoc&yearFrom=2020&yearTo=2024&language=vietsub&sort=year&order=asc&page=3');
    expect(parseMovieBrowseFilter(Object.fromEntries(new URL(buildMovieBrowseUrl(filter), 'https://phevo.local').searchParams))).toEqual(filter);
  });

  it('resets page one whenever a filter value changes and retains it for page-only changes', () => {
    const current = { type: 'phim-bo' as const, genre: 'hanh-dong', page: 4 };
    expect(withBrowseFilterChange(current, { country: 'han-quoc' })).toEqual({ ...current, country: 'han-quoc', page: 1 });
    expect(withBrowseFilterChange(current, { page: 2 })).toEqual({ ...current, page: 2 });
  });

  it('reports capability limitations instead of silently dropping advanced filters', () => {
    const vsmovCapabilities = {
      combinedBrowseFilters: false,
      yearRange: false,
      languageFilter: false,
      sorting: false,
      browseTypes: ['phim-le', 'phim-bo'] as const,
    };
    expect(getUnsupportedBrowseFilterReason({ language: 'vietsub' }, vsmovCapabilities)).toContain('ngôn ngữ');
    expect(getUnsupportedBrowseFilterReason({ type: 'tv-shows' }, vsmovCapabilities)).toContain('loại phim');
    expect(getUnsupportedBrowseFilterReason({ yearFrom: 2025, yearTo: 2020 }, { ...vsmovCapabilities, yearRange: true })).toContain('Khoảng năm không hợp lệ');
    expect(countActiveBrowseFilters({ type: 'phim-bo', yearFrom: 2020, yearTo: 2024, page: 2 })).toBe(2);
  });

  it('returns an explicit VSMov error instead of dropping an unsupported advanced filter', async () => {
    const result = await new VsmovMovieProvider().browseMovies({ language: 'vietsub', page: 2 });
    expect(result).toMatchObject({
      items: [],
      title: 'Khám phá phim',
      error: { type: 'INVALID_REQUEST', provider: 'vsmov' },
    });
  });
});
