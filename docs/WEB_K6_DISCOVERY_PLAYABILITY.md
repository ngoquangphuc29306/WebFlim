# WEB-K6 — TMDB Discovery, Recommendations & Playability Resolution

## Authority boundary

TMDB is a server-only discovery and presentation source. The active PHEVO
movie provider remains the sole authority for availability, public slugs,
episodes, servers, HLS, embeds, and playback. A TMDB ID is never routed
directly and never creates a playback URL.

```text
TMDB lightweight candidate
  -> bounded provider availability index
  -> exact externalIdentity verification
  -> provider public slug
  -> /phim/{provider-public-slug}
```

Only `EXACT_MATCH` candidates become cards. `UNAVAILABLE`, `AMBIGUOUS`,
`IDENTITY_REJECTED`, and `PROVIDER_ERROR` are skipped without exposing a Play
action or a TMDB-derived route.

## TMDB discovery contract

All calls use the official server-side TMDB client and `vi-VN` by default.
Discovery maps raw DTOs to `TmdbDiscoveryCandidate`; raw TMDB list DTOs do not
reach pages or components.

| Capability | Endpoint | Revalidation |
| --- | --- | ---: |
| Trending | `/trending/{movie|tv}/week` | 15 minutes |
| Popular | `/{movie|tv}/popular` | 1 hour |
| Top rated | `/{movie|tv}/top_rated` | 6 hours |
| Recommendations | `/{movie|tv}/{id}/recommendations` | 6 hours |
| Similar | `/{movie|tv}/{id}/similar` | 6 hours |

Discovery requests do not append credits, videos, or season detail. Candidate
fields are restricted to identity, localized title, optional original title and
overview, poster/backdrop paths, year, vote data, genre IDs, and popularity.

## Playability resolver

The resolver uses a 5-minute `unstable_cache` availability index constructed
from four active-provider list calls in parallel:

1. latest
2. `phim-le`
3. `phim-bo`
4. genre `hoat-hinh`

It deduplicates entries by their existing public slug. There is no persistent
index, no global mutable map, no full-catalog crawl, and no provider detail
request per TMDB candidate.

Primary identity is exactly:

```text
candidate.tmdbId + candidate.mediaType
==
provider.externalIdentity.tmdbId + provider.externalIdentity.tmdbType
```

The resolver also rejects materially contradictory year/title context. No fuzzy
title match establishes playability. K6 deliberately does not enable a provider
search locator: this keeps each rail bounded and avoids a per-card provider
search/detail storm.

### TV multi-season policy

One TMDB TV ID may correspond to several provider season records. For a TV
candidate, select the provider record with the lowest positive `tmdbSeason`.
Ties resolve by public slug. This is deterministic and prevents multiple
season-card duplicates in one generic TV rail. A movie with more than one
distinct matched public slug is `AMBIGUOUS` and is excluded.

## Request budget and cache behavior

| Operation | TMDB calls | Active-provider calls on availability cache miss | Per-candidate detail/search calls | Candidate cap | Final-card cap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Trending / Popular / Top Rated rail | 1 | 4 parallel lists | 0 | 20 | 12 |
| Recommendations / Similar | 1 | 4 parallel lists | 0 | 20 | 12 |
| Detail related fallback | 0 additional after recommendations | 1 genre list, plus latest only when needed | 0 | n/a | 12 |

The provider index is shared per active provider for 300 seconds. TMDB fetches
retain the K4 timeout/retry policy (10 seconds, maximum two attempts). Provider
calls retain their existing bounded retry policy. The table counts logical calls;
each provider/TMDB HTTP client may perform its already-defined one retry for a
transient upstream failure.

## Detail recommendations and fallback

`/phim/[slug]` now asks for playable TMDB recommendations only when the current
provider detail contains a valid external TMDB identity. Resolved cards retain
the provider public slug and use TMDB poster/backdrop/title/rating only as
presentation enrichment.

If fewer than 12 exact-resolved cards are available, the existing provider
related strategy fills remaining slots:

```text
primary provider category
  -> latest provider list only when category results remain short
  -> dedupe by public slug
  -> cap at 12
```

TMDB outage, missing token, low overlap, and resolver failure all result in the
same safe provider-related fallback. The current Detail itself remains
provider-backed and playable.

## Home integration decision

`PROVIDER_RAILS_WITH_TMDB_SERVICE_DEFERRED`

K6 keeps Home rails provider-native. Live exact-identity overlap from the
bounded index is currently too low to replace Home sections without presenting
thin rails. The discovery services are available for later use, but no Home
section is added until coverage can be improved safely by an explicit product
decision and a larger bounded availability source.

## Live coverage study

Measured on 2026-08-13 with page 1 (20 candidates per TMDB collection) and the
four-list availability index above. Exact means exact TMDB ID plus media type;
no search/fuzzy result is included.

### Default VSMov mode

| Source | Candidates | Exact | Unavailable | Playable |
| --- | ---: | ---: | ---: | ---: |
| Trending movie | 20 | 1 | 19 | 1 |
| Trending TV | 20 | 0 | 20 | 0 |
| Popular movie | 20 | 1 | 19 | 1 |
| Popular TV | 20 | 0 | 20 | 0 |

The index contained 63 unique records, all with a TMDB identity. Five sampled
TV recommendation sets returned 100 candidates total; one exact provider match
was found.

### Explicit KKPhim mode

| Source | Candidates | Exact | Unavailable | Playable |
| --- | ---: | ---: | ---: | ---: |
| Trending movie | 20 | 2 | 18 | 2 |
| Trending TV | 20 | 3 | 17 | 3 |
| Popular movie | 20 | 1 | 19 | 1 |
| Popular TV | 20 | 1 | 19 | 1 |

The index contained 78 unique records (76 with a TMDB identity). Five sampled
TV recommendation sets returned 100 candidates total; none matched this bounded
index. This is a coverage limitation, not a reason to weaken identity matching.

Observed logical provider list latency was roughly 0.2–1.25 seconds per list;
TMDB list calls were roughly 0.5–0.65 seconds and recommendation calls roughly
0.2–0.4 seconds. This was a bounded informational sample, not a benchmark.

## Failure and safety policy

- Missing `TMDB_API_READ_ACCESS_TOKEN`: discovery returns no TMDB cards and
  Detail uses provider related movies.
- TMDB failure: no Home failure and no Detail failure; provider fallback remains.
- Provider index failure: candidates are skipped as `PROVIDER_ERROR`.
- No exact identity: item is unavailable and cannot be linked or played.
- Search remains provider-driven; Explore keeps provider genre/country/year
  filters; Watch remains provider-driven.
- TMDB calls remain server-only, use explicit endpoint methods, and do not
  accept user-controlled endpoint paths. No token is serialized to the client.

## K7 implications

K7 should not change the default provider based on this study. A later phase may
evaluate a deliberately larger but still bounded availability source, or an
explicit verified-search locator, only if it preserves exact TMDB-ID final
verification and upstream request budgets.
