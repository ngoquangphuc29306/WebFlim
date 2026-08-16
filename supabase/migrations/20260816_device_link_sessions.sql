-- TV-SYNC2B: short-lived, single-use TV device-link sessions.
-- Privileged reads/writes are performed only by the device-link Edge Function.

CREATE TABLE IF NOT EXISTS public.device_link_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'consumed')),
  approved_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.device_link_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.device_link_sessions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_device_link_sessions_expiry
  ON public.device_link_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_device_link_sessions_status_expiry
  ON public.device_link_sessions(status, expires_at);

-- No user-facing RLS policy is intentional: the Edge Function is the only access boundary.
