-- ============================================================================
-- Migration 006: Portal Invites — client portal authentication
-- Clients access a read-only compliance portal via tokenised invite links
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portal_invites (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  org_name    TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- Fast lookup by token (used on every portal request)
CREATE INDEX IF NOT EXISTS idx_portal_invites_token
  ON public.portal_invites (token) WHERE revoked_at IS NULL;

-- List invites by org
CREATE INDEX IF NOT EXISTS idx_portal_invites_org
  ON public.portal_invites (org_id, created_at DESC);
