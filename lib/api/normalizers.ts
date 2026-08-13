import {
  VSMovItem,
  VSMovMovieDetail,
  VSMovDetailResponse,
  VSMovCategory,
  VSMovCountry,
  MovieCardModel,
  MovieDetailModel,
  ServerGroupModel,
  CategoryModel,
  CountryModel,
  VSMovServer,
} from '@/types/movie';

const API_DOMAIN = 'https://vsmov.com';
const DEFAULT_PLACEHOLDER = 'https://picsum.photos/seed/vsmov-placeholder/400/600';

/**
 * Format image URLs into valid absolute URLs
 */
export function formatImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return DEFAULT_PLACEHOLDER;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${API_DOMAIN}${trimmed}`;
  }
  return `${API_DOMAIN}/${trimmed}`;
}

/**
 * Extract and parse TMDB rating safely
 */
export function parseRating(item: VSMovItem): number | undefined {
  if (item.tmdb?.vote_average) {
    const num = parseFloat(String(item.tmdb.vote_average));
    if (!isNaN(num) && num > 0) return Math.round(num * 10) / 10;
  }
  return undefined;
}

/**
 * Normalize category taxonomy items
 */
export function normalizeCategory(cat: VSMovCategory): CategoryModel {
  return {
    id: cat.id ?? cat._id ?? cat.slug,
    name: cat.name || 'Thể loại',
    slug: cat.slug || '',
  };
}

/**
 * Normalize country taxonomy items
 */
export function normalizeCountry(cnt: VSMovCountry): CountryModel {
  return {
    id: cnt.id ?? cnt._id ?? cnt.slug,
    name: cnt.name || 'Quốc gia',
    slug: cnt.slug || '',
  };
}

/**
 * Maps a raw VSMovItem to frontend MovieCardModel
 */
export function normalizeMovie(item: VSMovItem): MovieCardModel {
  const categories = Array.isArray(item.category)
    ? item.category.map(normalizeCategory).filter((c) => Boolean(c.slug))
    : [];

  const countries = Array.isArray(item.country)
    ? item.country.map(normalizeCountry).filter((c) => Boolean(c.slug))
    : [];

  return {
    id: String(item._id || item.slug),
    slug: item.slug,
    title: item.name ? item.name.trim() : 'Chưa có tên',
    originalTitle: item.origin_name ? item.origin_name.trim() : undefined,
    posterUrl: formatImageUrl(item.thumb_url || item.poster_url),
    thumbUrl: formatImageUrl(item.poster_url || item.thumb_url),
    year: item.year || undefined,
    type: item.type || undefined,
    status: item.status || undefined,
    episodeCurrent: item.episode_current || undefined,
    episodeTotal: item.episode_total || undefined,
    quality: item.quality || 'HD',
    language: item.lang || 'Vietsub',
    rating: parseRating(item),
    voteCount: item.tmdb?.vote_count || undefined,
    duration: item.time || undefined,
    views: typeof item.view === 'number' ? item.view : undefined,
    categories,
    countries,
    externalIdentity: {
      tmdbId: item.tmdb?.id,
      tmdbType: item.tmdb?.type === 'movie' || item.tmdb?.type === 'tv' ? item.tmdb.type : undefined,
      tmdbSeason: item.tmdb?.season,
      imdbId: item.imdb?.id,
    },
  };
}

/**
 * Helper to extract numeric episode index for natural sorting
 */
function extractEpisodeNumber(ep: { name: string; slug: string }): number {
  if (!ep) return NaN;

  const name = ep.name.trim();
  const nameMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (nameMatch) {
    const parsed = parseFloat(nameMatch[1]);
    if (!isNaN(parsed)) return parsed;
  }

  if (ep.slug) {
    const slugMatch = ep.slug.match(/(\d+(?:\.\d+)?)/);
    if (slugMatch) {
      const parsed = parseFloat(slugMatch[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return NaN;
}

/**
 * Sorts episode items in natural ascending order (Tập 1 -> Tập 1172)
 */
export function sortEpisodeItems<T extends { name: string; slug: string }>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  return [...items].sort((a, b) => {
    const numA = extractEpisodeNumber(a);
    const numB = extractEpisodeNumber(b);

    const hasNumA = !isNaN(numA);
    const hasNumB = !isNaN(numB);

    if (hasNumA && hasNumB) {
      if (numA !== numB) return numA - numB;
    } else if (hasNumA && !hasNumB) {
      return -1;
    } else if (!hasNumA && hasNumB) {
      return 1;
    }

    return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Normalize server and episode data
 */
export function normalizeEpisodeServers(servers?: VSMovServer[]): ServerGroupModel[] {
  if (!Array.isArray(servers)) return [];

  return servers.map((srv) => {
    const cleanServerName = srv.server_name
      ? srv.server_name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
      : 'Server #1';

    const rawItems = Array.isArray(srv.server_data)
      ? srv.server_data.map((ep) => ({
          name: ep.name ? ep.name.trim() : ep.filename || 'Tập 1',
          slug: ep.slug ? ep.slug.trim() : 'tap-1',
          ...(ep.filename ? { filename: ep.filename.trim() } : {}),
          embedUrl: ep.link_embed || '',
          ...(ep.link_m3u8 ? { m3u8Url: ep.link_m3u8 } : {}),
        }))
      : [];

    const items = sortEpisodeItems(rawItems);

    return {
      serverName: cleanServerName,
      items,
    };
  });
}

/**
 * Maps a raw VSMovDetailResponse to frontend MovieDetailModel
 */
export function normalizeMovieDetail(data: VSMovDetailResponse): MovieDetailModel | null {
  if (!data || !data.movie) return null;
  const m: VSMovMovieDetail = data.movie;
  const baseCard = normalizeMovie(m);

  const cleanSynopsis = m.content
    ? m.content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : undefined;

  return {
    ...baseCard,
    synopsis: cleanSynopsis || 'Nội dung đang được cập nhật...',
    trailerUrl: m.trailer_url ? m.trailer_url.trim() : undefined,
    actors: Array.isArray(m.actor) ? m.actor.map((a) => a.trim()).filter(Boolean) : [],
    directors: Array.isArray(m.director) ? m.director.map((d) => d.trim()).filter(Boolean) : [],
    keywords: Array.isArray(m.keywords) ? m.keywords.map((k) => k.trim()).filter(Boolean) : [],
    showtimes: m.showtimes ? m.showtimes.trim() : undefined,
    isCinemaRelease: Boolean(m.chieurap),
    episodes: normalizeEpisodeServers(data.episodes),
  };
}
