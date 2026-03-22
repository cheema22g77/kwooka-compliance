-- ============================================================================
-- Migration 005: API Keys — external API authentication
-- Keys are SHA-256 hashed; raw key is never stored
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- Fast lookup by hash (used on every API request)
CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON public.api_keys (key_hash) WHERE revoked_at IS NULL;

-- List keys by org
CREATE INDEX IF NOT EXISTS idx_api_keys_org
  ON public.api_keys (org_id, created_at DESC);

-- RLS policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their keys"
  ON public.api_keys FOR SELECT
  USING (org_id IN (
    SELECT organisation_id FROM public.org_members WHERE user_id = auth.uid()
  ));
