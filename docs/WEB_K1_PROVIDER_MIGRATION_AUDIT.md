# WEB-K1 — Provider Migration Audit: VSMov → KKPhim

Audit date: 2026-08-13
Branch: `feature/web-k1-provider-audit`
Scope: read-only provider audit; no runtime migration was performed.

Official references: [VSMov API documentation](https://vsmov.com/api-document) and [KKPhim API documentation](https://kkphim.com/api-document).

## A. BASELINE

- Current branch: `feature/web-k1-provider-audit`
- Starting commit: `d229e87 Merge pull request #8 from ngoquangphuc29306/feature/android-tv-tv4f`
- Starting working tree: clean
- `main`: not modified
- No commit, push, deploy, production configuration, or source-code migration was performed.

Relevant ancestry visible in the starting history:

| Area | Commit |
| --- | --- |
| TV-4A | `1f0010c feat: add Media3 playback engine for Android TV` |
| TV-4B | `201435b feat: add polished Android TV player experience` |
| TV-4C | `0290e34 Phase TV-4C Fix UI in player` |
| TV-4D | `8d31c2d feat: add HLS-first hybrid playback with virtual cursor fallback` |
| Current tip | `d229e87` |

## B. CURRENT VSMOV ARCHITECTURE

The Web currently calls VSMov directly from pages and API routes. There is no provider-neutral repository boundary on the Web yet.

```text
Next page / API route
    ↓
lib/api/vsmov.ts
    ↓
lib/api/normalizers.ts
    ↓
types/movie.ts normalized models
    ↓
UI / VideoPlayer
```

The request helper in `lib/api/vsmov.ts` uses a 10-second timeout, at most two attempts, and retries network/timeout failures plus HTTP 500, 502, 503, and 504. It preserves Next.js `next.revalidate` options. Invalid content type and invalid JSON are classified as invalid responses and are not retried.

Detail behavior is intentionally special: VSMov is tried first; fallback requests go to `https://phimapi.com/phim/{slug}` only when the VSMov detail is missing or the first server begins at an episode number greater than 20. The only explicit alias pair is `one-piece` ↔ `dao-hai-tac`.

## C. CURRENT PROVIDER DEPENDENCY MATRIX

| PHEVO feature | Current VSMov call | Data consumed | Critical? | KKPhim equivalent |
| --- | --- | --- | --- | --- |
| Home/latest | `getHomepageData` → `getLatestMovies(1)` | cards, pagination, hero candidates | High | `/v1/api/danh-sach?page=1` or `/v1/api/home` |
| Movie list | `getMovieListBySlug(slug,page)` | cards, title, pagination | High | `/v1/api/danh-sach/{type}?page=`; documented type slugs include `phim-le`, `phim-bo`, `hoat-hinh`, `tv-shows`, `phim-chieu-rap` |
| Phim lẻ | `getMovieListBySlug('phim-le')` | cards | High | `/v1/api/danh-sach/phim-le` live-verified |
| Phim bộ | `getMovieListBySlug('phim-bo')` | cards | High | `/v1/api/danh-sach/phim-bo` live-verified |
| Hoạt hình | homepage uses `getMoviesByGenre('hoat-hinh')`; list route also accepts `hoathinh` | cards | High | `/v1/api/danh-sach/hoat-hinh` live-verified; KK type is `hoathinh` in returned items |
| TV shows | `getMovieListBySlug('tvshows')` | cards | Medium | `/v1/api/danh-sach/tv-shows` live-verified |
| Search | `searchMovies(keyword,page)` | cards, pagination | High | `/v1/api/tim-kiem?keyword=&page=&limit=` |
| Genre taxonomy | `getGenresList()` | id, name, slug | Medium | `/the-loai` or v1 taxonomy equivalent |
| Genre list | `getMoviesByGenre(slug,page)` | cards, pagination | High | `/v1/api/the-loai/{slug}?page=` |
| Country taxonomy | `getCountriesList()` | id, name, slug | Medium | `/quoc-gia` |
| Country list | `getMoviesByCountry(slug,page)` | cards, pagination | High | `/v1/api/quoc-gia/{slug}?page=` |
| Year taxonomy | `getYearsList()` | id, name, slug, year | Medium | `/nam-phat-hanh` |
| Year list | `getMoviesByYear(year,page)` | cards, pagination | High | `/v1/api/nam/{year}?page=` |
| Discovery | `getCatalogMovies` after `discovery-resolver` | cards, pagination, bounded filters | High | v1 list/filter endpoints support category, country, year, sort and language filters; exact combined-filter behavior needs adapter tests |
| Detail | `getMovieDetail(slug)` | detail metadata, normalized servers/episodes | Critical | `/v1/api/phim/{slug}` |
| Related movies | detail/watch page → primary genre, then latest fallback | cards | Medium | `/v1/api/the-loai/{primarySlug}` then latest list |
| Episode | normalized `EpisodeItemModel` | name, slug, filename, embedUrl, m3u8Url | Critical | detail `data.item.episodes[].server_data[]` |
| Server | normalized `ServerGroupModel` | server name and ordered episode items | Critical | detail `episodes[].server_name` and `server_data[]` |
| Player source | `link_m3u8` and `link_embed` normalized by `normalizers.ts` | direct HLS first, iframe fallback | Critical | same field names are documented and live-observed in KKPhim detail responses |

Current Web consumers directly importing `@/lib/api/vsmov` are:

`app/page.tsx`, `app/layout.tsx`, `app/danh-sach/[slug]/page.tsx`, `app/the-loai/[slug]/page.tsx`, `app/quoc-gia/[slug]/page.tsx`, `app/nam/[year]/page.tsx`, `app/kham-pha/page.tsx`, `app/tim-kiem/page.tsx`, `app/phim/[slug]/page.tsx`, `app/xem-phim/[slug]/page.tsx`, `app/api/search/suggestions/route.ts`, `app/api/taxonomy/countries/route.ts`, and `app/api/taxonomy/years/route.ts`.

## D. CURRENT ROUTE / PLAYBACK CONTRACTS

Provider-independent public routes found in source:

| Route | Current provider-facing behavior |
| --- | --- |
| `/` | Homepage data and rails from VSMov |
| `/danh-sach/[slug]` | Preset list slug passed to `getMovieListBySlug` |
| `/the-loai/[slug]` | VSMov genre slug |
| `/quoc-gia/[slug]` | VSMov country slug |
| `/nam/[year]` | VSMov year |
| `/kham-pha` | Discovery query resolved to VSMov catalog calls |
| `/tim-kiem` | `keyword` and `page` query parameters |
| `/phim/[slug]` | Detail lookup by movie slug |
| `/xem-phim/[slug]` | Detail lookup plus `ep` and `server` query parameters |

The watch page selects the server by numeric `server`, then finds the episode by normalized `ep` slug, otherwise uses the first episode in that server. The player receives normalized `embedUrl`, optional `m3u8Url`, `movieSlug`, `episodeSlug`, `serverIndex`, and next-episode identity. `VideoPlayer` starts direct playback when `m3u8Url` exists and falls back to the normalized embed URL when direct playback fails.

Playback persistence identity is:

```text
movieSlug + episodeSlug
```

`serverIndex` and `serverName` are additional progress/history metadata, not the primary progress key. This identity is implemented in `lib/persistence/progress/local-progress.repository.ts` and `lib/sync/merge.ts`. Storage keys still carry legacy `vsmov_` prefixes, so a provider migration must not silently change slugs or persistence keys.

## E. VSMOV LIVE API CONTRACT

The official VSMov documentation identifies `https://vsmov.com/api` as the JSON/UTF-8 GET API and documents public endpoints without a token. The source and live probes confirm the following current contracts.

| Capability | Current endpoint | Live observation |
| --- | --- | --- |
| Latest | `/api/danh-sach/phim-moi-cap-nhat?page=1` | HTTP 200 JSON; list envelope has `status`, `items`, `pagination` |
| Type list | `/api/danh-sach/{slug}?page=` | `phim-le`, `phim-bo`, and `subteam` returned 200; `hoathinh` returned 404 in this run |
| Genre list | `/api/the-loai/{slug}?page=` | `/api/the-loai/hoat-hinh` returned 200; this is the current working animation path |
| Country list | `/api/quoc-gia/{slug}?page=` | `/api/quoc-gia/han-quoc` returned 200 |
| Year list | `/api/nam/{year}?page=` | `/api/nam/2024` returned 200 |
| Search | `/api/tim-kiem?keyword=&page=` | HTTP 200 for non-empty searches; envelope differs from KKPhim and uses top-level `items`/`pagination` |
| Taxonomy | `/api/the-loai`, `/api/quoc-gia`, `/api/nam` | taxonomy envelope has `status`, `message`, `data.items` |
| Detail | `/api/phim/{slug}` | HTTP 200 JSON for valid detail; top-level `movie` and `episodes` |

VSMov list pagination observed: `totalItems`, `totalItemsPerPage`, `currentPage`, `totalPages`. Detail server data observed as `episodes[] → server_name → server_data[]`; episode data uses `name`, `slug`, `filename`, `link_embed`, and in current responses may omit `link_m3u8`.

Images are normally absolute VSMov URLs in live detail/list responses. The current normalizer also resolves relative values against `https://vsmov.com`. This provider-specific behavior must move behind a future adapter.

Error behavior is inconsistent: valid list/detail calls returned JSON, while a missing VSMov detail and malformed detail slug returned an HTML 404 page rather than JSON. An empty VSMov search returned an HTML application page in this probe. The current Web request helper therefore correctly treats content-type and JSON parsing as explicit failure conditions.

## F. KKPHIM LIVE API CONTRACT

KKPhim documents `https://phimapi.com` as the base URL. The current documentation describes both legacy endpoints and v1 endpoints. The live probes below used the v1 endpoints for catalog/detail and the documented taxonomy endpoints.

| Capability | Current endpoint / shape | Verified observation |
| --- | --- | --- |
| Home | `/v1/api/home?page=1` | HTTP 200; `{status,message,data}` |
| Latest/catalog | `/v1/api/danh-sach?page=1` | HTTP 200; `data.items`, `data.params.pagination`, `APP_DOMAIN_CDN_IMAGE` |
| Phim lẻ | `/v1/api/danh-sach/phim-le?page=1` | HTTP 200; 24 items in probe |
| Phim bộ | `/v1/api/danh-sach/phim-bo?page=1` | HTTP 200; 24 items in probe |
| Hoạt hình | `/v1/api/danh-sach/hoat-hinh?page=1` | HTTP 200; returned item type `hoathinh` |
| TV shows | `/v1/api/danh-sach/tv-shows?page=1` | HTTP 200 |
| Search | `/v1/api/tim-kiem?keyword=&page=1&limit=10` | HTTP 200; `data.items`, `data.params.pagination`; documented limit default 10, max 64 |
| Genre taxonomy | `/the-loai` | HTTP 200; 26 items in probe |
| Country taxonomy | `/quoc-gia` | HTTP 200; 36 items in probe |
| Year taxonomy | `/nam-phat-hanh` | HTTP 200; items are `{year}`; 116 items in probe |
| Genre list | `/v1/api/the-loai/{slug}?page=` | `/hanh-dong` returned 200 |
| Country list | `/v1/api/quoc-gia/{slug}?page=` | `/han-quoc` returned 200 |
| Year list | `/v1/api/nam/{year}?page=` | `/2024` returned 200 |
| Detail by slug | `/v1/api/phim/{slug}` | HTTP 200; `data.item` contains `episodes` |
| Detail by ID | `/phim/id/{id}` | Documented, but the tested current v1 `_id` did not resolve through this path; must not be assumed equivalent without a dedicated valid-ID test |
| Detail by TMDB | `/tmdb/movie/{id}`, `/tmdb/tv/{id}` | `/tmdb/tv/295599` returned 200 for the sampled TV record; movie/tv type matters |
| Detail by IMDB | `/imdb/title/{id}` | Tested with a sampled IMDB ID; returned HTTP 200 |
| People | `/v1/api/phim/{slug}/peoples` | Officially documented; returns people metadata and TMDB identity fields |
| Keywords | `/v1/api/phim/{slug}/keywords` | Tested HTTP 200; returns `tmdb_id`, `tmdb_type`, `tmdb_season`, `imdb_id`, and `keywords` |

The v1 list response uses `data.params.pagination`. The live response returned `totalPages`; the documentation example also shows `pageRanges` in one v1 example, so the future adapter must support both names and derive a safe page count when necessary. The current VSMov normalized pagination contract can remain stable behind that adapter.

The v1 detail item has the important fields needed by the current domain: `_id`, `name`, `slug`, `origin_name`, `content`, `type`, `status`, `thumb_url`, `poster_url`, `trailer_url`, `time`, `episode_current`, `episode_total`, `quality`, `lang`, `year`, `actor`, `director`, `category`, `country`, `tmdb`, and `episodes`.

## G. SAMPLE METHODOLOGY

The audit used a deterministic bounded sample collected from current list endpoints on 2026-08-13:

- VSMov: pages 1–2 of latest, phim lẻ, phim bộ, animation by genre, subteam, Hàn Quốc, and year 2024.
- KKPhim: pages 1–2 of latest, phim lẻ, phim bộ, animation, subteam, Hàn Quốc, and year 2024.
- Each page was deduplicated by provider slug.
- Returned page sizes were generally 20 for VSMov and 24 for KKPhim; VSMov subteam page 2 returned zero items.
- Matching was conservative: exact slug, exact normalized title plus year, exact original title plus year, or usable TMDB identity. No aggressive fuzzy matching was counted as exact.
- Detail requests were made only for conservative KKPhim matches.

The resulting list sample contained 212 unique VSMov records and 268 unique KKPhim records. The records are current/recent catalog slices, not a full-catalog census; list pages are time-sensitive and provider categories are not identical.

## H. CATALOG COVERAGE

| Metric | Count | Percentage |
| --- | ---: | ---: |
| VSMov sample size | 212 | 100.0% |
| KKPhim comparison sample size | 268 | 126.4% of VSMov sample |
| Exact KKPhim match | 21 | 9.9% of VSMov sample |
| High-confidence title/year or identity match | 12 | 5.7% |
| Exact + high-confidence match | 33 | 15.6% |
| Ambiguous | 0 | 0.0% |
| VSMov-only within this bounded comparison | 179 | 84.4% |
| Matched KKPhim detail successful | 33 | 100.0% of matched records |

Breakdown of the 33 conservative matches by KKPhim returned type:

| Type | Count | Percentage of matches |
| --- | ---: | ---: |
| Movie (`single`) | 0 in this match set | 0.0% |
| Series (`series`) | 31 | 93.9% |
| Animation (`hoathinh`) | 1 | 3.0% |
| TV show (`tvshows`) | 1 | 3.0% |

The match set is heavily series-weighted because the current sampled list pages and release timing are not symmetrical. The 15.6% figure must not be interpreted as whole-catalog coverage.

## I. HLS COVERAGE

Among the 33 matched KKPhim details:

| Metric | Count | Percentage |
| --- | ---: | ---: |
| Matched titles with at least one HLS episode | 33 / 33 | 100.0% |
| Matched titles with at least one embed episode | 33 / 33 | 100.0% |
| Total server groups | 43 | — |
| Server groups with at least one HLS episode | 43 / 43 | 100.0% |
| Total episodes across server groups | 1,097 | — |
| Episodes with `link_m3u8` | 1,097 / 1,097 | 100.0% |
| Episodes without `link_m3u8` | 0 / 1,097 | 0.0% |
| Episodes with `link_embed` | 1,097 / 1,097 | 100.0% |
| Episodes embed-only | 0 / 1,097 | 0.0% |

This is strong evidence for the sampled matched details, but not proof that every KKPhim catalog record has direct HLS. It also measures field presence, not complete playback success.

## J. HLS MANIFEST / WEB COMPATIBILITY

A bounded manifest probe inspected four unique KKPhim HLS hosts, including four master manifests and one media playlist:

| Check | Result |
| --- | --- |
| HTTP request | All sampled manifest requests returned HTTP 206 with a byte range |
| Content type | `application/vnd.apple.mpegurl` |
| `#EXTM3U` | Present |
| Master playlist | Present in sampled root manifests |
| Media playlist | Present in one followed child playlist with `#EXTINF` segments |
| Redirects | No redirect observed in the bounded sample |
| CORS | `Access-Control-Allow-Origin: *` observed on sampled manifests |
| HTTPS | All sampled URLs used HTTPS |
| Authentication/signature | No obvious query signature or cookie requirement in sampled URLs |
| Hosts | `v7.kkphimplayer7.com`, `s5.phim1280.tv`, `s4.phim1280.tv`, `s6.kkphimplayer6.com` |

Sampled master variants included 1920×1080 declarations with approximate bandwidths of 2,000,000–3,500,000 bits/s. The child media playlist contained ordinary `.ts` segment references. No alternate audio or subtitle renditions were present in the inspected manifests.

This is network-level compatibility evidence for a future HLS.js integration. It is not a browser playback test, does not prove every segment has identical CORS behavior, and does not prove every Android Media3 device/network can play every source.

For the future Web target, HLS.js is the playback engine for browsers without native HLS support; Plyr would only be the presentation/control layer. Neither dependency was installed in WEB-K1.

## K. SUBTITLE FINDINGS

Evidence from the sampled KKPhim detail payloads and manifests:

| Classification | Finding |
| --- | --- |
| HLS subtitle track | Not observed in the five inspected manifests |
| External WebVTT track | Not observed in detail fields or inspected manifests |
| Burned-in subtitle | Not directly proven by API/manifest inspection |
| Separate provider track | Not observed |
| Current conclusion | `UNKNOWN`; treat `lang`/server labels such as Vietsub as content-language metadata, not proof of selectable subtitles |

The current server labels include `Vietsub`, `Thuyết Minh`, and `Lồng Tiếng`. A future adapter must not expose a selectable subtitle feature unless a real track contract is verified.

## L. SERVER FINDINGS

KKPhim server groups map structurally to the current normalized `ServerGroupModel`:

```text
episodes[]
  server_name
  server_data[]
```

Observed labels include `Vietsub`, `Thuyết Minh`, `Lồng Tiếng`, `Special`, and combinations such as `Vietsub #1`. Labels can be retained as display names, but semantic families must remain distinct. The adapter should preserve provider order and should not merge `Vietsub`, `Lồng Tiếng`, and `Thuyết Minh` merely because they share episode numbers.

## M. EPISODE IDENTITY FINDINGS

KKPhim detail samples expose:

```text
name
slug
filename
link_embed
link_m3u8
```

Observed episode naming conventions include `Tập n`, `Full`, and provider-specific labels. The safest future normalized identity remains the provider `slug`, with `name` as display text and `filename` as source metadata only. Episode ordering should remain provider order unless the adapter explicitly applies the current natural numeric sort without changing identity.

This matters because current PHEVO progress/history is keyed by `movieSlug + episodeSlug`; provider migration must preserve a deterministic mapping or intentionally version it with a compatibility plan.

## N. MULTI-SERVER FINDINGS

Ten multi-server titles were found in the matched detail set. Counts below are per provider detail response and include the total episode rows across server groups.

| Movie | Server groups | Episodes | HLS count | Embed count |
| --- | ---: | ---: | ---: | ---: |
| Ngự Đình Dao | 2 | 58 | 58 | 58 |
| Bạn Gái Thiên Tài | 2 | 46 | 46 | 46 |
| Sát Thủ Nội Trợ (Vợ Tôi Là Sát Thủ) | 2 | 8 | 8 | 8 |
| Sếp Ơi, Mai Đừng Gặp Nhau! | 2 | 14 | 14 | 14 |
| Giấc Mơ Trao Em | 2 | 20 | 20 | 20 |
| Chuyện Tình Ma Quái | 2 | 13 | 13 | 13 |
| Kẹo Ngọt Tình Yêu | 2 | 24 | 24 | 24 |
| Vỏ Bọc Ngoại Tình | 2 | 8 | 8 | 8 |
| Đặc Vụ Kim Tái Khởi Động | 2 | 20 | 20 | 20 |
| Báo Thù | 2 | 17 | 17 | 17 |

Episode counts differ between server families in several titles. A future adapter must not assume equal episode counts or identical episode slugs across servers.

## O. IMAGE CONTRACT

VSMov live list/detail responses in the sample returned absolute `https://vsmov.com/storage/images/...` image URLs. The current Web normalizer also supports absolute values unchanged and resolves relative values against the VSMov domain.

KKPhim live responses were mixed:

- detail sample: absolute `https://phimimg.com/uploads/...` URLs;
- v1 list sample: relative values such as `uploads/movies/...` and `upload/vod/...`;
- response metadata: `APP_DOMAIN_CDN_IMAGE: https://phimimg.com`.

Therefore a KKPhim adapter must resolve relative paths using the response/provider CDN contract, not the VSMov domain, and must preserve absolute URLs unchanged. Image normalization must remain outside UI components.

## P. TMDB ID FINDINGS

From 33 successful matched KKPhim details:

```text
TMDB ID present: 33
TMDB ID missing: 0
movie: 1
tv: 32
season edge cases: 32 records had a season value; 1 movie record had null season
```

Observed KKPhim shape:

```json
{
  "tmdb": {
    "id": "295599",
    "type": "tv",
    "season": 1,
    "vote_average": 9,
    "vote_count": 1
  }
}
```

This supports a future enrichment identity of `tmdb.id + tmdb.type`, with season retained for TV context. It is not sufficient to assume a single TMDB ID identifies a specific season. Edge cases requiring future handling are missing IDs outside this match sample, wrong `movie`/`tv` type, a show-level ID representing multiple seasons, and multiple provider records referring to one show.

## Q. SEARCH COMPARISON

One bounded request per term was made against each provider with a five-item page limit.

| Term | VSMov count / ms | KKPhim count / ms | Observation |
| --- | ---: | ---: | --- |
| `avengers` | 5 / 439 ms | 5 / 173 ms | Both returned relevant Avengers results; ordering differed |
| `người` | 5 / 301 ms | 5 / 104 ms | Both returned Vietnamese results; ordering differed |
| `nguoi` | 5 / 253 ms | 5 / 87 ms | Both accepted unaccented Vietnamese input |
| `One Piece` | 5 / 393 ms | 5 / 92 ms | VSMov favored Đảo Hải Tặc; KKPhim returned several One Piece records |
| `Spider-Man` | 5 / 233 ms | 5 / 91 ms | Both returned Spider-Man results; ordering differed |

KKPhim documentation explicitly states matching against Vietnamese and original names. Search result identity and relevance are not interchangeable across providers, so existing search-result slugs cannot be assumed to resolve unchanged after migration.

## R. TAXONOMY MAPPING

Live taxonomy counts and exact slug intersections:

| Taxonomy | VSMov | KKPhim | Exact slug intersection | Migration implication |
| --- | ---: | ---: | ---: | --- |
| Genres | 45 | 26 | 12 | Explicit mapping/alias table required |
| Countries | 187 | 36 | 32 | KKPhim is a much smaller taxonomy; filter options will not be one-to-one |
| Years | 120 | 116 | 112 | Year route is comparatively compatible, but VSMov exposed outlier years such as 2050 |

Examples:

| Current PHEVO/VSMov concept | KKPhim live mapping |
| --- | --- |
| `phim-le` | `phim-le` |
| `phim-bo` | `phim-bo` |
| `hoat-hinh` genre route | `hoat-hinh` list type; returned item type `hoathinh` |
| `tvshows` | `tv-shows` endpoint; returned item type `tvshows` |
| `hanh-dong` | `hanh-dong` |
| `han-quoc` | `han-quoc` |
| `2024` | `2024` |
| VSMov `hoathinh` list slug | VSMov live returned 404 in this audit; current Web homepage uses genre `hoat-hinh` |

The discovery resolver currently supports only the combinations represented by the existing VSMov contract and rejects at least year + type. KKPhim documents category, country, year, sort, and language filters, but combined-filter parity must be established in adapter tests before changing the resolver.

## S. PAGINATION COMPARISON

| Provider | Page size observed | Total items | Total pages | Notes |
| --- | ---: | ---: | ---: | --- |
| VSMov latest | 24 | 11,301-byte page response; list pagination fields present | Explicit `totalPages` | Some type lists returned 20 items per page |
| VSMov phim lẻ | 20 | 37,164 | 1,859 | Current normalized Web contract already uses `totalPages` |
| KKPhim v1 latest | 24 | 29,663 | 1,236 | `data.params.pagination`; docs example also uses `pageRanges` in one response example |
| KKPhim v1 phim lẻ | 24 | 16,936 | 706 | `totalPages` live-observed |

Pagination can remain behind the current `VSMovPagination`-shaped domain contract, but the KKPhim adapter must normalize `totalPages`/`pageRanges` and page-size differences. Never treat a range list as a total-page count without explicit normalization.

## T. ERROR / RELIABILITY FINDINGS

Bounded probes produced:

| Case | VSMov | KKPhim |
| --- | --- | --- |
| Nonexistent detail | HTTP 404 HTML nginx page | HTTP 404 JSON `{status:false,msg:"hmmm!"}` |
| Invalid/malformed detail slug | HTTP 404 HTML nginx page | HTTP 404 JSON |
| Invalid page `0` | HTTP 200 with a normal page response | HTTP 200 with a normal page response |
| Invalid genre | HTTP 200 with empty `items` and zero pagination | HTTP 404 JSON |
| Empty search | HTTP 200 HTML application page in this probe | HTTP 200 JSON with a result page despite empty keyword |

The providers differ materially in error semantics and content types. The future adapter must preserve the current application distinction between empty results and provider failure; it must not blindly map every non-success response to an empty list.

## U. LATENCY OBSERVATIONS

These are informational single-run/bounded observations, not a benchmark or SLA.

| Request family | VSMov observation | KKPhim observation |
| --- | --- | --- |
| List pages | Sample medians by family approximately 232–478 ms | Approximately 128–440 ms; latest had one slower 615 ms sample |
| Search | 233–439 ms for the five terms | 87–173 ms for the five terms |
| Detail | Not independently sampled across the whole match set; primary source was used for matching | 33 detail requests, median 124 ms, range 97–378 ms |

The values are network-path observations from one audit run and must not drive caching or availability decisions alone.

## V. CURRENT PHIMAPI FALLBACK AUDIT

The current fallback is in `lib/api/vsmov.ts`, not a general second provider abstraction.

- Primary request: `https://vsmov.com/api/phim/{slug}`.
- Fallback endpoint: `https://phimapi.com/phim/{candidate}`.
- Activation: VSMov returns no movie, or its first server’s first episode number is greater than 20.
- Candidate list: requested slug plus one explicit alias for `one-piece`/`dao-hai-tac`.
- Acceptance: fallback must return a movie and a non-empty episode list, then normalize successfully.
- Reliability: the same bounded request helper applies timeout and at most two attempts to each logical HTTP request.
- Infinite recursion: impossible in current code because fallback iterates a finite candidate array and does not call `getMovieDetail` recursively.

Worst-case current Web detail bound:

- normal VSMov detail: 2 HTTP attempts;
- detail with one fallback slug: 2 primary + 2 fallback = 4 HTTP attempts;
- detail with one alias candidate: 2 primary + 2 first fallback + 2 alias fallback = 6 HTTP attempts.

This fallback is reusable as a compatibility safety net during a future KKPhim migration, but its naming and validation should be clarified before it becomes a multi-provider adapter. It should not be removed until catalog and playback parity is demonstrated.

## W. MIGRATION BLAST RADIUS

| Current file/module | Provider coupling | Expected migration action |
| --- | --- | --- |
| `lib/api/vsmov.ts` | High | Adapt behind a future provider/repository boundary; preserve public domain contracts initially |
| `lib/api/normalizers.ts` | High | Add KKPhim mapper; do not make UI provider-aware |
| `types/movie.ts` | Medium/High | Keep normalized models; isolate raw provider types or split provider DTO types later |
| `lib/api/discovery-resolver.ts` | Medium | Freeze route/query contract; add explicit KKPhim capability mapping and combination tests |
| `app/page.tsx` and list/category/year pages | Medium | Replace imports only after adapter contract is frozen |
| `app/kham-pha/page.tsx` | High | Verify supported filter combinations before migration |
| `app/tim-kiem/page.tsx` and suggestions route | Medium | Preserve keyword/page/response contracts; test relevance and empty-query behavior |
| `app/phim/[slug]/page.tsx` | High | Preserve slug lookup, related strategy, metadata, and normalized detail |
| `app/xem-phim/[slug]/page.tsx` | Critical | Preserve `ep`, `server`, episode identity, and source priority |
| `components/player/VideoPlayer.tsx` | Playback-critical | Keep provider-neutral normalized source props; no raw DTO leakage |
| `lib/persistence/*` | Identity-critical | Preserve `movieSlug + episodeSlug` and legacy storage keys during transition |
| `lib/sync/*` | Identity-critical | Do not change merge keys or sync semantics in adapter phase |
| `next.config.ts` | Medium | Audit KKPhim image/CDN hosts only after runtime source is selected |
| `android-tv/app/.../data/remote/vsmov` | High/shared conceptual coupling | Keep Android VSMov implementation untouched in WEB-K1; coordinate only in a separately scoped TV phase |
| `lib/auth`, Supabase, Auth, Sync | Low provider coupling | Keep unchanged |

## X. PROPOSED TARGET ARCHITECTURE

Recommended future boundary:

```text
UI / route
    ↓
MovieRepository
    ↓
MovieProvider interface
    ↓
KKPhim adapter (primary)
VSMov adapter (rollback/fallback)
    ↓
normalized Movie / MovieDetail / Episode / Server / PlaybackSource
```

The provider interface should expose catalog, search, taxonomy, detail, and bounded playback-source capabilities. It should return normalized pagination and domain errors, not raw response envelopes. `WebPlaybackSource` should carry only normalized source identity and URLs needed by the player. UI and VideoPlayer should never read `server_data`, `link_embed`, or `link_m3u8` directly.

## Y. HLS-ONLY VS HLS-FIRST RECOMMENDATION

Recommendation: **HLS-first hybrid for the migration period**.

Reasoning:

1. In this bounded matched sample, every sampled KKPhim episode had both HLS and embed fields.
2. Five bounded manifest checks showed valid HLS playlists, HTTPS, and permissive manifest CORS.
3. The current PHEVO Web player already has direct HLS plus embed fallback behavior.
4. The catalog overlap sample is only 33 conservative matches out of 212 VSMov records, so an HLS-only replacement would create unacceptable coverage risk without a larger cross-catalog study.
5. Subtitle tracks were not proven, and manifest/segment behavior was not exhaustively tested.

Future policy should therefore be:

```text
KKPhim HLS exists and passes source validation
    → native browser HLS or HLS.js + Plyr
KKPhim HLS missing/unusable and trusted embed exists
    → existing embed fallback during migration
Neither usable
    → explicit unavailable state
```

Do not interpret this recommendation as permission to implement it in WEB-K1.

## Z. RISK REGISTER

| Severity | Risk | Evidence / mitigation |
| --- | --- | --- |
| P0 | Provider migration could break playback identity and user progress | Current storage/sync identity is `movieSlug + episodeSlug`; freeze compatibility mapping before migration |
| P1 | Bounded sample overlap is low and category/time slices are asymmetric | Run a larger cross-catalog reconciliation before full cutover; use dual-read/canary and rollback |
| P1 | KKPhim slug differs from VSMov for legitimate matches | Examples include `hai-trai-tim-2026` → `hai-trai-tim`, `nhan-ngu` → `nhan-ngu-2026`; do not assume slug parity |
| P1 | VSMov and KKPhim taxonomy sets differ materially | Genres 45 vs 26 and countries 187 vs 36; create explicit mapping and safe unknown behavior |
| P1 | HLS field presence does not prove playback for every title/segment/device | Add browser HLS.js and Android Media3 bounded runtime probes in later phases |
| P1 | Subtitle capability is unproven | No subtitle rendition observed; do not advertise selectable subtitles |
| P2 | Pagination envelope and field names differ | Normalize `totalPages`/`pageRanges`, item count, and page size behind adapter |
| P2 | Error/content-type behavior differs | VSMov sometimes returns HTML for errors/empty search; keep typed response validation |
| P2 | TMDB identity has TV season/type edge cases | Persist `id + type`, retain season context, validate missing/wrong IDs |
| P3 | Provider limits/reliability are undocumented | Official docs do not specify a rate limit; treat as `NOT DOCUMENTED`, do not load test |

## AA. FILES CHANGED

Created exactly one allowed artifact:

- `docs/WEB_K1_PROVIDER_MIGRATION_AUDIT.md`

No production source files, tests, configuration, Android files, or provider clients were changed.

## AB. QUALITY GATES

The existing package scripts were inspected before execution. The configured commands are:

```text
npm run typecheck   → tsc --noEmit
npm run lint        → eslint .
npm run test:run    → vitest run
npm run build       → next build
```

Results from this audit run:

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS (`tsc --noEmit`) |
| `npm run lint` | PASS (`eslint .`) |
| `npm run test:run` | PASS — 8 files, 51 tests |
| `npm run build` | PASS — Next.js 15.5.23 production build |
| `npm run test:e2e` | Not run; no runtime/UI changes were made and the K1 gate was read-only API/source audit |
| `git diff --check` | PASS for tracked diff; the new untracked document was separately checked for trailing whitespace |

No E2E, live playback, or Android build was added to this read-only audit.

## AC. GIT STATUS

Final status: only the new untracked audit document is present. `tsconfig.tsbuildinfo` was temporarily touched by `tsc` and restored byte-for-byte to its baseline hash. Expected production-source diff: none. Expected new audit artifact: this document.

## AD. WEB-K1 VERDICT

**PASS WITH KNOWN LIMITATIONS**

The required source audit, official documentation review, bounded live API probes, representative sample, conservative overlap measurement, HLS manifest inspection, taxonomy/search/error comparison, fallback audit, blast-radius analysis, target architecture, and rollback recommendation were completed. Full-catalog coverage, browser end-to-end playback, segment-by-segment CORS, and Android device playback remain future validation work.

## AE. PROVIDER DECISION

**MIGRATE_WITH_FALLBACK**

This is a staged recommendation only. KKPhim is technically compatible enough to justify a future adapter/canary, but the measured bounded overlap and unproven full-catalog playback make an all-at-once replacement unsafe. VSMov must remain available as rollback/fallback until broader coverage and runtime tests pass.

## AF. WEB-K2 RECOMMENDED SCOPE

Proposed **WEB-K2 — KKPhim Provider Adapter & Catalog Migration** scope:

1. Freeze normalized `Movie`, `MovieDetail`, `Episode`, `Server`, `Pagination`, and `WebPlaybackSource` contracts.
2. Add a small provider boundary with VSMov and KKPhim adapters; do not expose raw DTOs to pages or player.
3. Implement KKPhim DTOs/mappers for v1 list, detail, search, taxonomy, image, and episode/server envelopes.
4. Add explicit slug, type, country, genre, year, pagination, and TMDB identity mappings.
5. Preserve `/phim/[slug]`, `/xem-phim/[slug]`, `ep`, `server`, local persistence keys, and progress identity.
6. Add deterministic contract tests for response envelopes, missing fields, pagination, alias/slug resolution, server episode mismatch, and error classification.
7. Add bounded browser HLS.js/Plyr compatibility tests and a separate Android Media3 source test; do not use one platform as proof for the other.
8. Run a dual-read/canary comparison against VSMov for catalog, detail, episode, server, image, and playback-source parity.
9. Keep VSMov as rollback provider and retain the existing PhimAPI detail fallback until acceptance criteria are met.
10. Only after the canary is stable should later work switch default provider behavior. WEB-K1 did not start WEB-K2.

Rollback strategy: retain the current VSMov path behind the provider boundary, gate KKPhim by environment/feature flag in a later phase, and allow immediate return to VSMov without changing route or persistence identity.
