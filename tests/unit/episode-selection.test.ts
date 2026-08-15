import { describe, expect, it } from 'vitest';
import {
  normalizeServerIndex,
  resolveEpisodeForServer,
} from '@/components/movie/episode-selection';

const episodes = (slugs: string[]) => slugs.map((slug) => ({ slug }));

describe('episode/server selection contract', () => {
  it('keeps the requested episode when it exists on the target server', () => {
    expect(
      resolveEpisodeForServer({
        requestedEpisodeSlug: 'tap-02',
        targetEpisodes: episodes(['tap-01', 'tap-02', 'tap-03']),
      })?.slug
    ).toBe('tap-02');
  });

  it('falls back to the first target episode when the requested one is missing', () => {
    expect(
      resolveEpisodeForServer({
        requestedEpisodeSlug: 'tap-12',
        targetEpisodes: episodes(['tap-01', 'tap-02']),
      })?.slug
    ).toBe('tap-01');
  });

  it('returns null for an empty target server', () => {
    expect(
      resolveEpisodeForServer({
        requestedEpisodeSlug: 'tap-12',
        targetEpisodes: [],
      })
    ).toBeNull();
  });

  it('normalizes negative, non-numeric, and too-large server indexes to server zero', () => {
    expect(normalizeServerIndex(-1, 2)).toBe(0);
    expect(normalizeServerIndex(Number.NaN, 2)).toBe(0);
    expect(normalizeServerIndex(2, 2)).toBe(0);
  });

  it('preserves valid server indexes', () => {
    expect(normalizeServerIndex(1, 2)).toBe(1);
  });
});
