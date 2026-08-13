# WEB-K5 — TMDB metadata enrichment

## Scope and authority

WEB-K5 enriches the existing provider-authoritative movie detail route. The active VSMov/KKPhim provider remains responsible for the public slug, availability, episode order, server order, `m3u8Url`, `embedUrl`, and playback identity. TMDB is server-side presentation metadata only.

```text
getMovieDetail(publicSlug)
  → usable provider MovieDetailModel
  → externalIdentity.tmdbId/tmdbType
  → getTmdbMetadata(...)
  → optional image configuration
  → conservative merge
  → existing MovieDetails UI
```

The Watch page still calls the provider directly and remains playback-first. Home, Search, Explore, related movies, player code, progress, history, Auth, Supabase, and Android are outside this phase.

## Enrichment boundary

`lib/tmdb/enrichment.ts` is the single orchestration layer. It exposes:

- `getEnrichedMovieDetail(slug)` — server-only, React-cache-deduplicated orchestration for the Detail route;
- `enrichMovieDetail(movie, bundle, configuration)` — deterministic provider/TMDB merge;
- `toMovieDetailModel(enriched)` — serializable presentation model for the existing client component;
- `isTmdbIdentityTrusted(movie, bundle)` — conservative contradiction guard.

No TMDB DTO is passed to JSX. The client receives only normalized `TmdbDetailPresentation` data.

## Field precedence

| Field | Precedence | Notes |
| --- | --- | --- |
| Title | provider public title | Route/provider naming stays stable. |
| Original title | TMDB original title → provider original title | Presentation only; never changes slug. |
| Overview | TMDB primary locale → selective `en-US` fallback → provider synopsis | English is requested only when the primary overview is empty. |
| Poster | validated TMDB `posterLarge` → provider poster | URLs are built by `buildTmdbImageUrl`. |
| Backdrop | validated TMDB `backdropHero` → provider thumb/poster | Existing hero layout is unchanged. |
| Runtime | positive TMDB runtime → TV episode runtime → provider duration | No zero/NaN value is rendered. |
| Rating | TMDB vote average → provider rating | TMDB values are labelled `TMDB`; they are not PHEVO user ratings. |
| Vote count | TMDB vote count → provider vote count | Presentation only. |
| Release/year | TMDB release/first-air date → provider year | Year route behavior is unchanged. |
| Genres | TMDB display genres → provider categories | Provider category slugs remain navigation authority. |
| Cast | TMDB credits, bounded to 10 | Missing profile paths render safely; provider actor text remains fallback. |
| Directors/creators | movie `Director` crew → TV `created_by` → provider directors | Crew job is checked explicitly. |
| Trailer | deterministic trusted YouTube selection | No autoplay and no dead action; provider movie playback is separate. |
| Season | verified `tmdbSeason` metadata | Presentation only; provider episode slugs remain authoritative. |

## Locale fallback

```text
primary request (default vi-VN)
  → overview is non-empty: stop
  → overview is empty: one en-US request
  → merge only missing presentation fields
  → provider synopsis if both TMDB locales are empty
```

The fallback request uses the same official detail endpoint, cache/revalidation policy, timeout, and bounded retry policy as the primary request. It does not replace valid Vietnamese fields and does not run when the primary overview is already present. `append_to_response=credits,videos` is used when Detail enrichment is requested, so credits/videos are part of the detail request bundle rather than N+1 calls.

## TMDB request bundle and cache

The Detail route requests:

- movie or TV detail;
- `credits`;
- `videos`;
- verified TV season when `tmdbType=tv` and `tmdbSeason` is valid;
- cached image configuration after metadata succeeds.

Detail, locale fallback, and season requests retain K4's 10-second timeout, two-attempt maximum, and six-hour detail revalidation. Image configuration retains the seven-day revalidation. React `cache` deduplicates equivalent Detail metadata calls during one render, including `generateMetadata` and the page component. There is no unbounded in-memory cache.

## Credits, creators, and trailer

Credits are mapped to provider-neutral cast/crew records. The visible cast is limited to 10 records. Movie directors are selected by `job === "Director"`; arbitrary crew array position is never interpreted as director. TV creators come from the official `created_by` field.

Trailer selection is deterministic: supported YouTube videos are preferred, then official Trailer, then Trailer, then Teaser. The UI exposes a normal YouTube link only; it does not autoplay, parse remote HTML, or replace the provider Play button. Non-YouTube videos are ignored for the current product scope.

## Images

TMDB paths are accepted only when they are safe relative paths. `buildTmdbImageUrl` creates URLs using the K4 configuration/fallback and the existing `image.tmdb.org` Next image allowlist. Components do not concatenate TMDB paths and no arbitrary URL becomes an image source.

## TV season and episode policy

The verified season number is requested and shown as season presentation metadata. K5 does not join TMDB episode records to provider episodes because provider labels such as `Full`, `Tập 01`, specials, and incomplete servers require a conservative parser and verified numbering. No provider episode is hidden, renamed, reordered, or replaced. Provider episode slug, server, HLS/embed source, history key, and progress identity remain unchanged.

