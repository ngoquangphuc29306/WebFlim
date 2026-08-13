import 'server-only';

import { cache } from 'react';
import type { MovieCardModel } from '@/types/movie';
import type { TmdbDiscoveryCandidate, TmdbDiscoveryPage, TmdbMediaType } from '@/types/tmdb';
import type { TmdbClientContract, TmdbRequestOptions } from '@/lib/tmdb/client';
import { TmdbClient } from '@/lib/tmdb/client';
import type { TmdbResult } from '@/lib/tmdb/errors';
import { buildTmdbImageUrl } from '@/lib/tmdb/images';
import { defaultTmdbImageConfiguration, mapTmdbDiscoveryPage } from '@/lib/tmdb/mapper';
import {
  countResolutionStatuses,
  type PlayabilityResolver,
  type PlayabilityResult,
  ProviderPlayabilityResolver,
} from '@/lib/tmdb/playability';
import type { TmdbDiscoveryPageDto } from '@/lib/tmdb/dto';

export const TMDB_DISCOVERY_CANDIDATE_LIMIT = 20;
export const TMDB_DISCOVERY_CARD_LIMIT = 12;

export interface PlayableDiscoveryDiagnostics {
  candidates: number;
  exactMatches: number;
  unavailable: number;
  ambiguous: number;
  identityRejected: number;
  providerErrors: number;
}

export interface PlayableDiscoveryResult {
  cards: MovieCardModel[];
  diagnostics: PlayableDiscoveryDiagnostics;
  tmdbAvailable: boolean;
}

function emptyDiagnostics(candidates = 0): PlayableDiscoveryDiagnostics {
  return { candidates, exactMatches: 0, unavailable: 0, ambiguous: 0, identityRejected: 0, providerErrors: 0 };
}

function validTmdbIdentity(id: string | undefined, mediaType: TmdbMediaType | undefined): id is string {
  return Boolean(id && /^\d+$/.test(id) && Number(id) > 0 && mediaType);
}

function candidateToMovieCard(candidate: TmdbDiscoveryCandidate, result: Extract<PlayabilityResult, { status: 'EXACT_MATCH' }>): MovieCardModel {
  const provider = result.movie;
  const configuration = defaultTmdbImageConfiguration();
  const tmdbPoster = buildTmdbImageUrl(candidate.posterPath, 'posterCard', configuration);
  const tmdbBackdrop = buildTmdbImageUrl(candidate.backdropPath, 'backdropCard', configuration);
  return {
    ...provider,
    slug: result.publicSlug,
    title: candidate.title || provider.title,
    originalTitle: candidate.originalTitle ?? provider.originalTitle,
    posterUrl: tmdbPoster ?? provider.posterUrl,
    thumbUrl: tmdbBackdrop ?? provider.thumbUrl ?? provider.posterUrl,
    year: candidate.year ?? provider.year,
    rating: candidate.voteAverage ?? provider.rating,
    voteCount: candidate.voteCount ?? provider.voteCount,
  };
}

function toDiagnostics(candidates: TmdbDiscoveryCandidate[], results: PlayabilityResult[]): PlayableDiscoveryDiagnostics {
  const counts = countResolutionStatuses(results);
  return {
    candidates: candidates.length,
    exactMatches: counts.EXACT_MATCH,
    unavailable: counts.UNAVAILABLE,
    ambiguous: counts.AMBIGUOUS,
    identityRejected: counts.IDENTITY_REJECTED,
    providerErrors: counts.PROVIDER_ERROR,
  };
}

function playableCards(
  candidates: TmdbDiscoveryCandidate[],
  resolutions: PlayabilityResult[],
  limit: number,
  excludedSlugs: ReadonlySet<string>,
): MovieCardModel[] {
  const cards: MovieCardModel[] = [];
  const seen = new Set<string>(excludedSlugs);
  for (let index = 0; index < candidates.length && cards.length < limit; index += 1) {
    const resolution = resolutions[index];
    if (!resolution || resolution.status !== 'EXACT_MATCH' || seen.has(resolution.publicSlug)) continue;
    seen.add(resolution.publicSlug);
    cards.push(candidateToMovieCard(candidates[index], resolution));
  }
  return cards;
}

export class TmdbPlayableDiscoveryService {
  constructor(
    private readonly client: TmdbClientContract = new TmdbClient(),
    private readonly resolver: PlayabilityResolver = new ProviderPlayabilityResolver(),
  ) {}

