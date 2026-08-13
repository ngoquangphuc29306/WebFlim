import type {
  TmdbCastDto,
  TmdbConfigurationDto,
  TmdbCrewDto,
  TmdbDiscoveryPageDto,
  TmdbGenreDto,
  TmdbMovieDto,
  TmdbSeasonDto,
  TmdbSeasonEpisodeDto,
  TmdbSeasonSummaryDto,
  TmdbTvDto,
} from '@/lib/tmdb/dto';
import type {
  TmdbEpisodeMetadata,
  TmdbGenre,
  TmdbImageConfiguration,
  TmdbMediaMetadata,
  TmdbCastMember,
  TmdbCrewMember,
  TmdbCredits,
  TmdbDiscoveryCandidate,
  TmdbDiscoveryPage,
  TmdbMediaType,
  TmdbSeasonMetadata,
  TmdbSeasonSummary,
  TmdbVideo,
} from '@/types/tmdb';

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && Number.isInteger(number) && number > 0 ? number : undefined;
}

function path(value: unknown): string | undefined {
  const valueText = text(value);
  return valueText && valueText.startsWith('/') && !valueText.includes('://') ? valueText : undefined;
}

function mapGenres(items: TmdbGenreDto[] | null | undefined): TmdbGenre[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const id = positiveInteger(item.id);
    const name = text(item.name);
    return id && name ? [{ id, name }] : [];
  });
}

function mapSeasonSummary(item: TmdbSeasonSummaryDto): TmdbSeasonSummary | null {
  const id = positiveInteger(item.id);
  const seasonNumber = finiteNumber(item.season_number);
  const name = text(item.name);
  if (!id || seasonNumber === undefined || !name) return null;
  return {
    id,
    seasonNumber,
    name,
    overview: text(item.overview),
    airDate: text(item.air_date),
    posterPath: path(item.poster_path),
    episodeCount: positiveInteger(item.episode_count),
  };
}

function numberList(values: number[] | null | undefined): number[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function yearFromDate(value: string | undefined): number | undefined {
  const year = value ? Number(value.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year >= 1800 ? year : undefined;
}

function mapDiscoveryCandidate(
  dto: TmdbMovieDto | TmdbTvDto,
  mediaType: TmdbMediaType,
): TmdbDiscoveryCandidate | null {
  const tmdbId = positiveInteger(dto.id);
  const title = mediaType === 'movie'
    ? text((dto as TmdbMovieDto).title) ?? text((dto as TmdbMovieDto).original_title)
    : text((dto as TmdbTvDto).name) ?? text((dto as TmdbTvDto).original_name);
  if (!tmdbId || !title) return null;

  const releaseDate = mediaType === 'movie'
    ? text((dto as TmdbMovieDto).release_date)
    : text((dto as TmdbTvDto).first_air_date);
  const genreIds = numberList(dto.genre_ids);

  return {
    tmdbId,
    mediaType,
    title,
    originalTitle: mediaType === 'movie'
      ? text((dto as TmdbMovieDto).original_title)
      : text((dto as TmdbTvDto).original_name),
    overview: text(dto.overview),
    posterPath: path(dto.poster_path),
    backdropPath: path(dto.backdrop_path),
    releaseDate,
    year: yearFromDate(releaseDate),
    voteAverage: finiteNumber(dto.vote_average),
    voteCount: positiveInteger(dto.vote_count),
    genreIds,
    popularity: finiteNumber(dto.popularity),
  };
}

/** Maps only lightweight list metadata. Rich detail DTOs never reach discovery cards. */
export function mapTmdbDiscoveryPage(
  dto: TmdbDiscoveryPageDto,
  mediaType: TmdbMediaType,
): TmdbDiscoveryPage {
  const candidates = Array.isArray(dto.results)
    ? dto.results.map((item) => mapDiscoveryCandidate(item, mediaType)).filter((item): item is TmdbDiscoveryCandidate => item !== null)
    : [];
  const page = positiveInteger(dto.page) ?? 1;
  const totalPages = positiveInteger(dto.total_pages) ?? 1;
  const totalResults = finiteNumber(dto.total_results) ?? candidates.length;
  return { candidates, page, totalPages, totalResults };
}

function mapCast(items: TmdbCastDto[] | null | undefined): TmdbCastMember[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const id = positiveInteger(item.id);
    const name = text(item.name);
    if (!id || !name) return [];
    return [{
      id,
      name,
      character: text(item.character),
      profilePath: path(item.profile_path),
      order: finiteNumber(item.order),
    }];
  }).sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

function mapCrew(items: TmdbCrewDto[] | null | undefined): TmdbCrewMember[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const id = positiveInteger(item.id);
    const name = text(item.name);
    if (!id || !name) return [];
    return [{
      id,
      name,
      department: text(item.department),
      job: text(item.job),
      profilePath: path(item.profile_path),
      order: finiteNumber(item.order),
    }];
  });
}

function mapCredits(credits: TmdbMovieDto['credits']): TmdbCredits | undefined {
  if (!credits) return undefined;
  return { cast: mapCast(credits.cast), crew: mapCrew(credits.crew) };
}

function mapVideos(videos: TmdbMovieDto['videos']): TmdbVideo[] | undefined {
  if (!Array.isArray(videos?.results)) return undefined;
  return videos.results.flatMap((item) => {
    const id = text(item.id);
    const key = text(item.key);
    const name = text(item.name);
    const site = text(item.site);
    const type = text(item.type);
    if (!id || !key || !name || !site || !type) return [];
    return [{
      id,
      key,
      name,
      site,
      type,
      official: item.official === true,
      publishedAt: text(item.published_at),
    }];
  });
}

