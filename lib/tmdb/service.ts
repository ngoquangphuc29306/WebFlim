import 'server-only';

import { cache } from 'react';
import type { ExternalIdentity } from '@/types/movie';
import type { TmdbImageConfiguration, TmdbMediaMetadata, TmdbSeasonMetadata } from '@/types/tmdb';
import type { TmdbClientContract, TmdbRequestOptions } from '@/lib/tmdb/client';
import { DEFAULT_TMDB_LANGUAGE, TmdbClient } from '@/lib/tmdb/client';
import { tmdbFailure, type TmdbError, type TmdbResult } from '@/lib/tmdb/errors';
import { mapTmdbImageConfiguration, mapTmdbMovie, mapTmdbSeason, mapTmdbTv } from '@/lib/tmdb/mapper';

export interface TmdbMetadataOptions {
  includeSeason?: boolean;
  includeCredits?: boolean;
  includeVideos?: boolean;
  signal?: AbortSignal;
}

export interface TmdbMetadataBundle {
  metadata: TmdbMediaMetadata;
  season?: TmdbSeasonMetadata;
  seasonError?: TmdbError | null;
  overviewLocale: string;
}

function forwardFailure<T>(error: TmdbError | null): TmdbResult<T> {
  return tmdbFailure(error ?? { code: 'NETWORK_ERROR', message: 'TMDB request failed without an error payload' });
}

function requestOptions(
  options: TmdbMetadataOptions,
  language?: string,
): TmdbRequestOptions {
  const appendToResponse = [
    options.includeCredits ? 'credits' : undefined,
    options.includeVideos ? 'videos' : undefined,
  ].filter((value): value is string => Boolean(value));
  return {
    ...(options.signal ? { signal: options.signal } : {}),
    ...(language ? { language } : {}),
    ...(appendToResponse.length > 0 ? { appendToResponse } : {}),
  };
}