  getTrending(mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT): Promise<PlayableDiscoveryResult> {
    return this.resolve((options) => this.client.getTrending(mediaType, options), mediaType, limit);
  }

  getPopular(mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT): Promise<PlayableDiscoveryResult> {
    return this.resolve((options) => this.client.getPopular(mediaType, options), mediaType, limit);
  }

  getTopRated(mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT): Promise<PlayableDiscoveryResult> {
    return this.resolve((options) => this.client.getTopRated(mediaType, options), mediaType, limit);
  }

  getRecommendations(
    tmdbId: string | undefined,
    mediaType: TmdbMediaType | undefined,
    limit = TMDB_DISCOVERY_CARD_LIMIT,
    excludedSlugs: ReadonlySet<string> = new Set(),
  ): Promise<PlayableDiscoveryResult> {
    if (!validTmdbIdentity(tmdbId, mediaType) || !mediaType) return Promise.resolve({ cards: [], diagnostics: emptyDiagnostics(), tmdbAvailable: false });
    return this.resolve((options) => this.client.getRecommendations(mediaType, tmdbId, options), mediaType, limit, excludedSlugs);
  }

  getSimilar(
    tmdbId: string | undefined,
    mediaType: TmdbMediaType | undefined,
    limit = TMDB_DISCOVERY_CARD_LIMIT,
    excludedSlugs: ReadonlySet<string> = new Set(),
  ): Promise<PlayableDiscoveryResult> {
    if (!validTmdbIdentity(tmdbId, mediaType) || !mediaType) return Promise.resolve({ cards: [], diagnostics: emptyDiagnostics(), tmdbAvailable: false });
    return this.resolve((options) => this.client.getSimilar(mediaType, tmdbId, options), mediaType, limit, excludedSlugs);
  }

  private async resolve(
    fetchPage: (options: TmdbRequestOptions) => Promise<TmdbResult<TmdbDiscoveryPageDto>>,
    mediaType: TmdbMediaType,
    limit: number,
    excludedSlugs: ReadonlySet<string> = new Set(),
  ): Promise<PlayableDiscoveryResult> {
    let response: TmdbResult<TmdbDiscoveryPageDto>;
    try {
      response = await fetchPage({ page: 1 });
    } catch {
      return { cards: [], diagnostics: emptyDiagnostics(), tmdbAvailable: false };
    }
    if (!response.data) return { cards: [], diagnostics: emptyDiagnostics(), tmdbAvailable: false };
    const page: TmdbDiscoveryPage = mapTmdbDiscoveryPage(response.data, mediaType);
    const candidates = page.candidates.slice(0, TMDB_DISCOVERY_CANDIDATE_LIMIT);
    const resolutions = await this.resolver.resolveAll(candidates);
    return {
      cards: playableCards(candidates, resolutions, Math.max(1, Math.min(limit, TMDB_DISCOVERY_CARD_LIMIT)), excludedSlugs),
      diagnostics: toDiagnostics(candidates, resolutions),
      tmdbAvailable: true,
    };
  }
}

const defaultTmdbPlayableDiscoveryService = new TmdbPlayableDiscoveryService();

export const getPlayableTrending = cache((mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT) =>
  defaultTmdbPlayableDiscoveryService.getTrending(mediaType, limit));

export const getPlayablePopular = cache((mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT) =>
  defaultTmdbPlayableDiscoveryService.getPopular(mediaType, limit));

export const getPlayableTopRated = cache((mediaType: TmdbMediaType, limit = TMDB_DISCOVERY_CARD_LIMIT) =>
  defaultTmdbPlayableDiscoveryService.getTopRated(mediaType, limit));

export const getPlayableRecommendations = cache((
  tmdbId: string | undefined,
  mediaType: TmdbMediaType | undefined,
  currentPublicSlug: string,
  limit = TMDB_DISCOVERY_CARD_LIMIT,
) => defaultTmdbPlayableDiscoveryService.getRecommendations(tmdbId, mediaType, limit, new Set([currentPublicSlug])));

export const getPlayableSimilar = cache((
  tmdbId: string | undefined,
  mediaType: TmdbMediaType | undefined,
  currentPublicSlug: string,
  limit = TMDB_DISCOVERY_CARD_LIMIT,
) => defaultTmdbPlayableDiscoveryService.getSimilar(tmdbId, mediaType, limit, new Set([currentPublicSlug])));
