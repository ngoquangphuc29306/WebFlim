import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { activeMovieProvider, getLatestMovies, getMovieListBySlug, getMoviesByGenre } from '@/lib/api/movies';
import type { MovieCardModel } from '@/types/movie';
import type { TmdbDiscoveryCandidate, TmdbMediaType } from '@/types/tmdb';

export const PROVIDER_AVAILABILITY_REVALIDATE_SECONDS = 300;
const AVAILABILITY_LIST_LIMIT = 4;

export type PlayabilityStatus =
  | 'EXACT_MATCH'
  | 'UNAVAILABLE'
  | 'AMBIGUOUS'
  | 'IDENTITY_REJECTED'
  | 'PROVIDER_ERROR';

export interface ProviderAvailabilityRecord {
  publicSlug: string;
  provider: NonNullable<MovieCardModel['providerIdentity']>['provider'];
  externalIdentity?: MovieCardModel['externalIdentity'];
  movie: MovieCardModel;
}

export type PlayabilityResult =
  | { status: 'EXACT_MATCH'; publicSlug: string; provider: ProviderAvailabilityRecord['provider']; movie: MovieCardModel }
  | { status: 'UNAVAILABLE' }
  | { status: 'AMBIGUOUS'; reason: string }
  | { status: 'IDENTITY_REJECTED'; reason: string }
  | { status: 'PROVIDER_ERROR'; reason: string };

export interface PlayabilityResolver {
  resolve(candidate: TmdbDiscoveryCandidate): Promise<PlayabilityResult>;
  resolveAll(candidates: TmdbDiscoveryCandidate[]): Promise<PlayabilityResult[]>;
}

function normalizedTitle(value: string | undefined): string | undefined {
  const normalized = value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return normalized || undefined;
}

function providerYear(movie: MovieCardModel): number | undefined {
  const year = Number(movie.year);
  return Number.isInteger(year) && year >= 1800 ? year : undefined;
}

function isCandidateIdentityTrusted(candidate: TmdbDiscoveryCandidate, movie: MovieCardModel): boolean {
  if (movie.externalIdentity?.tmdbId !== String(candidate.tmdbId) || movie.externalIdentity.tmdbType !== candidate.mediaType) {
    return false;
  }
  const movieYear = providerYear(movie);
  if (candidate.year && movieYear && Math.abs(candidate.year - movieYear) > 5) return false;

  const candidateOriginal = normalizedTitle(candidate.originalTitle);
  const movieOriginal = normalizedTitle(movie.originalTitle);
  if (candidateOriginal && movieOriginal && candidateOriginal !== movieOriginal && candidate.year && movieYear && Math.abs(candidate.year - movieYear) > 1) {
    return false;
  }
  return true;
}

function toRecord(movie: MovieCardModel): ProviderAvailabilityRecord {
  return {
    publicSlug: movie.slug,
    provider: movie.providerIdentity?.provider ?? activeMovieProvider,
    externalIdentity: movie.externalIdentity,
    movie,
  };
}

function dedupeRecords(items: MovieCardModel[]): ProviderAvailabilityRecord[] {
  const records = new Map<string, ProviderAvailabilityRecord>();
  for (const movie of items) {
    if (!movie.slug || records.has(movie.slug)) continue;
    records.set(movie.slug, toRecord(movie));
  }
  return [...records.values()];
}

async function loadProviderAvailabilityIndex(): Promise<ProviderAvailabilityRecord[]> {
  const results = await Promise.all([
    getLatestMovies(1),
    getMovieListBySlug('phim-le', 1),
    getMovieListBySlug('phim-bo', 1),
    getMoviesByGenre('hoat-hinh', 1),
  ]);
  const lists = results.slice(0, AVAILABILITY_LIST_LIMIT);
  return dedupeRecords(lists.flatMap((result) => result.items));
}

