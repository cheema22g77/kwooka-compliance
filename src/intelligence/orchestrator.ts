// ============================================================================
// INTELLIGENCE: Orchestrator — main copilot pipeline
// classify → gather context → build grounded prompt → return ready-to-stream
// Pattern: Immigration's orchestrator
// ============================================================================
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { SectorId } from "@/core/value-objects";
import type { OrchestratorResult } from "./types";
import { classifyIntent } from "./intent-classifier";
import { gatherContext, buildSystemPrompt } from "./context-gatherer";

export interface OrchestratorInput {
  message: string;
  sector?: SectorId;
  ragContext?: string;
  userContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Main copilot orchestrator pipeline:
 * 1. Classify intent (Haiku — ~100ms)
 * 2. Gather context (pure — instant)
 * 3. Build grounded system prompt (pure — instant)
 * 4. Assemble LLM messages (pure — instant)
 *
 * Returns an OrchestratorResult that the CopilotAgent can feed
 * directly into its streaming LLM call.
 */
export async function orchestrate(
  input: OrchestratorInput,
  llm: ILLMPort,
): Promise<OrchestratorResult> {
  // Stage 1: Classify intent
  const intent = await classifyIntent(input.message, llm);

  // Stage 2: Gather context
  const context = gatherContext({
    intent,
    sector: input.sector,
    ragContext: input.ragContext,
    userContext: input.userContext,
    conversationHistory: input.conversationHistory,
  });

  // Stage 3: Build grounded system prompt
  const systemPrompt = buildSystemPrompt(context);

  // Stage 4: Assemble messages
  const messages: LLMMessage[] = [
    ...(context.conversationHistory).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: input.message },
  ];

  return {
    intent,
    systemPrompt,
    messages,
    context,
  };
}
