# WEB-K6R — VSMov Retirement from Web

## Scope

WEB-K6R retires VSMov from the Next.js Web runtime only. Android TV remains intentionally VSMov-backed and is outside this change. Public routes, query parameters, normalized movie models, player input contracts, persistence, Auth, Supabase, and SyncEngine remain stable.

## Before and after

Before:

```text
Web page/API
  → lib/api/movies.ts
  → provider selector (PHEVO_MOVIE_PROVIDER)
  → VsmovMovieProvider or KkPhimMovieProvider
  → optional shadow/canary request to the other provider
```

After:

```text
Web page/API
  → lib/api/movies.ts
  → MovieProvider boundary
  → KkPhimMovieProvider
  → KkPhimClient
  → https://phimapi.com
```

The facade remains the Web consumer entry point. Pages do not import the KKPhim client or provider DTOs directly.

## Retired Web-only pieces

- Removed the `PHEVO_MOVIE_PROVIDER` and `PHEVO_MOVIE_PROVIDER_CANARY` configuration path.
- Removed shadow-provider calls and normalized canary comparison logging.
- Removed `VsmovMovieProvider` and the old `lib/api/vsmov.ts` client.
- Removed the VSMov-only normalizers and their raw VSMov response types.
- Removed the old VSMov request/retry/fallback tests and fixtures.
- Removed the VSMov → PhimAPI detail fallback and the `one-piece` / `dao-hai-tac` aliases that belonged to that fallback.
- Removed VSMov image hosts from `next.config.ts`; current Web image sources remain covered by `phimimg.com`, `phimapi.com`, TMDB, Google avatar, YouTube, and the placeholder host.

The `phimapi.com` hostname remains in the KKPhim client because it is the active KKPhim API and image/CDN family, not a legacy VSMov fallback.

## Preserved contracts and data safety

- `lib/api/movies.ts` still exports the existing list, taxonomy, detail, homepage, catalog, and browse functions.
- `MovieProvider` remains the provider-neutral boundary; its sole Web implementation is `KkPhimMovieProvider`.
- `MovieCardModel`, `MovieDetailModel`, `EpisodeItemModel`, `ServerGroupModel`, pagination, provider identity, and external TMDB identity remain available to consumers.
- Public routes remain unchanged, including `/phim/[slug]`, `/xem-phim/[slug]`, `/tim-kiem`, `/kham-pha`, category routes, country routes, and year routes. `ep` and `server` query semantics were not changed.
- The player was not modified. It still receives normalized `m3u8Url` / `embedUrl` data.
- Existing localStorage and sync keys retain their historical `vsmov_` names. They are compatibility keys, not active Web provider selection, and must not be renamed during retirement.
- Auth, Supabase, SyncEngine, playback progress, watch history, watchlist, and Android TV files were not modified.

## Explore and TMDB playability

Explore continues to resolve URL state into `MovieBrowseFilter`, then delegates provider-specific serialization through the facade. The obsolete VSMov capability branch was removed; KKPhim capabilities remain available for validation of supported filters.

TMDB playability continues to use the bounded active-provider availability index, now backed only by KKPhim. TMDB identity matching and TV-season selection rules are unchanged. No automatic cross-provider fallback was introduced.

## Runtime reference audit

The Web runtime contains no active import or execution path for:

- `lib/api/vsmov.ts`;
- `VsmovMovieProvider`;
- `PHEVO_MOVIE_PROVIDER` or `PHEVO_MOVIE_PROVIDER_CANARY`;
- the VSMov canary/shadow comparison layer;
- the VSMov detail fallback.

Remaining `vsmov` text is intentional:

| Location | Reason |
| --- | --- |
| `lib/persistence/storage.ts` and `lib/utils/search-history.ts` | Existing localStorage/event keys; preserved for backward compatibility and data safety. |
| `types/movie.ts` `VSMovPagination` name | Existing normalized pagination contract used by UI; renaming is outside retirement scope and would create unnecessary consumer churn. |
| Historical phase/design/audit documents and Supabase migration comments | Historical record or Android/shared architecture documentation; not Web runtime execution. |

## Manual audit status

Static source audit and automated Web checks were run after the retirement. A live browser smoke of every page and manual HLS playback verification are deployment-environment checks and are not claimed by this document. The existing E2E smoke suite remains the runtime regression gate.

## K7 readiness

The Web provider cutover is structurally ready for K7-level cleanup: one production provider, one provider-neutral facade, no provider selector/canary, no VSMov Web fallback, and stable UI/persistence contracts. Future work should still treat the Android VSMov data layer as a separate product surface and should not delete historical persistence keys without an explicit migration plan.
