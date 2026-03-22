// ============================================================================
// INTELLIGENCE: Types — shared across the orchestrator pipeline
// Pattern: Immigration's 14-file intelligence layer
// ============================================================================
import type { SectorId, SectorConfig } from "@/core/value-objects";
import type { LLMMessage } from "@/ports/outbound";

// === Intent Classification ===

export const INTENTS = [
  "analysis",
  "explanation",
  "recommendation",
  "general",
] as const;

export type CopilotIntent = (typeof INTENTS)[number];

// === Computed Context ===

export interface ComputedContext {
  readonly intent: CopilotIntent;
  readonly sector: SectorConfig | null;
  readonly ragContext: string | null;
  readonly userContext: string | null;
  readonly conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

// === Orchestrator Result ===

export interface OrchestratorResult {
  readonly intent: CopilotIntent;
  readonly systemPrompt: string;
  readonly messages: LLMMessage[];
  readonly context: ComputedContext;
}

// === Quality Metrics ===

export interface QualityMetrics {
  readonly orgId: string;
  readonly totalResponses: number;
  readonly guardrailPassRate: number;
  readonly avgResponseLength: number;
  readonly intentDistribution: Record<CopilotIntent, number>;
  readonly lastUpdated: string;
}