export function mapTmdbMovie(dto: TmdbMovieDto): TmdbMediaMetadata | null {
  const id = positiveInteger(dto.id);
  const title = text(dto.title) ?? text(dto.original_title);
  if (!id || !title) return null;
  return {
    id,
    mediaType: 'movie',
    title,
    originalTitle: text(dto.original_title),
    overview: text(dto.overview),
    posterPath: path(dto.poster_path),
    backdropPath: path(dto.backdrop_path),
    releaseDate: text(dto.release_date),
    originalLanguage: text(dto.original_language),
    genres: mapGenres(dto.genres),
    voteAverage: finiteNumber(dto.vote_average),
    voteCount: positiveInteger(dto.vote_count),
    popularity: finiteNumber(dto.popularity),
    runtimeMinutes: positiveInteger(dto.runtime),
    status: text(dto.status),
    tagline: text(dto.tagline),
    credits: mapCredits(dto.credits),
    videos: mapVideos(dto.videos),
  };
}

export function mapTmdbTv(dto: TmdbTvDto): TmdbMediaMetadata | null {
  const id = positiveInteger(dto.id);
  const title = text(dto.name) ?? text(dto.original_name);
  if (!id || !title) return null;
  return {
    id,
    mediaType: 'tv',
    title,
    originalTitle: text(dto.original_name),
    overview: text(dto.overview),
    posterPath: path(dto.poster_path),
    backdropPath: path(dto.backdrop_path),
    firstAirDate: text(dto.first_air_date),
    lastAirDate: text(dto.last_air_date),
    originalLanguage: text(dto.original_language),
    genres: mapGenres(dto.genres),
    voteAverage: finiteNumber(dto.vote_average),
    voteCount: positiveInteger(dto.vote_count),
    popularity: finiteNumber(dto.popularity),
    status: text(dto.status),
    tagline: text(dto.tagline),
    createdBy: mapCrew(dto.created_by),
    credits: mapCredits(dto.credits),
    videos: mapVideos(dto.videos),
    numberOfSeasons: positiveInteger(dto.number_of_seasons),
    numberOfEpisodes: positiveInteger(dto.number_of_episodes),
    episodeRunTimes: numberList(dto.episode_run_time),
    seasons: Array.isArray(dto.seasons)
      ? dto.seasons.map(mapSeasonSummary).filter((season): season is TmdbSeasonSummary => season !== null)
      : undefined,
  };
}

function mapSeasonEpisode(dto: TmdbSeasonEpisodeDto): TmdbEpisodeMetadata | null {
  const id = positiveInteger(dto.id);
  const episodeNumber = finiteNumber(dto.episode_number);
  const name = text(dto.name);
  if (!id || episodeNumber === undefined || !name) return null;
  return {
    id,
    episodeNumber,
    name,
    overview: text(dto.overview),
    airDate: text(dto.air_date),
    runtimeMinutes: positiveInteger(dto.runtime),
    stillPath: path(dto.still_path),
    voteAverage: finiteNumber(dto.vote_average),
  };
}

export function mapTmdbSeason(dto: TmdbSeasonDto, seriesId: number): TmdbSeasonMetadata | null {
  const id = positiveInteger(dto.id);
  const seasonNumber = finiteNumber(dto.season_number);
  const name = text(dto.name);
  if (!id || !Number.isInteger(seriesId) || seriesId <= 0 || seasonNumber === undefined || !name) return null;
  return {
    id,
    seriesId,
    seasonNumber,
    name,
    overview: text(dto.overview),
    airDate: text(dto.air_date),
    posterPath: path(dto.poster_path),
    voteAverage: finiteNumber(dto.vote_average),
    episodes: Array.isArray(dto.episodes)
      ? dto.episodes.map(mapSeasonEpisode).filter((episode): episode is TmdbEpisodeMetadata => episode !== null)
      : [],
  };
}

const DEFAULT_IMAGE_CONFIGURATION: TmdbImageConfiguration = {
  secureBaseUrl: 'https://image.tmdb.org/t/p/',
  posterSizes: ['w342', 'w500', 'w780'],
  backdropSizes: ['w780', 'w1280'],
  profileSizes: ['w185'],
  stillSizes: ['w300', 'w780'],
  logoSizes: ['w185'],
};

function imageSizes(value: string[] | null | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const sizes = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return sizes.length > 0 ? sizes : fallback;
}

export function mapTmdbImageConfiguration(dto: TmdbConfigurationDto): TmdbImageConfiguration {
  const images = dto.images;
  const secureBaseUrl = text(images?.secure_base_url);
  return {
    secureBaseUrl: secureBaseUrl?.endsWith('/') ? secureBaseUrl : `${secureBaseUrl ?? DEFAULT_IMAGE_CONFIGURATION.secureBaseUrl}/`,
    posterSizes: imageSizes(images?.poster_sizes, DEFAULT_IMAGE_CONFIGURATION.posterSizes),
    backdropSizes: imageSizes(images?.backdrop_sizes, DEFAULT_IMAGE_CONFIGURATION.backdropSizes),
    profileSizes: imageSizes(images?.profile_sizes, DEFAULT_IMAGE_CONFIGURATION.profileSizes),
    stillSizes: imageSizes(images?.still_sizes, DEFAULT_IMAGE_CONFIGURATION.stillSizes),
    logoSizes: imageSizes(images?.logo_sizes, DEFAULT_IMAGE_CONFIGURATION.logoSizes),
  };
}

export function defaultTmdbImageConfiguration(): TmdbImageConfiguration {
  return { ...DEFAULT_IMAGE_CONFIGURATION };
}
