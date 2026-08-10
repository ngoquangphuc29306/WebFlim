# PHEVO Android TV Architecture

Status: TV-0 source of truth  
Product: PHEVO  
Target: Native Android TV application  
Technology direction: Kotlin, Jetpack Compose for TV, AndroidX Media3 where compatible

This document defines the implementation boundary for future TV phases. TV-0 creates no Android project, Gradle files, networking, Compose screens, player code, Supabase integration, or navigation code.

## 1. Architecture decision

PHEVO TV will be a single native Android application module initially, using a lightweight layered architecture:

```text
Compose for TV UI
        ↓
ViewModel + StateFlow
        ↓
Domain use cases / repository interfaces
        ↓
Data repositories
        ↓
VSMov remote client + local persistence + future Supabase gateway
```

The native app shares product concepts and API/domain contracts with the web application, not React components, Tailwind classes, browser storage, or page code.

### Initial package shape

```text
app/
  navigation/
  theme/

data/
  remote/
    vsmov/
  local/
  repository/

domain/
  model/
  repository/
  usecase/

ui/
  common/
  home/
  search/
  detail/
  watchlist/
  history/
  player/
  account/
```

This is a package boundary, not a requirement to create many Gradle modules. Keep the first app small and split modules only when build ownership or dependency isolation requires it.

## 2. Dependency direction

```text
ui → domain → repository interfaces → data implementations
```

Rules:

- UI does not call Retrofit/Ktor, Supabase, DataStore, Room, or raw HTTP directly.
- ViewModels expose screen state and events; they do not contain JSON parsing or persistence details.
- Domain models do not depend on Android framework classes or provider DTOs.
- Data implementations map raw provider data into domain models before returning to the UI.
- A repository interface is enough for testability; do not add factories or a provider registry in the first app.
- Keep the VSMov provider name explicit in the data layer. PHEVO is the product brand.

## 3. UI state and event flow

Use standard Android unidirectional state flow:

```text
Remote / D-pad event
        ↓
ViewModel event handler
        ↓
Use case
        ↓
Repository
        ↓
StateFlow update
        ↓
Compose for TV renders state
```

Each screen should expose one state model, preferably a sealed or data class family with explicit states such as:

- `Loading`
- `Content`
- `Empty`
- `Error`
- `Offline`

Events should be named by intent, for example `SelectMovie`, `SubmitSearch`, `SelectEpisode`, `SelectServer`, `Retry`, `Back`, and `ToggleWatchlist`. Do not pass raw DTOs or arbitrary maps through UI state.

ViewModels own screen lifetime state, selected indexes, focus restoration keys, and in-flight operation cancellation. The repository owns data retrieval and persistence. A stale result must be ignored if the ViewModel no longer represents the same route/query/user context.

ViewModels may retain logical focus restoration state such as a selected item ID, selected item index, or restoration key. Android UI focus objects must remain in the Compose UI layer: do not store `FocusRequester`, `FocusManager`, Compose focus nodes, or equivalent UI focus handles in a ViewModel. The UI maps the logical restoration state to its current focusable components.

## 4. Navigation model

The TV navigation pattern is a left rail with destinations:

- Home
- Search
- Explore
- Watchlist
- History
- Account/Settings

Future navigation should use a typed route model. Preserve the web's public identity semantics conceptually:

- movie identity: `movieSlug`
- episode identity: `episodeSlug`
- server identity: stable server position/name as available
- search state: keyword and page
- taxonomy state: genre, country, year, and supported combinations

Do not couple TV routes to Next.js URLs. A deep link strategy can be added later, but route arguments must remain serializable and bookmark-safe where practical.

Back behavior is hierarchical: close dialog/overlay, exit player controls, leave player/detail/search, then return to the previous top-level destination. Focus restoration belongs to the destination that owns the list, not to a global singleton.

## 5. Domain model mapping

The Android domain layer should model the existing normalized web contract without copying TypeScript syntax or raw provider names into UI code.

