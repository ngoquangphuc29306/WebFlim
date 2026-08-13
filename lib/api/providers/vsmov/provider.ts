import {
  getCatalogMovies,
  getCountriesList,
  getGenresList,
  getHomepageData,
  getLatestMovies,
  getMovieDetail,
  getMovieListBySlug,
  getMoviesByCountry,
  getMoviesByGenre,
  getMoviesByYear,
  getYearsList,
  searchMovies,
} from '@/lib/api/vsmov';
import type { CatalogRequest } from '@/types/movie';
import type { MovieProvider } from '@/lib/api/providers/movie-provider';

function addMovieIdentity<T extends { slug: string }>(movie: T) {
  return { ...movie, providerIdentity: { provider: 'vsmov' as const, providerSlug: movie.slug } };
}

function addListIdentity<T extends { items: Array<{ slug: string }> }>(result: T) {
  return { ...result, items: result.items.map(addMovieIdentity) };
}

function addDetailIdentity<T extends { movie: { slug: string; episodes: Array<{ items: Array<{ slug: string }> }> } | null }>(result: T) {
  if (!result.movie) return result;
  return {
    ...result,
    movie: {
      ...addMovieIdentity(result.movie),
      episodes: result.movie.episodes.map((server) => ({
        ...server,
        items: server.items.map((episode) => ({
          ...episode,
          providerIdentity: { provider: 'vsmov' as const, providerSlug: episode.slug },
        })),
      })),
    },
  };
}

/** Compatibility adapter around the established VSMov implementation. */
export class VsmovMovieProvider implements MovieProvider {
  readonly key = 'vsmov' as const;

  getLatestMovies(page = 1) {
    return getLatestMovies(page).then(addListIdentity);
  }

  getMovieListBySlug(slug: string, page = 1) {
    return getMovieListBySlug(slug, page).then(addListIdentity);
  }

  getMoviesByGenre(slug: string, page = 1) {
    return getMoviesByGenre(slug, page).then(addListIdentity);
  }

  getMoviesByCountry(slug: string, page = 1) {
    return getMoviesByCountry(slug, page).then(addListIdentity);
  }

  getMoviesByYear(year: string | number, page = 1) {
    return getMoviesByYear(year, page).then(addListIdentity);
  }

  searchMovies(keyword: string, page = 1) {
    return searchMovies(keyword, page).then(addListIdentity);
  }

  getGenresList() {
    return getGenresList();
  }

  getCountriesList() {
    return getCountriesList();
  }

  getYearsList() {
    return getYearsList();
  }

  getMovieDetail(slug: string) {
    return getMovieDetail(slug).then(addDetailIdentity);
  }

  getCatalogMovies(request: CatalogRequest) {
    return getCatalogMovies(request).then(addListIdentity);
  }

  getHomepageData() {
    return getHomepageData().then((data) => ({
      ...data,
      heroMovies: data.heroMovies.map(addMovieIdentity),
      latestMovies: data.latestMovies.map(addMovieIdentity),
      singleMovies: data.singleMovies.map(addMovieIdentity),
      seriesMovies: data.seriesMovies.map(addMovieIdentity),
      subteamMovies: data.subteamMovies.map(addMovieIdentity),
      hoathinhMovies: data.hoathinhMovies.map(addMovieIdentity),
    }));
  }
}
