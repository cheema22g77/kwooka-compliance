// ============================================================================
// INTELLIGENCE: Context Gatherer — assembles ComputedContext for the copilot
// Combines sector config, RAG results, user history into one object
// Pattern: Immigration's context assembly stage
// ============================================================================
import type { SectorId } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";
import type { CopilotIntent, ComputedContext } from "./types";

export interface ContextGathererInput {
  intent: CopilotIntent;
  sector?: SectorId;
  ragContext?: string;
  userContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Assemble all available context into a single ComputedContext object.
 * Pure function — no side effects or external calls.
 */
export function gatherContext(input: ContextGathererInput): ComputedContext {
  return {
    intent: input.intent,
    sector: input.sector ? (SECTORS[input.sector] ?? null) : null,
    ragContext: input.ragContext ?? null,
    userContext: input.userContext ?? null,
    conversationHistory: input.conversationHistory ?? [],
  };
}

/**
 * Build the grounded system prompt from a ComputedContext.
 * Extracted from CopilotAgent.buildSystemPrompt().
 */
export function buildSystemPrompt(ctx: ComputedContext): string {
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

  let prompt = base + intentDirectives[ctx.intent];

  if (ctx.sector) {
    prompt += `

CURRENT FOCUS: ${ctx.sector.fullName}

KEY REGULATIONS:
${ctx.sector.regulations.map((r) => `- ${r}`).join("\n")}

REGULATORY AUTHORITIES:
${ctx.sector.authorities.map((a) => `- ${a}`).join("\n")}

KEY COMPLIANCE AREAS:
${ctx.sector.keyAreas.map((a) => `- ${a}`).join("\n")}`;
  }

  if (ctx.userContext) {
    prompt += ctx.userContext;
  }

  if (ctx.ragContext) {
    prompt += ctx.ragContext;
  }

  return prompt;
}