## Suspicious identity policy

Known TMDB IDs are not automatically corrected by title search. Enrichment is skipped when the result has a clear type mismatch, a large provider-year/TMDB-year contradiction, or a strong title contradiction combined with a year mismatch. Provider-only Detail is the safe result. False negatives are preferred to showing unrelated posters, actors, or descriptions.

## Failure behavior

| Condition | Result |
| --- | --- |
| Provider Detail fails | Existing provider error/not-found behavior. |
| Missing TMDB ID/type | Provider-only Detail. |
| TMDB token missing | Provider-only Detail; no authenticated request. |
| TMDB 404/timeout/429/5xx after bounded retry | Provider-only Detail. |
| Invalid TMDB response | Provider-only Detail. |
| Season request fails | Valid TMDB series remains; season block is omitted. |
| Cast/profile/trailer missing | The affected optional presentation item is omitted safely. |

TMDB failure never makes a playable provider movie unavailable and never changes playback data.

## Attribution

The Footer contains the required notice and links to TMDB:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

This placement is a small existing “Bản Quyền & Thông Tin” section addition. The current repository has no approved TMDB logo asset; the text notice is present and the logo requirement should be revisited if an approved asset is added later.

## Live Detail smoke — KKPhim with TMDB enabled

The production server was built once and run with `PHEVO_MOVIE_PROVIDER=kkphim`. Ten real Detail routes returned HTTP 200 and rendered the normalized enrichment state. “EN” means the selective English overview fallback was observed; “VI” means the primary Vietnamese overview was used.

| Title / slug | Type | Identity | Overview | Poster/backdrop | Cast | Trailer | Season | Page |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Những Ngã Đường Ước Mơ — `nhung-nga-duong-uoc-mo-nando-giua-hai-the-gioi-nando-entre-dois-mundos-um-filme-sintonia` | movie | 1487864 / movie | EN | TMDB | yes | no | — | 200 |
| Trong Khi — `trong-khi` | TV | 291856 / tv | EN | TMDB | yes | no | season block not returned in smoke | 200 |
| Nhân Ngư — `nhan-ngu-2026` | TV | 273119 / tv | VI | TMDB | yes | no | S1 | 200 |
| Trảm Thần — `tram-than-pham-tran-than-vuc-phan-2` | TV/animation | 259231 / tv | VI | TMDB | yes | no | S2 | 200 |
| Hộp Bất Ngờ — `hop-bat-ngo` | TV | 318903 / tv | EN | TMDB | yes | no | — | 200 |
| Hoa Khai Cẩm Tú — `hoa-khai-cam-tu` | TV | 287496 / tv | VI | TMDB | yes | no | — | 200 |
| Bí Ẩn Nhà Ma — `bi-an-nha-ma` | TV | 330348 / tv | VI | TMDB | yes | no | — | 200 |
| Bạn Gái Thiên Tài — `ban-gai-thien-tai` | TV | 289116 / tv | EN | TMDB | yes | no | — | 200 |
| Vạn Dặm Hẹn Ước — `van-dam-hen-uoc` | movie | 435797 / movie | provider/TMDB no usable overview | provider fallback | no | no | — | 200 |
| Ký Sinh Trùng — `ky-sinh-trung` | movie | 496243 / movie | VI | TMDB | yes | yes | — | 200 |

This includes three movie samples, seven TV/animation samples, a season greater than one, and multiple locale fallback cases. The smoke used the real application route rather than a fabricated response.

## Playback and route regression

The enriched Detail links to the same `/xem-phim/{providerSlug}?ep={providerEpisodeSlug}&server={serverIndex}` contract. A live `trong-khi` episode returned `tap-01`, both HLS and embed provider sources, and its direct Watch route returned HTTP 200. No TMDB field is used to construct `m3u8Url`, `embedUrl`, `ep`, `server`, history, or progress keys.

Watch remains provider-only and does not request credits, videos, heavy TMDB images, or season enrichment.

## Tests added

- `tests/unit/tmdb-enrichment.test.ts`: locale fallback/no-fallback, bounded cast, director/trailer selection, suspicious identity rejection, and provider episode identity preservation;
- `tests/unit/tmdb-client.test.ts`: one detail request bundle with `credits,videos`;
- fixtures for credits, videos, missing Vietnamese overview, and English fallback.

## Known limitations

- The current Detail smoke observes server-rendered metadata, not a full visual browser matrix at every viewport.
- Some valid TMDB records have no poster, cast profile, trailer, or translated overview; provider fallbacks remain intentional.
- K5 does not implement conservative provider↔TMDB episode-number joining; provider episode labels remain unchanged.
- The repository has no approved TMDB logo asset, so the required text attribution is implemented in the existing Footer information section.
- Web HLS/Plyr and Android playback are unchanged and are not part of enrichment verification.

## K6 boundary

K6 may own TMDB-powered discovery/recommendations, broader catalog enrichment, and any separately approved visual refinement. It must continue to treat TMDB as metadata-only and preserve provider playback authority.
