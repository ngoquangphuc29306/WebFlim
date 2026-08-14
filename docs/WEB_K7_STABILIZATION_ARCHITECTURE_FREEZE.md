# WEB-K7 — Full Web Stabilization & Architecture Freeze

## Scope and evidence

WEB-K7 audits and freezes the stabilized PHEVO Web architecture after the KKPhim cutover. No new product feature was introduced. Android TV remains a separate VSMov-backed subsystem and was not changed.

Static evidence was collected from `app/`, `components/`, `lib/api/`, `lib/tmdb/`, `lib/persistence/`, `lib/sync/`, `lib/auth/`, `types/`, `next.config.ts`, and `tests/`. The production build and the existing one-worker Playwright smoke suite are the runtime checks for this pass. Manual live HLS/browser verification remains an environment-dependent limitation and is not claimed here.

## Final Web architecture

```text
Web route/API
  → lib/api/movies.ts
  → MovieProvider
  → KkPhimMovieProvider
  → KkPhimClient
  → phimapi.com
  → normalized domain models
  → UI / VideoPlayer
```

TMDB is a separate, optional metadata and discovery service:

```text
KKPhim catalog/detail identity
  → optional TMDB enrichment
  → exact bounded KKPhim playability resolution
  → provider public slug
```

Pages do not import provider clients or raw provider DTOs. `lib/api/movies.ts` remains the only Web movie-data facade.

## Provider ownership matrix

| Concern | Owner |
| --- | --- |
| Movie catalog and latest data | KKPhim |
| Search | KKPhim |
| Explore filters and pagination | KKPhim through `MovieProvider` |
| Detail, episodes, servers, HLS/embed fields | KKPhim |
| Rich metadata, credits, trailers, images | TMDB when identity is trusted; provider fallback otherwise |
| Discovery candidates | TMDB |
| Playability identity | KKPhim public slug and normalized provider identity |
| Playback engine | Native HLS / HLS.js / Plyr |
| Persistence | Existing local-first repositories |
| Cloud sync | Existing `SyncEngine` and Supabase gateways |
| Android TV | Separate frozen VSMov subsystem |

## Route matrix

| Route | Source/contract | Result |
| --- | --- | --- |
| `/` | `getHomepageData()` and taxonomy through facade | PASS — KKPhim wiring and build verified |
| `/tim-kiem` | `keyword` and `page` through `searchMovies()` | PASS — provider contract and smoke navigation verified |
| `/kham-pha` | URL → `MovieBrowseFilter` → `browseMovies()` | PASS — provider-native serialization and unit coverage |
| `/phim/[slug]` | Enriched KKPhim detail with provider fallback | PASS — route wiring and enrichment fallback audited |
| `/xem-phim/[slug]` | KKPhim detail, `ep`, `server`, normalized episode source | PASS — route contract and player source wiring audited |
| `/danh-sach/[slug]` | KKPhim list adapter | PASS — route wiring verified |
| `/the-loai/[slug]` | KKPhim genre adapter | PASS — route wiring verified |
| `/quoc-gia/[slug]` | KKPhim country adapter | PASS — route wiring verified |
| `/nam/[year]` | KKPhim year adapter | PASS — route wiring verified |
| `/yeu-thich` | Local-first watchlist | PASS — no provider dependency for rendering |
| `/lich-su` | Local-first history/progress | PASS — no provider dependency for rendering |
| `/dang-nhap` | Auth UI | PASS — outside provider migration |
| `/api/search/suggestions` | KKPhim facade search | PASS — route wiring verified |
| `/api/taxonomy/countries` | KKPhim facade taxonomy | PASS — route wiring verified |
| `/api/taxonomy/years` | KKPhim facade taxonomy | PASS — route wiring verified |

The public routes and watch query parameters `ep` and `server` are frozen.

## Home, search, and Explore

Home remains provider-native. It loads hero/latest, single, series, subteam, animation, and taxonomy data from KKPhim through the facade. No TMDB trending rail was added.

Search preserves `keyword` and `page`, including empty-keyword handling and normalized provider results. Search cards continue to use provider public slugs for detail navigation.

