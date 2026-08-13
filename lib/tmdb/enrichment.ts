import 'server-only';

import { cache } from 'react';
import type { MovieDetailModel } from '@/types/movie';
import type {
  EnrichedMovieDetail,
  EnrichedMovieDetailModel,
  TmdbDetailPresentation,
  TmdbImageConfiguration,
  TmdbTrailerPresentation,
} from '@/types/tmdb';
import { getMovieDetail } from '@/lib/api/movies';
import { buildTmdbImageUrl } from '@/lib/tmdb/images';
import { getTmdbImageConfiguration, getTmdbMetadata, type TmdbMetadataBundle } from '@/lib/tmdb/service';
import { defaultTmdbImageConfiguration } from '@/lib/tmdb/mapper';

const ENRICHED_CAST_LIMIT = 10;

function text(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function yearFromDate(value: string | undefined): number | undefined {
  const year = value ? Number(value.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year >= 1800 ? year : undefined;
}

function yearFromProvider(value: string | number | undefined): number | undefined {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1800 ? year : undefined;
}

function minutesFromProvider(value: string | undefined): number | undefined {
  const match = value?.match(/\d+/);
  const minutes = match ? Number(match[0]) : NaN;
  return Number.isInteger(minutes) && minutes > 0 ? minutes : undefined;
}

function normalizedTitle(value: string | undefined): string | undefined {
  const normalized = value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return normalized || undefined;
}

function providerMediaType(movie: MovieDetailModel): 'movie' | 'tv' | undefined {
  if (movie.type === 'single') return 'movie';
  if (movie.type === 'series' || movie.type === 'tvshows') return 'tv';
  return undefined;
}

/** Conservative guard: false negatives are safer than displaying unrelated TMDB data. */
export function isTmdbIdentityTrusted(movie: MovieDetailModel, bundle: TmdbMetadataBundle): boolean {
  const identityType = movie.externalIdentity?.tmdbType;
  if (!identityType || bundle.metadata.mediaType !== identityType) return false;

  const providerType = providerMediaType(movie);
  if (providerType && providerType !== bundle.metadata.mediaType) return false;

  const providerYear = yearFromProvider(movie.year);
  const tmdbYear = yearFromDate(bundle.metadata.releaseDate ?? bundle.metadata.firstAirDate);
  if (providerYear && tmdbYear && Math.abs(providerYear - tmdbYear) > 5) return false;

  const providerOriginal = normalizedTitle(movie.originalTitle);
  const tmdbOriginal = normalizedTitle(bundle.metadata.originalTitle);
  if (providerOriginal && tmdbOriginal && providerOriginal !== tmdbOriginal) {
    const providerTitle = normalizedTitle(movie.title);
    const tmdbTitle = normalizedTitle(bundle.metadata.title);
    const titleEvidence = providerTitle && tmdbTitle && (
      providerTitle === tmdbTitle || providerTitle.includes(tmdbTitle) || tmdbTitle.includes(providerTitle)
    );
    if (!titleEvidence && providerYear && tmdbYear && Math.abs(providerYear - tmdbYear) > 1) return false;
  }

  return true;
}

function trailerFromBundle(bundle: TmdbMetadataBundle): TmdbTrailerPresentation | undefined {
  const videos = bundle.metadata.videos ?? [];
  const candidates = videos.filter((video) => video.site === 'YouTube' && video.key.trim());
  const selected = candidates.toSorted((a, b) => {
    const score = (video: typeof a) =>
      (video.official ? 4 : 0) + (video.type === 'Trailer' ? 2 : video.type === 'Teaser' ? 1 : 0);
    return score(b) - score(a);
  })[0];
  if (!selected) return undefined;

  // Keep URL construction limited to the supported provider, never arbitrary remote HTML.
  const key = encodeURIComponent(selected.key.trim());
  return {
    site: 'YouTube',
    key: selected.key,
    name: selected.name,
    official: selected.official,
    type: selected.type,
    url: `https://www.youtube.com/watch?v=${key}`,
  };
}

function presentationFromProvider(movie: MovieDetailModel): TmdbDetailPresentation {
  return {
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: text(movie.synopsis),
    posterUrl: movie.posterUrl,
    backdropUrl: movie.thumbUrl || movie.posterUrl,
    year: yearFromProvider(movie.year),
    runtimeMinutes: minutesFromProvider(movie.duration),
    genres: movie.categories.flatMap((category) => {
      const id = Number(category.id);
      return Number.isInteger(id) && id > 0 ? [{ id, name: category.name }] : [];
    }),
    voteAverage: movie.rating,
    voteCount: movie.voteCount,
    ratingSource: 'provider',
    cast: [],
    directors: [],
    creators: [],
    overviewSource: 'provider',
  };
}

function toPresentation(
  movie: MovieDetailModel,
  bundle: TmdbMetadataBundle,
  configuration: TmdbImageConfiguration,
): TmdbDetailPresentation {
  const providerPresentation = presentationFromProvider(movie);
  const metadata = bundle.metadata;
  const cast = (metadata.credits?.cast ?? []).slice(0, ENRICHED_CAST_LIMIT).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profileUrl: buildTmdbImageUrl(member.profilePath, 'profile', configuration),
    order: member.order,
  }));
  const directors = (metadata.credits?.crew ?? [])
    .filter((member) => member.job === 'Director')
    .slice(0, 4)
    .map((member) => ({ id: member.id, name: member.name, job: member.job, profileUrl: buildTmdbImageUrl(member.profilePath, 'profile', configuration) }));
  const creators = (metadata.createdBy ?? []).slice(0, 4)
    .map((member) => ({ id: member.id, name: member.name, job: member.job ?? 'Creator', profileUrl: buildTmdbImageUrl(member.profilePath, 'profile', configuration) }));
  const releaseDate = metadata.releaseDate ?? metadata.firstAirDate;
  const runtimeMinutes = metadata.runtimeMinutes ?? metadata.episodeRunTimes?.find((value) => value > 0);

  return {
    title: movie.title,
    originalTitle: metadata.originalTitle ?? movie.originalTitle,
    overview: metadata.overview ?? providerPresentation.overview,
    posterUrl: buildTmdbImageUrl(metadata.posterPath, 'posterLarge', configuration) ?? providerPresentation.posterUrl,
    backdropUrl: buildTmdbImageUrl(metadata.backdropPath, 'backdropHero', configuration) ?? providerPresentation.backdropUrl,
    releaseDate,
    year: yearFromDate(releaseDate) ?? providerPresentation.year,
    runtimeMinutes: runtimeMinutes ?? providerPresentation.runtimeMinutes,
    genres: metadata.genres.length > 0 ? metadata.genres : providerPresentation.genres,
    voteAverage: metadata.voteAverage ?? providerPresentation.voteAverage,
    voteCount: metadata.voteCount ?? providerPresentation.voteCount,
    ratingSource: metadata.voteAverage !== undefined ? 'tmdb' : 'provider',
    cast,
    directors,
    creators,
    trailer: trailerFromBundle(bundle),
    season: bundle.season,
    overviewSource: bundle.overviewLocale === 'tmdb-en-US'
      ? 'tmdb-en-US'
      : metadata.overview
        ? 'tmdb-vi-VN'
        : 'provider',
  };
}

