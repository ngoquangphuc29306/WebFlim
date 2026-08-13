# WEB-K4 — Official TMDB foundation

## Scope and boundary

WEB-K4 adds a server-only metadata foundation. It does not change PHEVO pages, provider selection, playback, routes, persistence, or the normalized movie models consumed by UI.

```text
KKPhim normalized movie
  → ExternalIdentity (tmdbId, tmdbType, tmdbSeason, imdbId)
  → TmdbMetadataService
  → TmdbClient
  → Official TMDB API
  → DTO mapper
  → provider-neutral TMDB metadata
```

KKPhim and VSMov remain content and playback providers. TMDB is metadata-only: it must never provide `m3u8Url`, `embedUrl`, episode slug, server identity, or playback progress identity.

## Authentication and server-only boundary

- Environment key: `TMDB_API_READ_ACCESS_TOKEN`
- Optional locale: `TMDB_LANGUAGE` (defaults to `vi-VN`)
- Authentication: `Authorization: Bearer <TMDB API Read Access Token>`
- Base URL: `https://api.themoviedb.org/3`
- Authenticated modules (`lib/tmdb/client.ts`, `lib/tmdb/service.ts`, and `lib/tmdb/index.ts`) import `server-only`.
- Never use a `NEXT_PUBLIC_TMDB_*` variable, return the token, or import `lib/tmdb/client` from a Client Component.

If the token is absent, the client returns a typed `CONFIGURATION_ERROR` without sending a network request. Existing Home, Search, Detail, Watch, provider, and player behavior therefore remain usable.

## Identity routing

`ExternalIdentity` is the K2 normalized contract and is reused unchanged:

```ts
{
  tmdbId?: string
  tmdbType?: 'movie' | 'tv'
  tmdbSeason?: number | null
  imdbId?: string
}
```

- `tmdbType: 'movie'` → `GET /movie/{tmdbId}`
- `tmdbType: 'tv'` → `GET /tv/{tmdbId}`
- `tmdbType: 'tv'` with `includeSeason: true` and a non-negative `tmdbSeason` → `GET /tv/{tmdbId}/season/{season}` after TV detail.

There is no title search, fuzzy matching, or automatic IMDb fallback in K4. TMDB season and episode numbers are metadata only. PHEVO playback identity remains `movieSlug + episodeSlug` and provider server/episode order remains authoritative.

## Normalized contracts

Raw official API payloads stay inside `lib/tmdb/dto.ts`. Mappers return:

- `TmdbMediaMetadata` for movie or TV detail;
- `TmdbSeasonMetadata` and episode summaries for an optional TV season;
- `TmdbImageConfiguration` for image construction.

The metadata service returns a `TmdbMetadataBundle`. A season failure is non-fatal once valid TV metadata is available: the bundle retains metadata and records `seasonError`.

## Request, retry, and cache policy

| Policy | Value |
| --- | --- |
| Timeout | 10 seconds per HTTP attempt |
| Maximum attempts | 2 total |
| Retryable | network error, timeout, 429, 500, 502, 503, 504 |
| Not retried | 400, 401, 403, 404, 422, 501, 505, malformed JSON, non-JSON |
| Retry delay | 50 ms; `Retry-After` for 429 is respected but capped at 1 second |
| Detail revalidation | 21,600 seconds (6 hours) |
| Configuration revalidation | 604,800 seconds (7 days) |

The public service entry point uses React server `cache` with primitive identity arguments to deduplicate equivalent metadata calls during a render. No global mutable cache is introduced.

## Image policy

TMDB returns paths, never application-ready URLs. `buildTmdbImageUrl(path, preset, configuration)` centrally builds URLs from safe TMDB paths and a normalized configuration response.

Presets are `posterSmall`, `posterCard`, `posterLarge`, `backdropCard`, `backdropHero`, `profile`, and `still`. They avoid `original` by default. Missing, empty, malformed, or external URLs return `undefined`; page components must not concatenate TMDB image paths themselves.

The configuration endpoint is preferred. A conservative official `https://image.tmdb.org/t/p/` fallback with bounded sizes allows the helper to be safe if configuration is temporarily unavailable; callers may choose not to display TMDB imagery when the configuration service returns an error.

## Errors and graceful failure

`TmdbError` distinguishes `CONFIGURATION_ERROR`, `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `AUTH_ERROR`, `NOT_FOUND`, `HTTP_ERROR`, `INVALID_RESPONSE`, `INVALID_IDENTITY`, and `ABORTED`.

TMDB is optional enrichment. A TMDB failure must be handled as absent enrichment and must not change a provider's normalized detail, HLS/embed selection, progress/history, public URL, or player lifecycle.

## Future K5 usage

K5 may call `getTmdbMetadata(movie.externalIdentity)` only from server-side orchestration after the provider detail is already usable. It may opt into season metadata using `{ includeSeason: true }`. Before rendering visible TMDB-derived information in production, K5 must address TMDB attribution and terms in the UI design phase.

K5 must not use TMDB episode numbers to rewrite provider episode slugs or use TMDB as a content/playback fallback.

## Local verification

1. Set a real local-only `TMDB_API_READ_ACCESS_TOKEN` in `.env.local`.
2. Run `npm run test:run` for deterministic DTO, client, retry, routing, and image tests.
3. Run a bounded server-side smoke with a verified KKPhim `externalIdentity` sample: at least one movie, one TV series, and one TV season.
4. Verify the browser makes no direct request to `api.themoviedb.org` and generated client bundles contain no token.

Do not commit `.env.local` or any token.