| Android domain concept | Existing web contract | Identity / rules |
|---|---|---|
| `Movie` | `MovieCardModel` | `slug` is the stable route/content identity; poster and thumbnail are optional display URLs |
| `MovieDetail` | `MovieDetailModel` | Extends movie metadata with synopsis, cast/directors, taxonomy, and episode groups |
| `Episode` | `EpisodeItemModel` | `episodeSlug` identifies an episode within a movie; name is display text |
| `Server` | `ServerGroupModel` | Preserve server order and server name; episode lists may differ per server |
| `WatchlistItem` | `MovieCardModel` / watchlist type | Keyed by movie slug; preserve movie metadata needed for local display |
| `WatchHistoryItem` | `WatchHistoryItem` | Keyed by movie slug + episode slug; retain server name/index and last-opened time |
| `PlaybackProgress` | `PlaybackProgress` | Conceptual identity remains `movieSlug + episodeSlug`; server context is additional metadata |
| `PlayerPreferences` | `PlayerPreferences` | Volume, muted, playback rate, and autoplay preference; defaults remain explicit |

Rules:

- Do not fabricate missing ratings, durations, episode links, cast, or playback state.
- Keep provider URLs out of UI state where a domain source object can express the required capability.
- Preserve episode/server ordering from the provider unless a deliberate TV presentation rule is documented.
- Progress is only exact when the active player can report exact position and duration.
- Watch history records that an episode was opened; it is not a substitute for exact playback progress.

## 6. Data and API strategy

The future data path is:

```text
Compose screen
  → ViewModel
  → domain use case
  → repository interface
  → VSMov repository
  → typed VSMov client
  → raw DTO mapper
  → domain model
```

VSMov remains the primary provider. The current web provider uses list, search, taxonomy, year, catalog, detail, episode/server, timeout, bounded retry, and a bounded PhimAPI detail fallback. Future TV networking must preserve those observable semantics unless a separate migration decision is approved.

TV-0 does not select or add Retrofit/Ktor. During TV-2, choose one typed HTTP client based on Android project constraints, testability, and cancellation support. Do not invent endpoints or query parameters; verify the VSMov documentation and real responses first.

Recommended data rules for TV-2:

- Keep raw DTOs in `data.remote.vsmov`.
- Validate response envelopes before mapping.
- Normalize image URLs and optional fields in one mapper boundary.
- Preserve cache/revalidation intent through an explicit repository policy rather than embedding caching decisions in Composables.
- Classify network timeout, network failure, HTTP failure, not found, and malformed response separately enough for screen states.
- Bound retries and fallback requests; never allow an alias/fallback loop.

## 7. Player architecture and compatibility

### Direct HLS / M3U8

When a trusted direct HLS URL is available and compatible with Android playback, the future player should use AndroidX Media3 / ExoPlayer. The player shell should provide Play/Pause, seek, volume/mute where applicable, fullscreen TV layout, episode navigation, server selection, loading, and explicit error states.

### Embed-only sources

An `embedUrl` is an HTML/player page, not automatically a Media3 media source. It must not be passed to ExoPlayer as if it were an HLS stream. If a movie has only an embed page, the native TV strategy must be evaluated separately: a supported WebView/player surface may be considered in a later phase, or the title may be unavailable natively. Do not scrape, reverse-engineer, inject scripts into, or extract protected provider URLs.

### Player identity and progress

The player receives a normalized movie/episode/server selection. Source changes must remount or replace the active Media3 item based on movie slug, episode slug, server identity, and source URL. Progress persistence must remain keyed conceptually by `movieSlug + episodeSlug`; server index/name is context, not a replacement identity. If the active source cannot expose exact position/duration, do not write fake progress.

## 8. Persistence strategy

TV-0 makes the following intentionally small decisions:

- **DataStore:** preferences, account-independent settings, and small device/app state. This includes player preferences such as volume, muted, playback rate, and autoplay preference.
- **Local repository:** watchlist, history, and playback progress should be behind interfaces from the start. Keep the first implementation small and deterministic.
- **Room:** do not add it in TV-0. Introduce Room only if offline watchlist/history/progress queries, indexes, or conflict handling genuinely exceed a simple persistence strategy.
- **Supabase:** do not implement it in TV-0. Later synchronization must preserve the existing web domains, identity, timestamps, queue semantics, guest/login transitions, and stale-operation protections conceptually.

