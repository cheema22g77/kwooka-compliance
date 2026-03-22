-- ============================================================================
-- Migration 007: Webhook Endpoints — outbound event delivery
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org
  ON public.webhook_endpoints (org_id) WHERE active = TRUE;

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their webhooks"
  ON public.webhook_endpoints FOR SELECT
  USING (org_id IN (
    SELECT organisation_id FROM public.org_members WHERE user_id = auth.uid()
  ));
