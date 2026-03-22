// ============================================================================
// RING 5.5: AGENT MEMORY — Stores and recalls past agent runs
// Pattern: Gold's agent memory — top-K recall by reflection score
// Stores successful runs, recalls best past runs for same agent+org
// ============================================================================
import type { OrgId } from "@/core/value-objects";

// === Types ===

export interface AgentMemoryEntry {
  readonly agentRunId: string;
  readonly agentName: string;
  readonly orgId: string;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly reflectionScore: number;
  readonly createdAt: string;
}

export interface StoreParams {
  agentRunId: string;
  agentName: string;
  orgId: OrgId;
  inputSummary: string;
  outputSummary: string;
  reflectionScore: number;
}

export interface RecallParams {
  agentName: string;
  orgId: OrgId;
  limit?: number;
}

// === Port Interface ===

export interface IAgentMemory {
  /** Store a successful agent run for future recall */
  store(params: StoreParams): Promise<void>;

  /** Recall top-K highest-scoring past runs for the same agent+org */
  recall(params: RecallParams): Promise<AgentMemoryEntry[]>;
}

// === Supabase Adapter ===

export class SupabaseAgentMemory implements IAgentMemory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getClient: () => any;

  constructor(
    getClient: () => any,
  ) {
    this.getClient = getClient;
  }

  async store(params: StoreParams): Promise<void> {
    const supabase = this.getClient();

    const { error } = await supabase
      .from("agent_runs")
      .update({
        input_summary: params.inputSummary,
        output_summary: params.outputSummary,
      })
      .eq("agent_run_id", params.agentRunId);

    // If the run hasn't been persisted yet by the event system,
    // insert a minimal record with memory fields
    if (error) {
      await supabase.from("agent_runs").upsert({
        agent_run_id: params.agentRunId,
        agent_name: params.agentName,
        org_id: params.orgId,
        success: true,
        tokens_used: 0,
        duration_ms: 0,
        guardrails_passed: true,
        reflection_score: params.reflectionScore,
        input_summary: params.inputSummary,
        output_summary: params.outputSummary,
      }, { onConflict: "agent_run_id" });
    }
  }

  async recall(params: RecallParams): Promise<AgentMemoryEntry[]> {
    const supabase = this.getClient();
    const limit = params.limit ?? 3;

    const { data, error } = await supabase
      .from("agent_runs")
      .select("agent_run_id, agent_name, org_id, input_summary, output_summary, reflection_score, created_at")
      .eq("agent_name", params.agentName)
      .eq("org_id", params.orgId)
      .eq("success", true)
      .not("reflection_score", "is", null)
      .not("input_summary", "is", null)
      .not("output_summary", "is", null)
      .order("reflection_score", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      agentRunId: row.agent_run_id,
      agentName: row.agent_name,
      orgId: row.org_id,
      inputSummary: row.input_summary,
      outputSummary: row.output_summary,
      reflectionScore: row.reflection_score,
      createdAt: row.created_at,
    }));
  }
}

// === In-Memory Adapter (for testing / dev) ===

export class InMemoryAgentMemory implements IAgentMemory {
  private entries: AgentMemoryEntry[] = [];

  async store(params: StoreParams): Promise<void> {
    // Deduplicate by agentRunId
    const existing = this.entries.findIndex(
      (e) => e.agentRunId === params.agentRunId,
    );
    const entry: AgentMemoryEntry = {
      agentRunId: params.agentRunId,
      agentName: params.agentName,
      orgId: params.orgId,
      inputSummary: params.inputSummary,
      outputSummary: params.outputSummary,
      reflectionScore: params.reflectionScore,
      createdAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      this.entries[existing] = entry;
    } else {
      this.entries.push(entry);
    }
  }

  async recall(params: RecallParams): Promise<AgentMemoryEntry[]> {
    const limit = params.limit ?? 3;

    return this.entries
      .filter(
        (e) =>
          e.agentName === params.agentName &&
          e.orgId === params.orgId,
      )
      .sort((a, b) => b.reflectionScore - a.reflectionScore)
      .slice(0, limit);
  }

  /** Get all entries (for testing) */
  getAll(): readonly AgentMemoryEntry[] {
    return [...this.entries];
  }

  /** Clear all entries (for testing) */
  clear(): void {
    this.entries = [];
  }
}

// === Helper: Format recalled memories for LLM context injection ===

export function formatMemoryContext(memories: AgentMemoryEntry[]): string {
  if (memories.length === 0) return "";

  const lines = memories.map(
    (m, i) =>
      `--- Past Run ${i + 1} (score: ${m.reflectionScore.toFixed(2)}) ---\n` +
      `Input: ${m.inputSummary}\n` +
      `Output: ${m.outputSummary}`,
  );

  return (
    "CONTEXT FROM PAST SUCCESSFUL RUNS (use as reference for quality and style):\n\n" +
    lines.join("\n\n") +
    "\n\n---\n"
  );
}
