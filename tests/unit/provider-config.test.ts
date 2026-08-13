import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredMovieProvider, MOVIE_PROVIDER_ENV } from '@/lib/api/providers/config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('configured movie provider', () => {
  it('uses KKPhim when the provider environment variable is absent', () => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, undefined);
    expect(configuredMovieProvider()).toBe('kkphim');
  });

  it.each(['', '  ', 'invalid'])('uses KKPhim for empty or invalid environment values: %j', (value) => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, value);
    expect(configuredMovieProvider()).toBe('kkphim');
  });

  it('keeps explicit VSMov as the rollback provider', () => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, 'vsmov');
    expect(configuredMovieProvider()).toBe('vsmov');
  });

  it('keeps explicit KKPhim as the normal provider', () => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, 'KKPHIM');
    expect(configuredMovieProvider()).toBe('kkphim');
  });

  it('constructs the KKPhim provider in the facade when no provider override exists', async () => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, undefined);
    vi.resetModules();
    const facade = await import('@/lib/api/movies');
    expect(facade.activeMovieProvider).toBe('kkphim');
  });

  it('constructs the VSMov provider in the facade for explicit rollback', async () => {
    vi.stubEnv(MOVIE_PROVIDER_ENV, 'vsmov');
    vi.resetModules();
    const facade = await import('@/lib/api/movies');
    expect(facade.activeMovieProvider).toBe('vsmov');
  });
});
