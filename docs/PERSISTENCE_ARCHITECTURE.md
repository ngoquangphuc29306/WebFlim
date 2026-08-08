# Persistence Architecture & Local-First Repository Layer

This document outlines the architecture used for local persistence in the VSMov application.

## Overview

The application follows a **Local-First Repository Pattern**, decoupling React components and UI hooks from the underlying storage technology (e.g. `localStorage`, IndexedDB, or future cloud synchronization adapters such as Supabase).

```text
       UI / Components
              │
              ▼
       Hooks / Services
              │
              ▼
     Repository Contract (Interface)
              │
              ▼
Local Repository Implementation (Class)
              │
              ▼
   Storage Engine (localStorage)
```

## Referential Snapshot Stability

All local repository implementations (`LocalWatchlistRepository`, `LocalWatchHistoryRepository`, `LocalPlaybackProgressRepository`, `LocalPlayerPreferencesRepository`) maintain a referentially stable snapshot cache:

- **`cachedRaw`**: Raw JSON string retrieved from `localStorage`.
- **`cachedParsed`**: Evaluated domain model object or array.

When `get()` or `getAll()` is invoked, the repository checks if `raw === this.cachedRaw`. If unchanged, it returns the exact same object reference (`this.cachedParsed`). This satisfies `useSyncExternalStore` requirements and prevents unnecessary re-renders or React warnings across the UI.

## Event Subscription & Multi-Tab Isolation

Subscriptions manage state synchronization across both same-tab interactions and multi-tab browser activity:

1. **Same-Tab Events**: Custom events (`vsmov_watchlist_updated`, `vsmov_history_updated`, `vsmov_progress_updated`, `vsmov_preferences_updated`) trigger immediate local subscriber callbacks.
2. **Cross-Tab Filtering**: Browser `storage` events are filtered strictly by the domain's `storageKey` (or `event.key === null` on storage clear). Changes to Watchlist in one tab will not invalidate History, Progress, or Preferences in another tab.

## Storage Domains & Keys

All storage keys remain strictly backward-compatible to guarantee zero data loss across deployments.

| Domain | Storage Key | Custom Same-Tab Event | Limits / Policy |
| :--- | :--- | :--- | :--- |
| **Watchlist** | `vsmov_watchlist_v1` | `vsmov_watchlist_updated` | Deduplicated by movie slug |
| **Watch History** | `vsmov_watch_history_v1` | `vsmov_history_updated` | Deduplicated by movie slug, max 30 items |
| **Playback Progress** | `vsmov_playback_progress_v1` | `vsmov_progress_updated` | Unique key `(movieSlug, episodeSlug)`, max 50 items |
| **Player Preferences** | `vsmov_player_preferences_v1` | `vsmov_preferences_updated` | Singleton preferences object |

## Directory Structure

```text
lib/persistence/
├── storage.ts                            # Safe JSON parsing, SSR guards, event subscriptions
├── watchlist/
│   ├── watchlist.types.ts                # WatchlistItem definition
│   ├── watchlist.repository.ts           # WatchlistRepository interface
│   ├── local-watchlist.repository.ts     # LocalWatchlistRepository class
│   ├── watchlist.service.ts              # Repository instance export
│   └── use-watchlist.ts                  # React subscription hook
├── history/
│   ├── history.types.ts
│   ├── history.repository.ts
│   ├── local-history.repository.ts
│   ├── history.service.ts
│   └── use-history.ts
├── progress/
│   ├── progress.types.ts
│   ├── progress.repository.ts
│   ├── local-progress.repository.ts
│   ├── progress.service.ts
│   └── use-progress.ts
└── player-preferences/
    ├── preferences.types.ts
    ├── preferences.repository.ts
    ├── local-preferences.repository.ts
    ├── preferences.service.ts
    └── use-preferences.ts
```

## Future Cloud Extension (Phase 13 Readiness)

When Phase 13 introduces cloud synchronization (e.g. Supabase Auth and Database), the synchronous **Local Repository contract** and asynchronous **Cloud Store contract** remain intentionally distinct:

```text
                           ┌───────────────┐
                           │      UI       │
                           └───────┬───────┘
                                   │
                                   ▼
                           Hooks / Services
                                   │
                                   ▼
                         Local Repository
                                   │
                            ┌──────┴──────┐
                            ▼             ▼
                      localStorage    Sync Engine
                                         │
                                         ▼
                                  Supabase Gateway
                                         │
                                         ▼
                                     Supabase
```

1. **Local-First Runtime**: UI components and React hooks continue to read synchronously from the Local Repository for instant, latency-free rendering.
2. **Async Cloud Sync**: A background Sync Engine orchestrates cloud synchronization with Supabase asynchronously.
3. **Guest & Auth Modes**: Guests operate purely on the Local Repository with zero network dependencies. Authenticated users benefit from background cloud synchronization without UI blocking.
