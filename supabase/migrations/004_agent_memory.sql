-- ============================================================================
-- Migration 004: Agent Memory — add output_summary to agent_runs
-- Enables recall of high-scoring past runs for context injection
-- ============================================================================

-- Add output_summary column (input_summary already exists from 003)
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS output_summary TEXT;

-- Index for fast recall: agent_name + org_id + success + reflection_score
CREATE INDEX IF NOT EXISTS idx_agent_runs_memory_recall
  ON public.agent_runs (agent_name, org_id, success, reflection_score DESC NULLS LAST)
  WHERE success = TRUE AND reflection_score IS NOT NULL;