export function enrichMovieDetail(
  movie: MovieDetailModel,
  bundle: TmdbMetadataBundle | undefined,
  configuration: TmdbImageConfiguration = defaultTmdbImageConfiguration(),
): EnrichedMovieDetail {
  if (!bundle || !isTmdbIdentityTrusted(movie, bundle)) {
    const display = presentationFromProvider(movie);
    return {
      provider: movie,
      display,
      enrichment: {
        source: 'provider',
        tmdbAvailable: false,
        tmdbId: movie.externalIdentity?.tmdbId,
        overviewSource: 'provider',
        seasonAvailable: false,
      },
    };
  }

  const display = toPresentation(movie, bundle, configuration);
  return {
    provider: movie,
    display,
    enrichment: {
      source: 'tmdb',
      tmdbAvailable: true,
      tmdbId: String(bundle.metadata.id),
      overviewSource: display.overviewSource,
      seasonAvailable: Boolean(bundle.season),
    },
  };
}

export function toMovieDetailModel(enriched: EnrichedMovieDetail): EnrichedMovieDetailModel {
  return {
    ...enriched.provider,
    tmdbPresentation: enriched.display,
    enrichment: enriched.enrichment,
  };
}

async function enrichMovieDetailBySlug(slug: string): Promise<EnrichedMovieDetail | null> {
  const { movie } = await getMovieDetail(slug);
  if (!movie) return null;

  const identity = movie.externalIdentity;
  if (!identity?.tmdbId || !identity.tmdbType) return enrichMovieDetail(movie, undefined);

  const tmdbResult = await getTmdbMetadata(identity, {
    includeSeason: identity.tmdbType === 'tv',
    includeCredits: true,
    includeVideos: true,
  });
  if (!tmdbResult.data) return enrichMovieDetail(movie, undefined);

  const imageResult = await getTmdbImageConfiguration();
  return enrichMovieDetail(movie, tmdbResult.data, imageResult.data ?? defaultTmdbImageConfiguration());
}

export const getEnrichedMovieDetail = cache(enrichMovieDetailBySlug);
