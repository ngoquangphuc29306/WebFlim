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
export {
  getPlayablePopular,
  getPlayableRecommendations,
  getPlayableSimilar,
  getPlayableTopRated,
  getPlayableTrending,
  TmdbPlayableDiscoveryService,
} from '@/lib/tmdb/discovery';
export {
  getProviderAvailabilityIndex,
  ProviderPlayabilityResolver,
  resolveCandidateFromRecords,
} from '@/lib/tmdb/playability';
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
  TmdbDiscoveryCandidate,
  TmdbDiscoveryPage,
} from '@/types/tmdb';
