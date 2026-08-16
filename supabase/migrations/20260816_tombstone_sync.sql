-- TV-SYNC2A: additive tombstone columns for offline-safe cross-device sync.
-- Existing rows remain active because deleted_at defaults to NULL.

ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.playback_progress
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_watchlist_user_deleted_updated
  ON public.watchlist(user_id, deleted_at, client_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_deleted_updated
  ON public.watch_history(user_id, deleted_at, client_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_playback_progress_user_deleted_updated
  ON public.playback_progress(user_id, deleted_at, client_updated_at DESC);

-- Logical identities and existing RLS policies are intentionally unchanged.