Explore preserves the URL as the source of truth for:

```text
type, genre, country, year, yearFrom, yearTo,
language, sort, order, page
```

`parseMovieBrowseFilter`, `buildMovieBrowseUrl`, and `withBrowseFilterChange` preserve deep links, page reset behavior, and canonical query serialization. `KkPhimClient.buildKkPhimBrowseQuery` passes supported filters upstream without client-side fake filtering.

## Detail and TMDB boundary

KKPhim remains the authority for:

- public slug and route identity;
- title and provider images;
- episode/server ordering;
- `m3u8Url` and `embedUrl`;
- playable detail data.

TMDB enrichment is optional. Trusted TMDB identity is required before displaying enriched metadata. If TMDB is unavailable, missing, malformed, or identity validation fails, provider metadata remains the display fallback. TMDB IDs never become route or playback identity.

Related movies use a bounded strategy:

1. exact TMDB recommendations resolved through the bounded KKPhim availability index;
2. provider genre results and latest results fill remaining capacity;
3. current movie and duplicate slugs are removed;
4. output is capped at `RELATED_MOVIE_LIMIT`.

The availability index performs four bounded parallel catalog requests and resolves candidates in memory; it does not fetch provider detail or search once per recommendation.

## Player architecture freeze

Current direct playback path:

```text
normalized m3u8Url
  → native HLS when supported
  → otherwise HLS.js
  → one imperatively-created HTMLVideoElement
  → Plyr controls
```

Fallback path:

```text
direct backend failure or unsupported direct playback
  → dispose direct backend
  → trusted embed iframe
  → unavailable state when neither source exists
```

The source renders mutually exclusive branches. In direct mode the video host is rendered and no iframe is rendered. In embed mode the iframe is rendered and the direct video backend is disposed. HLS.js and Plyr cleanup, source-generation guards, bounded recovery counters, and route unmount cleanup remain owned by the player hooks.

The following are frozen for future UI work:

- video element ownership;
- HLS.js instance lifecycle;
- Plyr instance lifecycle;
- direct/embed exclusivity;
- cleanup order;
- fallback policy;
- seek and ended semantics;
- progress identity and save behavior.

## Persistence, history, and sync

Canonical playback progress identity remains:

```text
movieSlug + episodeSlug
```

Server index is metadata for resume/navigation, not part of the canonical progress key. Watchlist and history remain local-first and continue to use existing repositories and SyncEngine semantics.

Historical `vsmov_*` storage/event names remain unchanged for compatibility. No persisted data rewrite or slug migration was attempted. A migration of old persisted VSMov public slugs would require separate evidence and a separate phase.

## Error and failure boundaries

KKPhim client behavior is typed and bounded:

- `NOT_FOUND` for 404;
- `HTTP_ERROR` for other non-retryable HTTP failures;
- `TIMEOUT` for bounded timeout;
- `NETWORK_ERROR` for network failures;
- `INVALID_RESPONSE` for malformed/non-JSON responses;
- `EMPTY_RESPONSE` where the provider returns no usable data.

Only the defined transient statuses are retried, with a maximum of two attempts. Provider failures do not activate a VSMov fallback. TMDB failures degrade to provider metadata or provider-related fallback where the current flow supports it.

## Request, cache, and performance audit

- Homepage catalog calls are issued in parallel by `KkPhimMovieProvider.getHomepageData`.
- TMDB detail enrichment is React-cache deduplicated by identity/options.
- Provider availability is bounded and cached with a provider-aware cache key.
- Explore filter values are serialized into the upstream query and therefore participate in the request/cache identity.
- Related requests are bounded by the TMDB card limit and provider fallback cap.
- No unbounded retry, alias loop, provider-per-card detail fetch, or provider-per-candidate search path was found.
- Layout and Home both request genres; the React server cache deduplicates equivalent calls within the render graph where applicable. This remains an optimization observation, not a correctness blocker.

## Cache findings

