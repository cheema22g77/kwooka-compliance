// ============================================================================
// RING 5: COPILOT AGENT
// 4-stage pipeline: Classify (Haiku) → Context → Stream (Sonnet) → Guardrails
// Does NOT extend BaseAgent because the chat route requires streaming SSE,
// while BaseAgent.run() returns a single non-streaming AgentOutput.
// Pattern: Immigration orchestrator — fast classify, then grounded generation
// ============================================================================
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult } from "./base-agent";
import type { OrgId, SectorId } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

// === Intent classification ===
export const INTENTS = [
  "analysis",
  "explanation",
  "recommendation",
  "general",
] as const;
export type CopilotIntent = (typeof INTENTS)[number];

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
  // STAGE 1: Classify intent with Haiku (~100ms)
  // ─────────────────────────────────────────────────────────────────────────
  async classifyIntent(message: string): Promise<CopilotIntent> {
    try {
      const response = await this.llm.complete({
        model: "haiku",
        systemPrompt:
          "Classify the user message into exactly one intent. Reply with ONLY the intent word, nothing else.\n" +
          "Intents:\n" +
          "- analysis: user wants a document or policy analysed for compliance\n" +
          "- explanation: user wants a regulation, standard, or concept explained\n" +
          "- recommendation: user wants advice on what to do, next steps, or remediation\n" +
          "- general: greeting, off-topic, or general compliance chat\n",
        messages: [{ role: "user", content: message }],
        maxTokens: 16,
        temperature: 0,
      });

      const raw = response.content.trim().toLowerCase();
      if (INTENTS.includes(raw as CopilotIntent)) {
        return raw as CopilotIntent;
      }
      // Fuzzy match — take the first intent word found in the response
      for (const intent of INTENTS) {
        if (raw.includes(intent)) return intent;
      }
      return "general";
    } catch {
      // Classification failure is non-fatal — default to general
      return "general";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 2: Build grounded system prompt from intent + context
  // ─────────────────────────────────────────────────────────────────────────
  private buildSystemPrompt(
    intent: CopilotIntent,
    sector?: SectorId,
    ragContext?: string,
    userContext?: string,
  ): string {
    const base = `You are the Kwooka Compliance Copilot, an expert AI assistant specialising in Australian regulatory compliance. You work for Kwooka Health Services Ltd, an Aboriginal-owned enterprise (Supply Nation certified) based in Western Australia.

CORE PRINCIPLES:
1. Accuracy First: Only provide information you're confident about. If uncertain, say so.
2. Australian Focus: All advice relates to Australian (particularly WA) legislation.
3. Practical Guidance: Provide actionable, step-by-step guidance.
4. Citation: Always reference specific legislation when making compliance statements.
5. Risk-Based: Categorise issues by risk level (Critical, High, Medium, Low).

RESPONSE FORMAT:
- Use clear headings and bullet points
- Include relevant regulation references
- Provide specific deadlines where applicable
- Suggest next steps or actions`;

    const intentDirectives: Record<CopilotIntent, string> = {
      analysis:
        "\n\nINTENT: The user wants compliance analysis. Focus on identifying gaps, risks, and non-compliance. Reference specific regulations. Score findings by severity.",
      explanation:
        "\n\nINTENT: The user wants something explained. Be clear, educational, and thorough. Use examples where helpful. Reference the specific legislation or standard.",
      recommendation:
        "\n\nINTENT: The user wants actionable advice. Provide prioritised, step-by-step recommendations. Include timeframes and responsible parties where possible.",
      general:
        "\n\nINTENT: General compliance conversation. Be helpful and professional. Guide the user toward using Kwooka's compliance tools if relevant.",
    };

    let prompt = base + intentDirectives[intent];

    if (sector && SECTORS[sector]) {
      const s = SECTORS[sector];
      prompt += `

CURRENT FOCUS: ${s.fullName}

KEY REGULATIONS:
${s.regulations.map((r) => `- ${r}`).join("\n")}

REGULATORY AUTHORITIES:
${s.authorities.map((a) => `- ${a}`).join("\n")}

KEY COMPLIANCE AREAS:
${s.keyAreas.map((a) => `- ${a}`).join("\n")}`;
    }

    if (userContext) {
      prompt += userContext;
    }

    if (ragContext) {
      prompt += ragContext;
    }

    return prompt;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 3 + 4: Stream Sonnet response, then validate through guardrails
  //
  // Yields text deltas as they arrive. After the stream finishes, runs
  // guardrails on the accumulated text. The caller receives a final
  // CopilotStreamMeta object via the returned promise.
  // ─────────────────────────────────────────────────────────────────────────
  async *stream(
    input: CopilotInput,
  ): AsyncGenerator<string, CopilotStreamMeta> {
    // Stage 1 — classify
    const intent = await this.classifyIntent(input.message);

    // Stage 2 — build grounded prompt
    const systemPrompt = this.buildSystemPrompt(
      intent,
      input.sector,
      input.ragContext,
      input.userContext,
    );

    const messages: LLMMessage[] = [
      ...(input.conversationHistory ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input.message },
    ];

    // Stage 3 — stream Sonnet
    let fullContent = "";
    const iterable = this.llm.stream({
      model: "sonnet",
      systemPrompt,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
    });

    for await (const chunk of iterable) {
      fullContent += chunk;
      yield chunk;
    }

    // Stage 4 — guardrails on accumulated text
    const guardrailResult = await this.guardrails(fullContent, {
      agentName: "copilot",
      orgId: input.orgId,
      intent,
      sector: input.sector ?? "",
    });

    return {
      intent,
      guardrailsPassed: guardrailResult.passed,
      guardrailFailureReason: guardrailResult.passed
        ? undefined
        : `${guardrailResult.layer}: ${guardrailResult.reason}`,
    };
  }
}