function mergeLocaleMetadata(primary: TmdbMediaMetadata, fallback: TmdbMediaMetadata): TmdbMediaMetadata {
  return {
    ...primary,
    title: primary.title || fallback.title,
    originalTitle: primary.originalTitle ?? fallback.originalTitle,
    overview: primary.overview ?? fallback.overview,
    posterPath: primary.posterPath ?? fallback.posterPath,
    backdropPath: primary.backdropPath ?? fallback.backdropPath,
    releaseDate: primary.releaseDate ?? fallback.releaseDate,
    firstAirDate: primary.firstAirDate ?? fallback.firstAirDate,
    lastAirDate: primary.lastAirDate ?? fallback.lastAirDate,
    genres: primary.genres.length > 0 ? primary.genres : fallback.genres,
    voteAverage: primary.voteAverage ?? fallback.voteAverage,
    voteCount: primary.voteCount ?? fallback.voteCount,
    popularity: primary.popularity ?? fallback.popularity,
    runtimeMinutes: primary.runtimeMinutes ?? fallback.runtimeMinutes,
    status: primary.status ?? fallback.status,
    tagline: primary.tagline ?? fallback.tagline,
    numberOfSeasons: primary.numberOfSeasons ?? fallback.numberOfSeasons,
    numberOfEpisodes: primary.numberOfEpisodes ?? fallback.numberOfEpisodes,
    episodeRunTimes: primary.episodeRunTimes ?? fallback.episodeRunTimes,
    seasons: primary.seasons ?? fallback.seasons,
    credits: primary.credits ?? fallback.credits,
    videos: primary.videos ?? fallback.videos,
    createdBy: primary.createdBy ?? fallback.createdBy,
  };
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

    const primaryLanguage = process.env.TMDB_LANGUAGE?.trim() || DEFAULT_TMDB_LANGUAGE;
    const primaryRequestOptions = requestOptions(options);

    if (identity.tmdbType === 'movie') {
      const response = await this.client.getMovie(id, primaryRequestOptions);
      if (!response.data) return forwardFailure(response.error);
      const primaryMetadata = mapTmdbMovie(response.data);
      if (!primaryMetadata) {
        return tmdbFailure({ code: 'INVALID_RESPONSE', message: 'TMDB movie detail did not contain a valid movie', url: response.error?.url });
      }
      const localized = await this.withEnglishOverviewFallback(id, identity.tmdbType, primaryMetadata, options, primaryLanguage);
      return localized
        ? { data: { metadata: localized.metadata, overviewLocale: localized.overviewLocale }, error: null }
        : tmdbFailure({ code: 'INVALID_RESPONSE', message: 'TMDB movie detail did not contain a valid movie', url: response.error?.url });
    }

    const requestedSeason = seasonNumber(identity, Boolean(options.includeSeason));
    if (requestedSeason === 'invalid') {
      return tmdbFailure({ code: 'INVALID_IDENTITY', message: 'TMDB season must be a non-negative integer' });
    }
    const response = await this.client.getTv(id, primaryRequestOptions);
    if (!response.data) return forwardFailure(response.error);
    const primaryMetadata = mapTmdbTv(response.data);
    if (!primaryMetadata) return tmdbFailure({ code: 'INVALID_RESPONSE', message: 'TMDB TV detail did not contain a valid series', url: response.error?.url });
    const localized = await this.withEnglishOverviewFallback(id, identity.tmdbType, primaryMetadata, options, primaryLanguage);
    const metadata = localized.metadata;
    if (requestedSeason === null) return { data: { metadata, overviewLocale: localized.overviewLocale }, error: null };

    const seasonResponse = await this.client.getTvSeason(id, requestedSeason, {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!seasonResponse.data) {
      return { data: { metadata, overviewLocale: localized.overviewLocale, seasonError: seasonResponse.error }, error: null };
    }
    const season = mapTmdbSeason(seasonResponse.data, metadata.id);
    return season
      ? { data: { metadata, season, overviewLocale: localized.overviewLocale }, error: null }
      : { data: { metadata, overviewLocale: localized.overviewLocale, seasonError: { code: 'INVALID_RESPONSE', message: 'TMDB season detail did not contain a valid season' } }, error: null };
  }

  private async withEnglishOverviewFallback(
    id: string,
    mediaType: ExternalIdentity['tmdbType'],
    primaryMetadata: TmdbMediaMetadata,
    options: TmdbMetadataOptions,
    primaryLanguage: string,
  ): Promise<{ metadata: TmdbMediaMetadata; overviewLocale: string }> {
    if (primaryMetadata.overview || primaryLanguage === 'en-US') {
      return { metadata: primaryMetadata, overviewLocale: primaryMetadata.overview ? primaryLanguage : 'provider' };
    }

    const fallbackOptions = requestOptions(options, 'en-US');
    const fallbackResponse = mediaType === 'movie'
      ? await this.client.getMovie(id, fallbackOptions)
      : await this.client.getTv(id, fallbackOptions);
    const fallbackMetadata = fallbackResponse.data
      ? mediaType === 'movie' ? mapTmdbMovie(fallbackResponse.data) : mapTmdbTv(fallbackResponse.data)
      : null;
    if (!fallbackMetadata) return { metadata: primaryMetadata, overviewLocale: 'provider' };
    return {
      metadata: mergeLocaleMetadata(primaryMetadata, fallbackMetadata),
      overviewLocale: fallbackMetadata.overview ? 'tmdb-en-US' : 'provider',
    };
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
  includeSeason: boolean,
  includeCredits: boolean,
  includeVideos: boolean,
) => defaultTmdbService.getMetadata({ tmdbId, tmdbType, tmdbSeason }, { includeSeason, includeCredits, includeVideos }));

/** Server-only, cache-deduplicated metadata enrichment entry point for future pages. */
export function getTmdbMetadata(
  identity: ExternalIdentity | undefined,
  options: Pick<TmdbMetadataOptions, 'includeSeason' | 'includeCredits' | 'includeVideos'> = {}
): Promise<TmdbResult<TmdbMetadataBundle>> {
  return getCachedTmdbMetadata(
    identity?.tmdbId,
    identity?.tmdbType,
    identity?.tmdbSeason,
    Boolean(options.includeSeason),
    Boolean(options.includeCredits),
    Boolean(options.includeVideos),
  );
}

export const getTmdbImageConfiguration = cache(() => defaultTmdbService.getImageConfiguration());