| Area | Current behavior |
| --- | --- |
| KKPhim list/detail | Next `fetch` revalidation values remain in the client methods |
| Explore | Filter values are encoded in the request query; page and filter changes are explicit |
| TMDB detail | React cache keyed by identity, season, and requested enrichments |
| TMDB availability | `unstable_cache` keyed by active provider and revalidated periodically |
| Global catalog cache | None found |

## Secret audit

`TMDB_API_READ_ACCESS_TOKEN` is read only in the server-only TMDB client. No `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` exists. A scan of `.next/static` found no literal token occurrence. The TMDB hostname may appear in expected server/client image or API-related code; the credential is not included in the static client bundle.

## Image configuration audit

Active Web image hosts are:

- `phimimg.com` and subdomains;
- `phimapi.com` and subdomains;
- `image.tmdb.org`;
- YouTube thumbnail host;
- Google avatar hosts;
- `picsum.photos` placeholder host.

VSMov Web image hosts are absent from `next.config.ts`. Missing or malformed provider image values map to safe placeholders at the KKPhim mapper/UI boundary.

## Dead-code audit

Removed in WEB-K6R and confirmed absent from active Web runtime:

- VSMov client and adapter;
- Web provider selector and canary flags;
- shadow-provider comparison layer;
- VSMov detail fallback and old aliases;
- VSMov-only normalizers and test fixtures.

Intentionally retained:

- `VSMovPagination` as a legacy normalized type name with broad UI usage;
- `vsmov_*` persistence keys and events;
- historical documents and Android VSMov implementation.

## Responsive baseline

The existing responsive class structure was audited at the requested viewport set: 360, 390, 430, 768, 1024, 1280, and 1440. No route-level overflow or contract issue was introduced by K7. Visual density, copy encoding, and polish issues remain UI-phase work.

## Accessibility baseline

Existing functional mechanisms remain in place:

- semantic links and buttons;
- focus-visible styles;
- dialog `role="dialog"` and `aria-modal`;
- dialog Escape handling and focus restoration;
- `aria-pressed` for filter buttons;
- labelled search/filter controls;
- keyboard-safe player controls.

Detailed contrast and visual hierarchy work is intentionally deferred to UI phases.

## Console and hydration audit

The global `suppressHydrationWarning` on `<body>` was removed because it was a blanket suppression from initial scaffolding. Browser-dependent state in the player is initialized after hydration. The production build and one-worker E2E smoke suite pass after this change. No new hydration error was observed in the automated route shell checks.

## UI issue register

| Priority | Finding | Action |
| --- | --- | --- |
| P0 | None found | No runtime blocker |
| P1 | No reproducible provider/player/navigation blocker in automated checks | Defer live manual verification where environment is required |
| P2 | Existing Vietnamese copy/encoding inconsistencies remain in historical/current UI source | Defer to UI/content cleanup; do not alter architecture here |
| P3 | Visual spacing, density, and polish refinements remain possible | Defer to WEB-UI1 and later UI phases |

## UI freeze contract

Future UI-only phases may modify:

- layout and responsive arrangement;
- spacing and typography;
- visual hierarchy and CSS/Tailwind;
- icons and button presentation;
- loading, empty, error, and dialog presentation.

They must not modify without explicit approval:

- `lib/api/**` provider boundary or DTO mapping;
- `lib/tmdb/**` identity/enrichment/playability rules;
- routes or `ep`/`server` query semantics;
- `MovieBrowseFilter` serialization;
- normalized episode/server identity;
- persistence, sync, Auth, or Supabase;
- Android TV code.

## Player UI freeze contract

Future player visual work may change control layout and styling, but must preserve:

- one active backend at a time;
- video/HLS/Plyr ownership and cleanup;
- source-generation guards;
- direct-to-embed fallback policy;
- seek, ended, and route-exit behavior;
- `movieSlug + episodeSlug` progress identity;
- no fake state for cross-origin embeds.

## UI readiness

The Web architecture is ready for a UI-only phase after the required automated gates pass. Live manual playback, multi-server sampling, and device-specific responsive inspection remain release QA items rather than architecture changes.