Local data must remain useful offline where it is available. A provider outage must not be represented as an empty local account without an explicit offline/error state.

## 9. Auth and sync boundary

The future Account/Auth layer should expose user/session state to ViewModels without making UI components call Supabase directly. A future sync service should be a repository/data concern with explicit status:

`idle`, `syncing`, `synced`, `error`, and `offline`.

The following web semantics must be preserved later:

- guest data and authenticated data are distinct contexts until a deliberate merge rule applies;
- user A to user B transitions invalidate stale async work;
- queued mutations are scoped by owner identity and domain;
- watchlist, history, progress, and preferences keep their existing identity/conflict rules;
- no cloud write occurs from a stale user/session operation.

TV-0 does not decide a new merge policy and does not change the web architecture.

## 10. Screen ownership

| Package | Responsibility | Initial focus |
|---|---|---|
| `ui.home` | Hero, Continue Watching, bounded movie rows | Hero primary CTA, otherwise first card |
| `ui.search` | Search field, TV keyboard handoff, results, empty/error | Search field |
| `ui.detail` | Metadata, Play/Continue, watchlist, episodes, related content | Play/Continue |
| `ui.watchlist` | Saved movie grid/rows and empty state | First saved item or Explore action |
| `ui.history` | Recent history/progress rows | Most recent valid item |
| `ui.player` | Media3 surface shell, controls, episode/server actions | Play/Pause or active playback surface |
| `ui.account` | Login/account/settings state and sync status | Primary account action |
| `ui.common` | Focusable card/button, loading, empty, error, offline, artwork primitives | Caller-defined but deterministic |

Each screen owns its state and focus restoration. Shared components own rendering and semantics, not business decisions.

## 11. Testing strategy for implementation phases

Before release, future phases should test:

- ViewModel state transitions with fake repositories;
- D-pad focus movement, focus restoration, scroll-to-focused behavior, dialog trapping, and Back behavior;
- mapper behavior for missing/optional VSMov fields;
- timeout, retry, malformed response, and fallback bounds;
- direct HLS playback on supported emulator/device configurations;
- no-episode and embed-only limitation states;
- local persistence corruption and offline behavior;
- auth transition and stale async protection with fakes, not production accounts.

Do not make the initial test suite depend on a live provider for every state. Use a small number of live/device smoke checks after deterministic unit/integration coverage exists.

## 12. Implementation roadmap

### TV-0 — Design System + Architecture

This phase. Establish tokens, focus rules, screen contracts, layer boundaries, data identity, player compatibility, and roadmap. No Android code.

### TV-1 — Project Skeleton + Theme + Fake Data UI

Create the single Android app module, Compose for TV theme, navigation shell, focusable primitives, fake repository, and static screen states. No real API or player yet.

### TV-2 — VSMov Data Layer

Add typed remote DTOs, client, timeout/retry policy, normalization, repository, and deterministic tests. Verify endpoints and real response shapes before wiring screens.

### TV-3 — Movie Detail + Search + Discovery Integration

Connect Home, Search, Explore, Detail, Watchlist, and History data flows. Preserve slugs, taxonomy semantics, episode/server models, loading/empty/error states, and focus restoration.

### TV-4 — Media3 Player

Implement direct HLS playback with Media3 where supported, episode/server switching, bounded recovery, progress/history integration, and explicit unsupported/embed-only states. Do not reverse-engineer embed pages.

### TV-5 — Local Persistence + Supabase Sync

Implement local repositories, auth/session boundary, queue/merge semantics, offline/reconnect handling, and sync tests. Reuse web semantics conceptually; do not make TV a second incompatible data policy.

### TV-6 — Real Device QA + Release Hardening

Validate on an Android TV emulator and at least one real Android TV/Google TV device when available. Test 1080p and 4K scaling, D-pad focus, Back, resume, image loading, network loss, player errors, app lifecycle, accessibility, and release packaging.

## 13. Explicit non-goals for TV-0

- No Android project or Gradle files.
- No Compose screen source.
- No Retrofit, Ktor, Media3, Supabase, Auth, or Room implementation.
- No web route or component migration.
- No touch-first phone layout.
- No native handling claim for iframe/embed URLs.
- No Android TV release artifact.
