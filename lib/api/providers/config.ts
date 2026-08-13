import type { MovieProviderKey } from '@/types/movie';

export const MOVIE_PROVIDER_ENV = 'PHEVO_MOVIE_PROVIDER';
export const MOVIE_PROVIDER_CANARY_ENV = 'PHEVO_MOVIE_PROVIDER_CANARY';

export function resolveMovieProvider(value: string | undefined): MovieProviderKey {
  return value?.trim().toLowerCase() === 'kkphim' ? 'kkphim' : 'vsmov';
}

export function isMovieProviderCanaryEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function configuredMovieProvider(): MovieProviderKey {
  return resolveMovieProvider(process.env[MOVIE_PROVIDER_ENV]);
}

export function configuredCanaryEnabled(): boolean {
  return isMovieProviderCanaryEnabled(process.env[MOVIE_PROVIDER_CANARY_ENV]);
}
