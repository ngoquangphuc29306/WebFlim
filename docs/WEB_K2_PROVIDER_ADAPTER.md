# WEB-K2 — KKPhim Provider Boundary and Dual-Read Canary

## Scope and decision

WEB-K2 adds a provider boundary without changing the production provider. The default remains VSMov. KKPhim is available only through an explicit server-side configuration value and is not a silent fallback for VSMov.

This phase does not change the public routes, normalized UI contracts, playback controls, persistence keys, Auth, Supabase, SyncEngine, Android TV, or player source behavior. It does not add HLS.js, Plyr, TMDB integration, or a provider registry.

## Runtime boundary

```text
Page / API route
    ↓
lib/api/movies.ts
    ↓
MovieProvider
    ├── VsmovMovieProvider → lib/api/vsmov.ts
    └── KkPhimMovieProvider → KkPhimClient → https://phimapi.com
    ↓
normalized MovieCardModel / MovieDetailModel / EpisodeItemModel
```

Web consumers import only `@/lib/api/movies`. The legacy `lib/api/vsmov.ts` remains intact behind `VsmovMovieProvider`; existing direct imports in VSMov unit tests are intentionally retained.

## Provider selection

| Environment variable | Meaning | Default |
| --- | --- | --- |
| `PHEVO_MOVIE_PROVIDER` | `vsmov` or explicit `kkphim` runtime provider | `vsmov` for missing, invalid, or unknown values |
| `PHEVO_MOVIE_PROVIDER_CANARY` | `1`, `true`, or `yes` enables shadow reads | disabled |

Selection happens in the server provider facade. The canary always returns the primary result immediately, then performs a bounded shadow request in the background. A mismatch is logged as a diagnostic only; it never changes the response, persistence, route, or playback source.

Rollback is one configuration change: remove `PHEVO_MOVIE_PROVIDER=kkphim` or set it to `vsmov`. No data migration or route migration is required.

## Frozen normalized contract

The provider boundary returns the existing models:

- `MovieCardModel` for lists, search, taxonomy-driven catalog pages, and homepage rails.
- `MovieDetailModel` for detail/watch pages.
- `ServerGroupModel[]` and `EpisodeItemModel[]` for server and episode selection.
- `VSMovPagination` as the compatibility pagination shape.

Provider identity is optional domain metadata:

```text
providerIdentity.provider      = vsmov | kkphim
providerIdentity.providerSlug  = source provider slug
externalIdentity.tmdbId/type/season and imdbId are optional
```

The public `slug` remains the route and persistence identity. When an explicit KKPhim alias resolves a requested slug to a different provider slug, `slug` remains the requested public slug and `providerIdentity.providerSlug` records the actual KKPhim slug.

Playback remains normalized. Pages and the player do not read `server_data`, `link_embed`, or `link_m3u8` directly.

## VSMov compatibility adapter

`VsmovMovieProvider` delegates to the established VSMov functions:

| Facade method | Existing implementation |
| --- | --- |
| `getLatestMovies` | `getLatestMovies` |
| `getMovieListBySlug` | `getMovieListBySlug` |
| `getMoviesByGenre` | `getMoviesByGenre` |
| `getMoviesByCountry` | `getMoviesByCountry` |
| `getMoviesByYear` | `getMoviesByYear` |
| `searchMovies` | `searchMovies` |
| `getMovieDetail` | `getMovieDetail`, including existing PhimAPI fallback and finite aliases |
| taxonomy methods | existing VSMov taxonomy functions |
| `getCatalogMovies` / `getHomepageData` | existing VSMov aggregate behavior |

VSMov timeout, retry, fallback, normalization, caching, and legacy provider behavior remain in `lib/api/vsmov.ts`.

## KKPhim adapter

`KkPhimClient` is a typed fetch boundary for the documented `https://phimapi.com` family. It preserves Next.js `next.revalidate` values and uses a 10-second timeout with at most two attempts. Only 500, 502, 503, 504, network failures, and timeout failures retry. 4xx responses, malformed JSON, and invalid content types do not retry.

Implemented endpoint families:

| Capability | Path pattern |
| --- | --- |
| latest/general list | `/v1/api/danh-sach?page={page}` |
| typed list | `/v1/api/danh-sach/{type}?page={page}` |
| genre | `/v1/api/the-loai/{slug}?page={page}` |
| country | `/v1/api/quoc-gia/{slug}?page={page}` |
| year | `/v1/api/nam/{year}?page={page}` |
| search | `/v1/api/tim-kiem?keyword={keyword}&page={page}&limit=24` |
| detail | `/v1/api/phim/{slug}` |
| genres | `/the-loai` |
| countries | `/quoc-gia` |
| years | `/nam-phat-hanh` |

KKPhim list responses are mapped from `data.items` and `data.params.pagination`. `totalPages` is used only when explicitly supplied; otherwise it is derived from `ceil(totalItems / totalItemsPerPage)`. `pageRanges` is never treated as `totalPages`.

### Explicit slug rules

| Public/current slug | KKPhim mapping | Status |
| --- | --- | --- |
| `phim-le` | `phim-le` | supported |
| `phim-bo` | `phim-bo` | supported |
| `hoathinh`, `hoat-hinh` | `hoat-hinh` | supported alias |
| `tvshows`, `tv-shows` | `tv-shows` | supported alias |
| `phim-moi`, `phim-moi-cap-nhat` | general list | supported mapping |
| `subteam` | none | explicit unsupported result; no invented endpoint |

Detail slug aliases are finite and explicit. The adapter does not perform fuzzy matching, recursive fallback, VSMov fallback, or undocumented endpoint construction.

## Detail, episodes, and servers

KKPhim detail data is mapped from `data.item` and `episodes[]`:

- server order is preserved;
- server names are preserved as provider labels;
- episode order uses the existing natural episode sort;
- episode identity is the normalized episode slug;
- `filename`, `link_embed`, and `link_m3u8` are optional;
- missing episodes produce an empty normalized episode list and do not fabricate URLs;
- different server episode counts remain different and are never matched by array index.

The adapter exposes only normalized `embedUrl` and `m3u8Url` to callers. No raw KKPhim DTO reaches a page or component.

## Images and external identity

Absolute HTTP(S) image URLs are preserved. Relative KKPhim image paths are resolved against the response `APP_DOMAIN_CDN_IMAGE`, with `https://phimimg.com` as the documented-family default. Missing images use the existing safe placeholder pattern and do not fabricate a KKPhim storage path.

Optional `tmdb.id`, `tmdb.type`, `tmdb.season`, vote fields, and `imdb.id` are normalized into `externalIdentity`. Official TMDB enrichment is deliberately deferred.

## Discovery safety

The current resolver remains unchanged. KKPhim handles only combinations represented by its explicit adapter methods. A `type` combined with a genre, country, or year is rejected with an `INVALID_REQUEST` provider error because this phase does not have documented evidence for those combined filters. The adapter returns an explicit error/empty contract rather than silently broadening or inventing a request.

## Canary comparison

The off-by-default canary compares normalized data only:

- list count and first-item title, year, image presence, and external identity;
- detail success, title/year/image identity, server count, episode count, and HLS/embed availability;
- homepage latest rail summary.

It does not compare raw provider DTOs, does not write local/cloud state, and does not alter the primary response. Logs contain only operation and mismatch fields.

## Testing and fixtures

Fixtures cover:

- VSMov list envelope;
- KKPhim list envelope and pagination derivation;
- absolute and relative images;
- detail metadata and TMDB TV season identity;
- multiple servers with different episode counts;
- sorted episode names;
- HLS-present and embed-only episodes;
- malformed JSON and HTTP retry policy;
- unsupported list slugs;
- finite detail alias behavior;
- default provider selection and canary configuration.

No unit test calls a live provider. Live verification is an operational smoke only; it is not a test prerequisite.

## Consumer migration map

The following Web consumers now use `@/lib/api/movies` while preserving their public contracts:

- homepage and layout taxonomy;
- list, genre, country, and year pages;
- discovery page;
- search page and suggestions route;
- taxonomy routes;
- detail and watch pages.

`VideoPlayer.tsx`, persistence, watch history, playback progress, Auth, Supabase, SyncEngine, and Android TV are outside this phase and remain unchanged.

## Rollback and WEB-K3 readiness

Rollback is configuration-only. Before any future cutover, WEB-K3 must validate a broader live catalog sample, route-by-route KKPhim coverage, detail and playback identity compatibility, manifest behavior, and canary mismatch telemetry. This phase is adapter-ready, not a production migration approval.
