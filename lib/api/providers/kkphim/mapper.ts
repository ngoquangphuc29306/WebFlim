import type {
  CategoryModel,
  CountryModel,
  MovieCardModel,
  MovieDetailModel,
  ProviderError,
  ServerGroupModel,
  VSMovPagination,
} from '@/types/movie';
import type {
  KkPhimDetailResponseDto,
  KkPhimItemDto,
  KkPhimServerDto,
  KkPhimListResponseDto,
  KkPhimTaxonomyDto,
  KkPhimYearDto,
} from '@/types/kkphim';
import { sortEpisodeItems } from '@/lib/api/providers/shared/episode-utils';
import { emptyPagination } from '@/lib/api/providers/movie-provider';

const DEFAULT_CDN = 'https://phimimg.com';
const DEFAULT_PLACEHOLDER = 'https://picsum.photos/seed/kkphim-placeholder/400/600';

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

export function normalizeKkImage(url: string | null | undefined, cdn = DEFAULT_CDN): string {
  const value = text(url);
  if (!value) return DEFAULT_PLACEHOLDER;
  if (/^https?:\/\//i.test(value)) return value;
  const base = text(cdn) ?? DEFAULT_CDN;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function taxonomyId(item: KkPhimTaxonomyDto): string | number {
  return item.id ?? item._id ?? item.slug ?? '';
}

export function mapKkCategory(item: KkPhimTaxonomyDto): CategoryModel | null {
  const slug = text(item.slug);
  const name = text(item.name);
  if (!slug || !name) return null;
  return { id: taxonomyId(item), name, slug };
}

export function mapKkCountry(item: KkPhimTaxonomyDto): CountryModel | null {
  const mapped = mapKkCategory(item);
  return mapped ? { ...mapped } : null;
}

function externalIdentity(item: KkPhimItemDto): MovieCardModel['externalIdentity'] {
  const tmdbId = item.tmdb?.id === undefined || item.tmdb?.id === null
    ? undefined
    : String(item.tmdb.id);
  const tmdbType = item.tmdb?.type === 'movie' || item.tmdb?.type === 'tv'
    ? item.tmdb.type
    : undefined;
  const tmdbSeason = numberValue(item.tmdb?.season);
  const imdbId = text(item.imdb?.id);
  return tmdbId || tmdbType || tmdbSeason !== undefined || imdbId
    ? { tmdbId, tmdbType, tmdbSeason, imdbId }
    : undefined;
}

export function mapKkItem(
  item: KkPhimItemDto,
  cdn = DEFAULT_CDN,
  publicSlug?: string
): MovieCardModel | null {
  const providerSlug = text(item.slug);
  const title = text(item.name);
  if (!providerSlug || !title) return null;

  const categories = Array.isArray(item.category)
    ? item.category.map(mapKkCategory).filter((value): value is CategoryModel => value !== null)
    : [];
  const countries = Array.isArray(item.country)
    ? item.country.map(mapKkCountry).filter((value): value is CountryModel => value !== null)
    : [];
  const rating = positiveNumber(item.tmdb?.vote_average);

  return {
    id: String(item._id ?? providerSlug),
    slug: publicSlug ?? providerSlug,
    title,
    originalTitle: text(item.origin_name),
    posterUrl: normalizeKkImage(item.poster_url ?? item.thumb_url, cdn),
    thumbUrl: normalizeKkImage(item.thumb_url ?? item.poster_url, cdn),
    year: item.year ?? undefined,
    type: text(item.type),
    status: text(item.status),
    episodeCurrent: item.episode_current === null || item.episode_current === undefined
      ? undefined
      : String(item.episode_current),
    episodeTotal: item.episode_total === null || item.episode_total === undefined
      ? undefined
      : String(item.episode_total),
    quality: text(item.quality) ?? 'HD',
    language: text(item.lang) ?? 'Vietsub',
    rating: rating === undefined ? undefined : Math.round(rating * 10) / 10,
    voteCount: positiveNumber(item.tmdb?.vote_count),
    duration: text(item.time),
    views: positiveNumber(item.view),
    categories,
    countries,
    providerIdentity: { provider: 'kkphim', providerSlug },
    externalIdentity: externalIdentity(item),
  };
}

function cleanHtml(value: string | null | undefined): string | undefined {
  const cleaned = text(value)
    ?.replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

function mapKkEpisode(episode: NonNullable<KkPhimServerDto['server_data']>[number]): {
  name: string;
  slug: string;
  filename?: string;
  embedUrl: string;
  m3u8Url?: string;
  providerIdentity: { provider: 'kkphim'; providerSlug: string };
} | null {
  const slug = text(episode.slug);
  const name = text(episode.name) ?? text(episode.filename);
  if (!slug || !name) return null;
  const embedUrl = text(episode.link_embed) ?? '';
  const m3u8Url = text(episode.link_m3u8);
  return {
    name,
    slug,
    filename: text(episode.filename),
    embedUrl,
    m3u8Url,
    providerIdentity: { provider: 'kkphim', providerSlug: slug },
  };
}

export function mapKkServers(servers: KkPhimServerDto[] | null | undefined): ServerGroupModel[] {
  if (!Array.isArray(servers)) return [];
  return servers.map((server) => {
    const serverName = text(server.server_name) ?? 'Server #1';
    const items = Array.isArray(server.server_data)
      ? server.server_data.map(mapKkEpisode).filter((value): value is NonNullable<ReturnType<typeof mapKkEpisode>> => value !== null)
      : [];
    return { serverName, items: sortEpisodeItems(items) };
  });
}

function mapDetailItem(
  item: NonNullable<NonNullable<KkPhimDetailResponseDto['data']>['item']>,
  cdn: string,
  requestedSlug?: string
): MovieDetailModel | null {
  const baseCard = mapKkItem(item, cdn, requestedSlug);
  if (!baseCard) return null;
  return {
    ...baseCard,
    synopsis: cleanHtml(item.content),
    trailerUrl: text(item.trailer_url),
    actors: Array.isArray(item.actor) ? item.actor.map(text).filter((value): value is string => Boolean(value)) : [],
    directors: Array.isArray(item.director) ? item.director.map(text).filter((value): value is string => Boolean(value)) : [],
    keywords: [],
    showtimes: text(item.showtimes),
    isCinemaRelease: Boolean(item.chieurap),
    episodes: mapKkServers(item.episodes),
  };
}

export function mapKkDetailResponse(
  response: KkPhimDetailResponseDto,
  requestedSlug?: string
): MovieDetailModel | null {
  const item = response.data?.item;
  if (!item) return null;
  return mapDetailItem(item, response.data?.APP_DOMAIN_CDN_IMAGE ?? DEFAULT_CDN, requestedSlug);
}

function parseIntValue(value: unknown, fallback: number): number {
  const parsed = numberValue(value);
  return parsed === undefined ? fallback : Math.max(0, Math.trunc(parsed));
}

export function normalizeKkPagination(response: KkPhimListResponseDto): VSMovPagination {
  const pagination = response.data?.params?.pagination;
  if (!pagination) return emptyPagination();
  const totalItems = parseIntValue(pagination.totalItems, 0);
  const itemsPerPage = Math.max(1, parseIntValue(pagination.totalItemsPerPage, 24));
  const currentPage = Math.max(1, parseIntValue(pagination.currentPage, 1));
  const directTotalPages = parseIntValue(pagination.totalPages, 0);
  const totalPages = directTotalPages > 0
    ? directTotalPages
    : totalItems > 0
      ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
      : 1;
  return { totalItems, totalItemsPerPage: itemsPerPage, currentPage, totalPages };
}

export function mapKkListResponse(response: KkPhimListResponseDto): {
  items: MovieCardModel[];
  pagination: VSMovPagination;
} {
  const cdn = response.data?.APP_DOMAIN_CDN_IMAGE ?? DEFAULT_CDN;
  const rawItems = Array.isArray(response.data?.items) ? response.data.items : [];
  return {
    items: rawItems.map((item) => mapKkItem(item, cdn)).filter((value): value is MovieCardModel => value !== null),
    pagination: normalizeKkPagination(response),
  };
}

export function providerErrorForKkResponse(
  message: string,
  type: ProviderError['type'] = 'EMPTY_RESPONSE'
): ProviderError {
  return { provider: 'kkphim', type, message };
}
