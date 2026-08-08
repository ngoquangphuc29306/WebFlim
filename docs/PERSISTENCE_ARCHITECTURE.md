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

When Phase 13 introduces cloud synchronization (e.g., Supabase), the repository boundary can be extended without rewriting any UI components:

```text
                  UI / Component
                        │
                        ▼
                  WatchlistService
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
LocalWatchlistRepository      SupabaseWatchlistRepository
   (localStorage)                   (Cloud DB Sync)
```

1. **Zero UI Changes**: Components depend on `useWatchlist()` or `watchlistRepository` interface.
2. **Local-First Sync**: Reads and writes complete instantly locally, and background tasks synchronize state with the remote database.
