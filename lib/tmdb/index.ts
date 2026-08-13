import 'server-only';

export { TmdbClient } from '@/lib/tmdb/client';
export {
  getTmdbImageConfiguration,
  getTmdbMetadata,
  TmdbMetadataService,
  type TmdbMetadataBundle,
  type TmdbMetadataOptions,
} from '@/lib/tmdb/service';
export {
  enrichMovieDetail,
  getEnrichedMovieDetail,
  isTmdbIdentityTrusted,
  toMovieDetailModel,
} from '@/lib/tmdb/enrichment';
export { buildTmdbImageUrl, type TmdbImagePreset } from '@/lib/tmdb/images';
export type { TmdbError, TmdbErrorCode, TmdbResult } from '@/lib/tmdb/errors';
export type {
  TmdbEpisodeMetadata,
  TmdbGenre,
  TmdbImageConfiguration,
  TmdbImageKind,
  TmdbMediaMetadata,
  TmdbMediaType,
  TmdbSeasonMetadata,
  TmdbSeasonSummary,
  EnrichedMovieDetail,
  EnrichedMovieDetailModel,
  TmdbCastMember,
  TmdbCastPresentation,
  TmdbCrewMember,
  TmdbCrewPresentation,
  TmdbCredits,
  TmdbDetailPresentation,
  TmdbTrailerPresentation,
  TmdbVideo,
} from '@/types/tmdb';
