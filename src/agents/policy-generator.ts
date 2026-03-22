// ============================================================================
// RING 5: POLICY GENERATOR AGENT
// Generates compliance programs/policies per sector
// Replaces: raw LLM call in src/app/api/generate-policy/route.ts
// Pattern: BaseAgent with structured JSON output
// ============================================================================
import { BaseAgent, type AgentInput, type AgentOutput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { OrgId, SectorId } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

// === Input / Output types ===
export interface PolicyGeneratorInput extends AgentInput {
  data: {
    sector: SectorId;
    policyType: string;
    companyName?: string;
    companyType?: string;
    standardNumber?: string;
    format?: string;
    additionalContext?: string;
  };
}

export interface PolicySection {
  heading: string;
  content: string;
}

export interface PolicyResult {
  title: string;
  policyType: string;
  sector: SectorId;
  sections: PolicySection[];
  fullContent: string;
  regulatoryReferences: string[];
  reviewDate: string;
}

export class PolicyGenerator extends BaseAgent<PolicyGeneratorInput, PolicyResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "policy-generator",
        model: "sonnet",
        systemPrompt: "",
        maxTokens: 4096,
        temperature: 0.4,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: PolicyGeneratorInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const systemPrompt = `You are an expert Australian compliance policy writer specialising in ${sector.fullName}.

AUTHORITY: ${sector.authority}
KEY REGULATIONS: ${sector.regulations.join(", ")}

WRITING RULES:
- Write in professional Australian English
- Reference specific regulations and standards
- Be practical and implementable
- Include clear responsibilities and timeframes
- Never fabricate regulation names or section numbers

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "title": "Full policy title",
  "policyType": "Type of policy",
  "sections": [
    { "heading": "PURPOSE", "content": "..." },
    { "heading": "SCOPE", "content": "..." },
    { "heading": "POLICY STATEMENT", "content": "..." },
    { "heading": "PROCEDURES", "content": "..." },
    { "heading": "RESPONSIBILITIES", "content": "..." },
    { "heading": "RELATED DOCUMENTS", "content": "..." },
    { "heading": "REVIEW", "content": "..." }
  ],
  "regulatoryReferences": ["Reference 1", "Reference 2"],
  "reviewDate": "YYYY-MM-DD"
}`;

    let userMessage = `Write a comprehensive ${input.data.policyType} policy for the ${sector.fullName} sector.`;

    if (input.data.companyName) {
      userMessage += `\n\nCompany: ${input.data.companyName}`;
      if (input.data.companyType) {
        userMessage += ` (${input.data.companyType})`;
      }
    }

    if (input.data.standardNumber) {
      userMessage += `\n\nThis relates to ${sector.authority} Standard #${input.data.standardNumber}.`;
    }

    userMessage += `\n\nThe policy must comply with: ${sector.regulations.slice(0, 3).join(", ")}`;

    if (input.data.additionalContext) {
      userMessage += `\n\nAdditional context:\n${input.data.additionalContext}`;
    }

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, input: PolicyGeneratorInput): PolicyResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1]!;
    }

    try {
      const parsed = JSON.parse(jsonText.trim());

      const sections: PolicySection[] = Array.isArray(parsed.sections)
        ? parsed.sections.map((s: any) => ({
            heading: String(s.heading ?? "Untitled Section"),
            content: String(s.content ?? ""),
          }))
        : [];

      const fullContent = sections.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");

      // Calculate review date — 12 months from now if not provided
      const reviewDate =
        parsed.reviewDate ??
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      return {
        title: String(parsed.title ?? `${input.data.policyType} Policy`),
        policyType: input.data.policyType,
        sector: input.data.sector,
        sections,
        fullContent,
        regulatoryReferences: Array.isArray(parsed.regulatoryReferences)
          ? parsed.regulatoryReferences.map(String)
          : [],
        reviewDate,
      };
    } catch {
      // If JSON parse fails, treat the entire response as the policy content
      return {
        title: `${input.data.policyType} Policy`,
        policyType: input.data.policyType,
        sector: input.data.sector,
        sections: [{ heading: "POLICY", content: raw }],
        fullContent: raw,
        regulatoryReferences: [],
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
      };
    }
  }
}
