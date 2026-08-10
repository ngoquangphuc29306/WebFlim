import { describe, expect, it } from 'vitest';
import {
  buildCatalogUrl,
  countActiveFilters,
  parseCatalogFilters,
  resolveCatalogRequest,
} from '@/lib/api/discovery-resolver';

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
