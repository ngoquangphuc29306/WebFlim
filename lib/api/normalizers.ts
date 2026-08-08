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
    posterUrl: formatImageUrl(item.poster_url),
    thumbUrl: formatImageUrl(item.thumb_url || item.poster_url),
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
  };
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

    const items = Array.isArray(srv.server_data)
      ? srv.server_data.map((ep) => ({
          name: ep.name ? ep.name.trim() : ep.filename || 'Tập 1',
          slug: ep.slug ? ep.slug.trim() : 'tap-1',
          filename: ep.filename ? ep.filename.trim() : undefined,
          embedUrl: ep.link_embed || '',
          m3u8Url: ep.link_m3u8 || undefined,
        }))
      : [];

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