const getCachedProviderAvailabilityIndex = unstable_cache(
  loadProviderAvailabilityIndex,
  ['tmdb-provider-availability-v1', activeMovieProvider],
  { revalidate: PROVIDER_AVAILABILITY_REVALIDATE_SECONDS },
);

/** A bounded active-provider availability view; it never crawls the full catalog. */
export const getProviderAvailabilityIndex = cache(getCachedProviderAvailabilityIndex);

function matchingRecords(
  candidate: TmdbDiscoveryCandidate,
  records: ProviderAvailabilityRecord[],
): ProviderAvailabilityRecord[] {
  return records.filter((record) =>
    record.externalIdentity?.tmdbId === String(candidate.tmdbId)
    && record.externalIdentity.tmdbType === candidate.mediaType,
  );
}

function selectTvRecord(records: ProviderAvailabilityRecord[]): ProviderAvailabilityRecord | null {
  const bySlug = new Map(records.map((record) => [record.publicSlug, record]));
  const unique = [...bySlug.values()];
  return unique.toSorted((a, b) => {
    const aSeason = a.externalIdentity?.tmdbSeason;
    const bSeason = b.externalIdentity?.tmdbSeason;
    const aRank = typeof aSeason === 'number' && aSeason > 0 ? aSeason : Number.MAX_SAFE_INTEGER;
    const bRank = typeof bSeason === 'number' && bSeason > 0 ? bSeason : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.publicSlug.localeCompare(b.publicSlug);
  })[0] ?? null;
}

export function resolveCandidateFromRecords(
  candidate: TmdbDiscoveryCandidate,
  records: ProviderAvailabilityRecord[],
): PlayabilityResult {
  const matches = matchingRecords(candidate, records);
  if (matches.length === 0) return { status: 'UNAVAILABLE' };

  const trusted = matches.filter((record) => isCandidateIdentityTrusted(candidate, record.movie));
  if (trusted.length === 0) return { status: 'IDENTITY_REJECTED', reason: 'Provider identity conflicts with the TMDB candidate context' };

  if (candidate.mediaType === 'tv') {
    const selected = selectTvRecord(trusted);
    return selected
      ? { status: 'EXACT_MATCH', publicSlug: selected.publicSlug, provider: selected.provider, movie: selected.movie }
      : { status: 'UNAVAILABLE' };
  }

  const bySlug = new Map(trusted.map((record) => [record.publicSlug, record]));
  if (bySlug.size !== 1) return { status: 'AMBIGUOUS', reason: 'Multiple provider movies share this TMDB movie identity' };
  const selected = [...bySlug.values()][0];
  return { status: 'EXACT_MATCH', publicSlug: selected.publicSlug, provider: selected.provider, movie: selected.movie };
}

export class ProviderPlayabilityResolver implements PlayabilityResolver {
  constructor(private readonly indexLoader: () => Promise<ProviderAvailabilityRecord[]> = getProviderAvailabilityIndex) {}

  async resolve(candidate: TmdbDiscoveryCandidate): Promise<PlayabilityResult> {
    try {
      return resolveCandidateFromRecords(candidate, await this.indexLoader());
    } catch {
      return { status: 'PROVIDER_ERROR', reason: 'Provider availability index could not be loaded' };
    }
  }

  async resolveAll(candidates: TmdbDiscoveryCandidate[]): Promise<PlayabilityResult[]> {
    try {
      const records = await this.indexLoader();
      return candidates.map((candidate) => resolveCandidateFromRecords(candidate, records));
    } catch {
      return candidates.map(() => ({ status: 'PROVIDER_ERROR', reason: 'Provider availability index could not be loaded' }));
    }
  }
}

export function countResolutionStatuses(results: PlayabilityResult[]): Record<PlayabilityStatus, number> {
  return results.reduce<Record<PlayabilityStatus, number>>((counts, result) => {
    counts[result.status] += 1;
    return counts;
  }, { EXACT_MATCH: 0, UNAVAILABLE: 0, AMBIGUOUS: 0, IDENTITY_REJECTED: 0, PROVIDER_ERROR: 0 });
}
