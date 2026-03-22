-- ============================================================================
-- MIGRATION 003: V2 Hexagonal Architecture Tables
--
-- New tables:
--   organisations, org_members, agent_runs, event_log, dead_letter_queue,
--   prompt_registry, document_versions, audit_trail
--
-- Altered tables:
--   compliance_analyses  — add org_id
--   findings             — add org_id
--   notifications        — add org_id
--
-- RLS: all queries scoped to the user's org via org_members lookup
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. ENUMS used by new tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE subscription_tier  AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE governance_role    AS ENUM ('owner', 'admin', 'compliance_officer', 'manager', 'viewer');
CREATE TYPE assessment_status  AS ENUM ('pending', 'analysing', 'completed', 'failed');
CREATE TYPE agent_model        AS ENUM ('sonnet', 'haiku');

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ORGANISATIONS — multi-tenant container
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.organisations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  abn             TEXT,                           -- 11-digit ABN, nullable
  sectors         TEXT[] NOT NULL DEFAULT '{}',    -- e.g. {'ndis','transport'}
  tier            subscription_tier NOT NULL DEFAULT 'starter',
  indigenous_owned BOOLEAN NOT NULL DEFAULT FALSE,
  supply_nation_number TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ORG_MEMBERS — maps users to organisations with a role
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.org_members (
  id       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id   UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     governance_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_org_id  ON public.org_members(org_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: check if the current auth user belongs to a given org
-- Used by every RLS policy below
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id  = check_org_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: get all org_ids the current user belongs to
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.org_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. AGENT_RUNS — BaseAgent audit trail
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.agent_runs (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_run_id      TEXT NOT NULL UNIQUE,           -- e.g. run_1711234567_abc123
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  agent_name        TEXT NOT NULL,                   -- e.g. 'compliance-analyser'
  model             agent_model NOT NULL DEFAULT 'sonnet',
  success           BOOLEAN NOT NULL,
  error             TEXT,
  tokens_used       INTEGER NOT NULL DEFAULT 0,
  duration_ms       INTEGER NOT NULL DEFAULT 0,
  guardrails_passed BOOLEAN NOT NULL DEFAULT TRUE,
  reflection_score  REAL,                            -- 0.0–1.0, nullable
  input_summary     TEXT,                            -- truncated input for debugging
  raw_output        TEXT,                            -- full LLM output
  correlation_id    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_org_id     ON public.agent_runs(org_id);
CREATE INDEX idx_agent_runs_agent_name ON public.agent_runs(agent_name);
CREATE INDEX idx_agent_runs_created_at ON public.agent_runs(created_at DESC);
CREATE INDEX idx_agent_runs_success    ON public.agent_runs(success) WHERE NOT success;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. EVENT_LOG — EventBus persistence
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.event_log (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id        TEXT NOT NULL UNIQUE,              -- e.g. evt_1711234567_1
  event_type      TEXT NOT NULL,                     -- e.g. 'AssessmentCompleted'
  org_id          UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  correlation_id  TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() -- when persisted
);

CREATE INDEX idx_event_log_org_id      ON public.event_log(org_id);
CREATE INDEX idx_event_log_event_type  ON public.event_log(event_type);
CREATE INDEX idx_event_log_occurred_at ON public.event_log(occurred_at DESC);
CREATE INDEX idx_event_log_correlation ON public.event_log(correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. DEAD_LETTER_QUEUE — failed event handler invocations
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.dead_letter_queue (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id      TEXT NOT NULL,                       -- references event_log.event_id
  event_type    TEXT NOT NULL,
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  payload       JSONB NOT NULL DEFAULT '{}',
  error         TEXT NOT NULL,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  max_retries   INTEGER NOT NULL DEFAULT 3,
  failed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,                         -- set when successfully retried
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dlq_org_id      ON public.dead_letter_queue(org_id);
CREATE INDEX idx_dlq_unresolved  ON public.dead_letter_queue(resolved_at)
  WHERE resolved_at IS NULL;
CREATE INDEX idx_dlq_event_type  ON public.dead_letter_queue(event_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. PROMPT_REGISTRY — versioned prompts for agents
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.prompt_registry (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_name   TEXT NOT NULL,                        -- e.g. 'compliance-analyser'
  version      INTEGER NOT NULL DEFAULT 1,
  prompt_text  TEXT NOT NULL,
  model        agent_model NOT NULL DEFAULT 'sonnet',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_name, version)
);

CREATE INDEX idx_prompt_registry_agent  ON public.prompt_registry(agent_name);
CREATE INDEX idx_prompt_registry_active ON public.prompt_registry(agent_name, is_active)
  WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. DOCUMENT_VERSIONS — immutable version history
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.document_versions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id   UUID NOT NULL,                       -- logical document id
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  content       TEXT NOT NULL,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, version)
);

CREATE INDEX idx_doc_versions_document ON public.document_versions(document_id);
CREATE INDEX idx_doc_versions_org_id   ON public.document_versions(org_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. AUDIT_TRAIL — cross-entity change log
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.audit_trail (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type   TEXT NOT NULL,                       -- e.g. 'finding', 'assessment'
  entity_id     TEXT NOT NULL,                       -- the entity's id
  action        TEXT NOT NULL,                       -- e.g. 'created', 'status_changed'
  changes       JSONB NOT NULL DEFAULT '{}',         -- { field: { from, to } }
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_trail_org_id      ON public.audit_trail(org_id);
CREATE INDEX idx_audit_trail_entity      ON public.audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_created_at  ON public.audit_trail(created_at DESC);

-- ============================================================================
-- ALTER EXISTING TABLES — add org_id for multi-tenancy
-- ============================================================================

-- compliance_analyses
ALTER TABLE public.compliance_analyses
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX idx_compliance_analyses_org_id ON public.compliance_analyses(org_id);

-- findings
ALTER TABLE public.findings
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX idx_findings_org_id ON public.findings(org_id);

-- notifications
ALTER TABLE public.notifications
  ADD COLUMN org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX idx_notifications_org_id ON public.notifications(org_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- ── New tables ──
ALTER TABLE public.organisations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_registry    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail        ENABLE ROW LEVEL SECURITY;

-- ── organisations ──
CREATE POLICY "Users can view their own orgs"
  ON public.organisations FOR SELECT
  USING (public.user_belongs_to_org(id));

CREATE POLICY "Service role can manage orgs"
  ON public.organisations FOR ALL
  USING (auth.role() = 'service_role');

-- ── org_members ──
CREATE POLICY "Users can view members of their orgs"
  ON public.org_members FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can manage members"
  ON public.org_members FOR ALL
  USING (auth.role() = 'service_role');

-- ── agent_runs ──
CREATE POLICY "Users can view agent runs for their orgs"
  ON public.agent_runs FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can insert agent runs"
  ON public.agent_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── event_log ──
CREATE POLICY "Users can view events for their orgs"
  ON public.event_log FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can insert events"
  ON public.event_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── dead_letter_queue ──
CREATE POLICY "Users can view DLQ for their orgs"
  ON public.dead_letter_queue FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can manage DLQ"
  ON public.dead_letter_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ── prompt_registry (read-only for all authenticated, write for service) ──
CREATE POLICY "Authenticated users can view prompts"
  ON public.prompt_registry FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Service role can manage prompts"
  ON public.prompt_registry FOR ALL
  USING (auth.role() = 'service_role');

-- ── document_versions ──
CREATE POLICY "Users can view versions for their orgs"
  ON public.document_versions FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can insert versions"
  ON public.document_versions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── audit_trail ──
CREATE POLICY "Users can view audit trail for their orgs"
  ON public.audit_trail FOR SELECT
  USING (public.user_belongs_to_org(org_id));

CREATE POLICY "Service role can insert audit trail"
  ON public.audit_trail FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- UPDATE RLS ON EXISTING TABLES — add org-scoped policies
--
-- Existing user_id-based policies remain (backward compat for pre-org data).
-- New org_id policies allow org members to see each other's data.
-- ============================================================================

-- compliance_analyses: org members can view all org analyses
CREATE POLICY "Org members can view org analyses"
  ON public.compliance_analyses FOR SELECT
  USING (
    org_id IS NOT NULL AND public.user_belongs_to_org(org_id)
  );

CREATE POLICY "Service role can manage analyses"
  ON public.compliance_analyses FOR ALL
  USING (auth.role() = 'service_role');

-- findings: org members can view and update org findings
CREATE POLICY "Org members can view org findings"
  ON public.findings FOR SELECT
  USING (
    org_id IS NOT NULL AND public.user_belongs_to_org(org_id)
  );

CREATE POLICY "Org members can update org findings"
  ON public.findings FOR UPDATE
  USING (
    org_id IS NOT NULL AND public.user_belongs_to_org(org_id)
  );

-- notifications: org members can view org notifications
CREATE POLICY "Org members can view org notifications"
  ON public.notifications FOR SELECT
  USING (
    org_id IS NOT NULL AND public.user_belongs_to_org(org_id)
  );

-- ============================================================================
-- BACKFILL HELPER — Run after migration to assign org_id to existing rows
-- (call manually: SELECT backfill_org_id_for_user('user-uuid', 'org-uuid');)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backfill_org_id_for_user(
  p_user_id UUID,
  p_org_id  UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.compliance_analyses SET org_id = p_org_id WHERE user_id = p_user_id AND org_id IS NULL;
  UPDATE public.findings            SET org_id = p_org_id WHERE user_id = p_user_id AND org_id IS NULL;
  UPDATE public.notifications       SET org_id = p_org_id WHERE user_id = p_user_id AND org_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
