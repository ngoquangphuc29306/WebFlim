import 'server-only';

import { cache } from 'react';
import type { ExternalIdentity } from '@/types/movie';
import type { TmdbImageConfiguration, TmdbMediaMetadata, TmdbSeasonMetadata } from '@/types/tmdb';
import type { TmdbClientContract } from '@/lib/tmdb/client';
import { TmdbClient } from '@/lib/tmdb/client';
import { tmdbFailure, type TmdbError, type TmdbResult } from '@/lib/tmdb/errors';
import { mapTmdbImageConfiguration, mapTmdbMovie, mapTmdbSeason, mapTmdbTv } from '@/lib/tmdb/mapper';

export interface TmdbMetadataOptions {
  includeSeason?: boolean;
  signal?: AbortSignal;
}

export interface TmdbMetadataBundle {
  metadata: TmdbMediaMetadata;
  season?: TmdbSeasonMetadata;
  seasonError?: TmdbError | null;
}

function forwardFailure<T>(error: TmdbError | null): TmdbResult<T> {
  return tmdbFailure(error ?? { code: 'NETWORK_ERROR', message: 'TMDB request failed without an error payload' });
}

function requestOptions(options: TmdbMetadataOptions): Pick<TmdbMetadataOptions, 'signal'> {
  return options.signal ? { signal: options.signal } : {};
}

function validTmdbId(identity: ExternalIdentity | undefined): string | null {
  const id = identity?.tmdbId?.trim();
  return id && /^\d+$/.test(id) && Number(id) > 0 ? id : null;
}

function seasonNumber(identity: ExternalIdentity, includeSeason: boolean): number | null | 'invalid' {
  if (!includeSeason || identity.tmdbSeason === undefined || identity.tmdbSeason === null) return null;
  return Number.isInteger(identity.tmdbSeason) && identity.tmdbSeason >= 0 ? identity.tmdbSeason : 'invalid';
}

export class TmdbMetadataService {
  constructor(private readonly client: TmdbClientContract = new TmdbClient()) {}

  async getMetadata(identity: ExternalIdentity | undefined, options: TmdbMetadataOptions = {}): Promise<TmdbResult<TmdbMetadataBundle>> {
    const id = validTmdbId(identity);
    if (!id || !identity?.tmdbType) {
      return tmdbFailure({ code: 'INVALID_IDENTITY', message: 'A verified TMDB ID and media type are required for enrichment' });
    }

    if (identity.tmdbType === 'movie') {
      const response = await this.client.getMovie(id, requestOptions(options));
      if (!response.data) return forwardFailure(response.error);
      const metadata = mapTmdbMovie(response.data);
      return metadata
        ? { data: { metadata }, error: null }
        : tmdbFailure({ code: 'INVALID_RESPONSE', message: 'TMDB movie detail did not contain a valid movie', url: response.error?.url });
    }

    const requestedSeason = seasonNumber(identity, Boolean(options.includeSeason));
    if (requestedSeason === 'invalid') {
      return tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB season must be a non-negative integer' });
    }
    const response = await this.client.getTv(id, requestOptions(options));
    if (!response.data) return forwardFailure(response.error);
    const metadata = mapTmdbTv(response.data);
    if (!metadata) return tmdbFailure({ code: 'INVALID_RESPONSE', message: 'TMDB TV detail did not contain a valid series', url: response.error?.url });
    if (requestedSeason === null) return { data: { metadata }, error: null };

    const seasonResponse = await this.client.getTvSeason(id, requestedSeason, requestOptions(options));
    if (!seasonResponse.data) {
      return { data: { metadata, seasonError: seasonResponse.error }, error: null };
    }
    const season = mapTmdbSeason(seasonResponse.data, metadata.id);
    return season
      ? { data: { metadata, season }, error: null }
      : { data: { metadata, seasonError: { code: 'INVALID_RESPONSE', message: 'TMDB season detail did not contain a valid season' } }, error: null };
  }

  async getImageConfiguration(options: Pick<TmdbMetadataOptions, 'signal'> = {}): Promise<TmdbResult<TmdbImageConfiguration>> {
    const response = await this.client.getConfiguration(options);
    return response.data
      ? { data: mapTmdbImageConfiguration(response.data), error: null }
      : forwardFailure(response.error);
  }
}

const defaultTmdbService = new TmdbMetadataService();

const getCachedTmdbMetadata = cache(async (
  tmdbId: string | undefined,
  tmdbType: ExternalIdentity['tmdbType'],
  tmdbSeason: number | null | undefined,
  includeSeason: boolean
) => defaultTmdbService.getMetadata({ tmdbId, tmdbType, tmdbSeason }, { includeSeason }));

/** Server-only, cache-deduplicated metadata enrichment entry point for future pages. */
export function getTmdbMetadata(
  identity: ExternalIdentity | undefined,
  options: Pick<TmdbMetadataOptions, 'includeSeason'> = {}
): Promise<TmdbResult<TmdbMetadataBundle>> {
  return getCachedTmdbMetadata(identity?.tmdbId, identity?.tmdbType, identity?.tmdbSeason, Boolean(options.includeSeason));
}

export const getTmdbImageConfiguration = cache(() => defaultTmdbService.getImageConfiguration());
