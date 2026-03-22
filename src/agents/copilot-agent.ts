// ============================================================================
// RING 5: COPILOT AGENT
// Delegates to intelligence orchestrator, then streams + guardrails
// Does NOT extend BaseAgent because the chat route requires streaming SSE,
// while BaseAgent.run() returns a single non-streaming AgentOutput.
// Pattern: Immigration orchestrator — fast classify, then grounded generation
// ============================================================================
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult } from "./base-agent";
import type { OrgId, SectorId } from "@/core/value-objects";
import { orchestrate } from "@/intelligence/orchestrator";
import { qualityMonitor } from "@/intelligence/quality-monitor";
import type { CopilotIntent } from "@/intelligence/types";

// Re-export types for backward compatibility
export type { CopilotIntent } from "@/intelligence/types";
export { INTENTS } from "@/intelligence/types";

// === Input / Output types ===
export interface CopilotInput {
  orgId: OrgId;
  message: string;
  sector?: SectorId;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  ragContext?: string;
  userContext?: string;
}

export interface CopilotStreamMeta {
  intent: CopilotIntent;
  guardrailsPassed: boolean;
  guardrailFailureReason?: string;
}

// === Agent ===
export class CopilotAgent {
  constructor(
    private readonly llm: ILLMPort,
    private readonly guardrails: (
      raw: string,
      context: Record<string, unknown>
    ) => Promise<GuardrailResult>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 1: Classify intent — delegates to intelligence layer
  // Exposed for direct use in tests and routes that need just classification
  // ─────────────────────────────────────────────────────────────────────────
  async classifyIntent(message: string): Promise<CopilotIntent> {
    const { classifyIntent: classify } = await import("@/intelligence/intent-classifier");
    return classify(message, this.llm);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN: Orchestrate → Stream → Guardrails
  //
  // Yields text deltas as they arrive. After the stream finishes, runs
  // guardrails on the accumulated text. The caller receives a final
  // CopilotStreamMeta object via the returned promise.
  // ─────────────────────────────────────────────────────────────────────────
  async *stream(
    input: CopilotInput,
  ): AsyncGenerator<string, CopilotStreamMeta> {
    // Stages 1–3: Orchestrator handles classify → context → prompt → messages
    const orchestrated = await orchestrate(
      {
        message: input.message,
        sector: input.sector,
        ragContext: input.ragContext,
        userContext: input.userContext,
        conversationHistory: input.conversationHistory,
      },
      this.llm,
    );

    // Stage 4: Stream Sonnet response
    let fullContent = "";
    const iterable = this.llm.stream({
      model: "sonnet",
      systemPrompt: orchestrated.systemPrompt,
      messages: orchestrated.messages,
      maxTokens: 4096,
      temperature: 0.7,
    });

    for await (const chunk of iterable) {
      fullContent += chunk;
      yield chunk;
    }

    // Stage 5: Guardrails on accumulated text
    const guardrailResult = await this.guardrails(fullContent, {
      agentName: "copilot",
      orgId: input.orgId,
      intent: orchestrated.intent,
      sector: input.sector ?? "",
    });

    // Track quality metrics
    qualityMonitor.recordResponse({
      orgId: input.orgId,
      intent: orchestrated.intent,
      responseLength: fullContent.length,
      guardrailsPassed: guardrailResult.passed,
    });

    return {
      intent: orchestrated.intent,
      guardrailsPassed: guardrailResult.passed,
      guardrailFailureReason: guardrailResult.passed
        ? undefined
        : `${guardrailResult.layer}: ${guardrailResult.reason}`,
    };
  }
}
