import type { MovieCardModel, MovieDetailModel } from '@/types/movie';
import { summarizeServers, type ServerEpisodeSummary } from './movie-provider';

export interface CanaryComparison {
  operation: string;
  primaryProvider: 'vsmov' | 'kkphim';
  secondaryProvider: 'vsmov' | 'kkphim';
  mismatches: string[];
  primary: Record<string, string | number | boolean>;
  secondary: Record<string, string | number | boolean>;
}

function compareMovieFields(primary: MovieCardModel, secondary: MovieCardModel): string[] {
  const mismatches: string[] = [];
  if (primary.title.trim().toLowerCase() !== secondary.title.trim().toLowerCase()) mismatches.push('title');
  if (String(primary.year ?? '') !== String(secondary.year ?? '')) mismatches.push('year');
  if (Boolean(primary.posterUrl) !== Boolean(secondary.posterUrl)) mismatches.push('image');
  if (primary.externalIdentity?.tmdbId !== secondary.externalIdentity?.tmdbId) mismatches.push('tmdbId');
  if (primary.externalIdentity?.tmdbType !== secondary.externalIdentity?.tmdbType) mismatches.push('tmdbType');
  return mismatches;
}

function summaryRecord(summary: ServerEpisodeSummary): Record<string, string | number | boolean> {
  return {
    serverCount: summary.serverCount,
    episodeCount: summary.episodeCount,
    hlsEpisodeCount: summary.hlsEpisodeCount,
    embedEpisodeCount: summary.embedEpisodeCount,
  };
}

export function compareMovieListResults(
  operation: string,
  primaryProvider: 'vsmov' | 'kkphim',
  secondaryProvider: 'vsmov' | 'kkphim',
  primary: MovieCardModel[],
  secondary: MovieCardModel[]
): CanaryComparison {
  const mismatches: string[] = [];
  if (primary.length !== secondary.length) mismatches.push('itemCount');
  if (primary[0] && secondary[0]) mismatches.push(...compareMovieFields(primary[0], secondary[0]).map((field) => `firstItem.${field}`));
  return {
    operation,
    primaryProvider,
    secondaryProvider,
    mismatches: [...new Set(mismatches)],
    primary: { itemCount: primary.length },
    secondary: { itemCount: secondary.length },
  };
}

export function compareMovieDetails(
  operation: string,
  primaryProvider: 'vsmov' | 'kkphim',
  secondaryProvider: 'vsmov' | 'kkphim',
  primary: MovieDetailModel | null,
  secondary: MovieDetailModel | null
): CanaryComparison {
  const primarySummary = summarizeServers(primary?.episodes);
  const secondarySummary = summarizeServers(secondary?.episodes);
  const mismatches: string[] = [];

  if (Boolean(primary) !== Boolean(secondary)) mismatches.push('detailSuccess');
  if (primary && secondary) {
    mismatches.push(...compareMovieFields(primary, secondary).map((field) => `movie.${field}`));
    if (primarySummary.serverCount !== secondarySummary.serverCount) mismatches.push('serverCount');
    if (primarySummary.episodeCount !== secondarySummary.episodeCount) mismatches.push('episodeCount');
    if (Boolean(primarySummary.hlsEpisodeCount) !== Boolean(secondarySummary.hlsEpisodeCount)) mismatches.push('hlsAvailability');
    if (Boolean(primarySummary.embedEpisodeCount) !== Boolean(secondarySummary.embedEpisodeCount)) mismatches.push('embedAvailability');
  }

  return {
    operation,
    primaryProvider,
    secondaryProvider,
    mismatches: [...new Set(mismatches)],
    primary: { detailSuccess: Boolean(primary), ...summaryRecord(primarySummary) },
    secondary: { detailSuccess: Boolean(secondary), ...summaryRecord(secondarySummary) },
  };
}
