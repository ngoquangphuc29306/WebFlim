export interface TmdbGenreDto {
  id?: number | null;
  name?: string | null;
}

export interface TmdbSeasonSummaryDto {
  id?: number | null;
  season_number?: number | null;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  poster_path?: string | null;
  episode_count?: number | null;
}

export interface TmdbMovieDto {
  id?: number | null;
  title?: string | null;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  original_language?: string | null;
  genres?: TmdbGenreDto[] | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  runtime?: number | null;
  status?: string | null;
  tagline?: string | null;
}

export interface TmdbTvDto {
  id?: number | null;
  name?: string | null;
  original_name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  last_air_date?: string | null;
  original_language?: string | null;
  genres?: TmdbGenreDto[] | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  status?: string | null;
  tagline?: string | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  episode_run_time?: number[] | null;
  seasons?: TmdbSeasonSummaryDto[] | null;
}

export interface TmdbSeasonEpisodeDto {
  id?: number | null;
  episode_number?: number | null;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number | null;
}

export interface TmdbSeasonDto {
  id?: number | null;
  _id?: string | null;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  season_number?: number | null;
  episodes?: TmdbSeasonEpisodeDto[] | null;
}

export interface TmdbConfigurationDto {
  images?: {
    secure_base_url?: string | null;
    poster_sizes?: string[] | null;
    backdrop_sizes?: string[] | null;
    profile_sizes?: string[] | null;
    still_sizes?: string[] | null;
    logo_sizes?: string[] | null;
  } | null;
}
