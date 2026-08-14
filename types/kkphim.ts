export interface KkPhimTmdbDto {
  id?: string | number | null;
  type?: string | null;
  season?: number | null;
  vote_average?: number | string | null;
  vote_count?: number | string | null;
}

export interface KkPhimImdbDto {
  id?: string | null;
  vote_average?: number | string | null;
  vote_count?: number | string | null;
}

export interface KkPhimTaxonomyDto {
  id?: string | number | null;
  _id?: string | number | null;
  name?: string | null;
  slug?: string | null;
}

export interface KkPhimYearDto {
  year?: number | string | null;
  name?: string | null;
  slug?: string | null;
  id?: string | number | null;
  _id?: string | number | null;
}

export interface KkPhimItemDto {
  _id?: string | number | null;
  name?: string | null;
  origin_name?: string | null;
  slug?: string | null;
  thumb_url?: string | null;
  poster_url?: string | null;
  year?: number | string | null;
  type?: string | null;
  status?: string | null;
  quality?: string | null;
  lang?: string | null;
  lang_key?: string[] | null;
  episode_current?: string | number | null;
  episode_total?: string | number | null;
  time?: string | null;
  view?: number | string | null;
  tmdb?: KkPhimTmdbDto | null;
  imdb?: KkPhimImdbDto | null;
  category?: KkPhimTaxonomyDto[] | null;
  country?: KkPhimTaxonomyDto[] | null;
  alternative_names?: string[] | null;
  modified?: { time?: string | null } | null;
  last_episodes?: Array<{ server_name?: string | null; name?: string | null }> | null;
}

export interface KkPhimEpisodeDto {
  name?: string | null;
  slug?: string | null;
  filename?: string | null;
  link_embed?: string | null;
  link_m3u8?: string | null;
}

export interface KkPhimServerDto {
  server_name?: string | null;
  is_ai?: boolean | null;
  server_data?: KkPhimEpisodeDto[] | null;
}

export interface KkPhimDetailItemDto extends KkPhimItemDto {
  content?: string | null;
  trailer_url?: string | null;
  notify?: string | null;
  showtimes?: string | null;
  actor?: string[] | null;
  director?: string[] | null;
  chieurap?: boolean | null;
  sub_docquyen?: boolean | null;
  episodes?: KkPhimServerDto[] | null;
}

export interface KkPhimPaginationDto {
  totalItems?: number | string | null;
  totalItemsPerPage?: number | string | null;
  currentPage?: number | string | null;
  totalPages?: number | string | null;
  pageRanges?: number | string | null;
}

export interface KkPhimListParamsDto {
  pagination?: KkPhimPaginationDto | null;
  type_slug?: string | null;
  slug?: string | null;
  filterCategory?: string[] | string | null;
  filterCountry?: string[] | string | null;
  filterYear?: string[] | string | null;
  filterType?: string[] | string | null;
  sortField?: string | null;
  sortType?: string | null;
}

export interface KkPhimListDataDto {
  items?: KkPhimItemDto[] | null;
  params?: KkPhimListParamsDto | null;
  APP_DOMAIN_CDN_IMAGE?: string | null;
  APP_DOMAIN_FRONTEND?: string | null;
}

export interface KkPhimListResponseDto {
  status?: boolean | string | null;
  message?: string | null;
  msg?: string | null;
  data?: KkPhimListDataDto | null;
}

export interface KkPhimDetailDataDto {
  item?: KkPhimDetailItemDto | null;
  APP_DOMAIN_CDN_IMAGE?: string | null;
}

export interface KkPhimDetailResponseDto {
  status?: boolean | string | null;
  message?: string | null;
  msg?: string | null;
  data?: KkPhimDetailDataDto | null;
}

export interface KkPhimTaxonomyResponseDto {
  status?: boolean | string | null;
  message?: string | null;
  msg?: string | null;
  data?: { items?: KkPhimTaxonomyDto[] | null } | null;
}

export interface KkPhimYearResponseDto {
  status?: boolean | string | null;
  message?: string | null;
  msg?: string | null;
  data?: { items?: KkPhimYearDto[] | null } | null;
}

export interface KkPhimKeywordResponseDto {
  success?: boolean;
  message?: string | null;
  status_code?: number;
  data?: {
    tmdb_id?: string | number | null;
    tmdb_type?: string | null;
    tmdb_season?: number | null;
    imdb_id?: string | null;
    slug?: string | null;
    keywords?: string[] | null;
  } | null;
}
