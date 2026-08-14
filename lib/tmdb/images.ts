import type { TmdbImageConfiguration, TmdbImageKind } from '@/types/tmdb';
import { defaultTmdbImageConfiguration } from '@/lib/tmdb/mapper';

export type TmdbImagePreset =
  | 'posterSmall'
  | 'posterCard'
  | 'posterLarge'
  | 'backdropCard'
  | 'backdropHero'
  | 'profile'
  | 'still';

const PRESET: Record<TmdbImagePreset, { kind: TmdbImageKind; preferredSize: string }> = {
  posterSmall: { kind: 'poster', preferredSize: 'w342' },
  posterCard: { kind: 'poster', preferredSize: 'w500' },
  posterLarge: { kind: 'poster', preferredSize: 'w780' },
  backdropCard: { kind: 'backdrop', preferredSize: 'w780' },
  backdropHero: { kind: 'backdrop', preferredSize: 'w1280' },
  profile: { kind: 'profile', preferredSize: 'w185' },
  still: { kind: 'still', preferredSize: 'w780' },
};

function validPath(path: string | null | undefined): string | null {
  if (typeof path !== 'string') return null;
  const value = path.trim();
  return value.startsWith('/') && !value.includes('://') ? value : null;
}

function sizesFor(configuration: TmdbImageConfiguration, kind: TmdbImageKind): string[] {
  switch (kind) {
    case 'poster': return configuration.posterSizes;
    case 'backdrop': return configuration.backdropSizes;
    case 'profile': return configuration.profileSizes;
    case 'still': return configuration.stillSizes;
    case 'logo': return configuration.logoSizes;
  }
}

export function buildTmdbImageUrl(
  path: string | null | undefined,
  preset: TmdbImagePreset,
  configuration: TmdbImageConfiguration = defaultTmdbImageConfiguration()
): string | undefined {
  const safePath = validPath(path);
  if (!safePath) return undefined;
  const policy = PRESET[preset];
  const sizes = sizesFor(configuration, policy.kind);
  const size = sizes.includes(policy.preferredSize) ? policy.preferredSize : sizes.find((value) => value !== 'original') ?? policy.preferredSize;
  const baseUrl = configuration.secureBaseUrl.endsWith('/') ? configuration.secureBaseUrl : `${configuration.secureBaseUrl}/`;
  return `${baseUrl}${size}${safePath}`;
}
