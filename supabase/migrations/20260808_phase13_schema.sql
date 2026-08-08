-- VSMov Phase 13 Supabase Schema & RLS Policies

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 2. WATCHLIST
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  poster_url TEXT,
  thumb_url TEXT,
  year TEXT,
  movie_type TEXT,
  episode_current TEXT,
  quality TEXT,
  categories_json TEXT,
  countries_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT watchlist_user_movie_unique UNIQUE (user_id, movie_slug)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON public.watchlist
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);

-- 3. WATCH HISTORY
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  poster_url TEXT,
  episode_slug TEXT NOT NULL,
  episode_name TEXT,
  server_index INT,
  server_name TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT watch_history_user_movie_unique UNIQUE (user_id, movie_slug)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watch history" ON public.watch_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch history" ON public.watch_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch history" ON public.watch_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch history" ON public.watch_history
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_updated ON public.watch_history(user_id, client_updated_at DESC);

-- 4. PLAYBACK PROGRESS
CREATE TABLE IF NOT EXISTS public.playback_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  poster_url TEXT,
  episode_slug TEXT NOT NULL,
  episode_name TEXT,
  server_index INT,
  server_name TEXT,
  current_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT playback_progress_user_ep_unique UNIQUE (user_id, movie_slug, episode_slug)
);

ALTER TABLE public.playback_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playback progress" ON public.playback_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playback progress" ON public.playback_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playback progress" ON public.playback_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playback progress" ON public.playback_progress
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_playback_progress_user_updated ON public.playback_progress(user_id, client_updated_at DESC);

-- 5. PLAYER PREFERENCES
CREATE TABLE IF NOT EXISTS public.player_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  volume DOUBLE PRECISION DEFAULT 1.0,
  muted BOOLEAN DEFAULT FALSE,
  playback_rate DOUBLE PRECISION DEFAULT 1.0,
  autoplay_next_episode BOOLEAN DEFAULT TRUE,
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.player_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own player preferences" ON public.player_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own player preferences" ON public.player_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own player preferences" ON public.player_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own player preferences" ON public.player_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- 6. AUTOMATIC SERVER_UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_watchlist_server_updated_at ON public.watchlist;
CREATE TRIGGER set_watchlist_server_updated_at BEFORE UPDATE ON public.watchlist FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

DROP TRIGGER IF EXISTS set_watch_history_server_updated_at ON public.watch_history;
CREATE TRIGGER set_watch_history_server_updated_at BEFORE UPDATE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

DROP TRIGGER IF EXISTS set_playback_progress_server_updated_at ON public.playback_progress;
CREATE TRIGGER set_playback_progress_server_updated_at BEFORE UPDATE ON public.playback_progress FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

DROP TRIGGER IF EXISTS set_player_preferences_server_updated_at ON public.player_preferences;
CREATE TRIGGER set_player_preferences_server_updated_at BEFORE UPDATE ON public.player_preferences FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- PROFILES UPDATED AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

