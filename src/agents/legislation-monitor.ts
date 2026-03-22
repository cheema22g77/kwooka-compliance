// ============================================================================
// RING 5: LEGISLATION MONITOR AGENT
// Analyses regulatory updates for impact on an organisation's compliance
// Determines whether program review is required
// ============================================================================
import { BaseAgent, type AgentInput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { SectorId, RiskLevel } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

export interface LegislationMonitorInput extends AgentInput {
  data: {
    sector: SectorId;
    updateTitle: string;
    updateSummary: string;
    updateSource: string;
    publishedAt: string;
    currentProgramSummary?: string;
  };
}

export interface ImpactedArea {
  area: string;
  currentState: string;
  requiredChange: string;
  urgency: "immediate" | "30_days" | "90_days" | "next_review";
}

export interface LegislationImpactResult {
  impactLevel: RiskLevel;
  programReviewRequired: boolean;
  summary: string;
  impactedAreas: ImpactedArea[];
  recommendedActions: string[];
  complianceDeadline: string | null;
}

export class LegislationMonitor extends BaseAgent<LegislationMonitorInput, LegislationImpactResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "legislation-monitor",
        model: "sonnet",
        systemPrompt: "",
        maxTokens: 4096,
        temperature: 0.2,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: LegislationMonitorInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const systemPrompt = `You are an Australian regulatory change analyst for the ${sector.fullName} sector.

AUTHORITY: ${sector.authority}
KEY REGULATIONS: ${sector.regulations.join(", ")}

TASK: Analyse a regulatory update and determine its impact on an organisation's compliance program.
Be conservative — if a change could affect compliance, flag it.

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "impactLevel": "low|medium|high|critical",
  "programReviewRequired": true,
  "summary": "Impact assessment summary",
  "impactedAreas": [
    {
      "area": "Compliance area affected",
      "currentState": "What is currently in place",
      "requiredChange": "What needs to change",
      "urgency": "immediate|30_days|90_days|next_review"
    }
  ],
  "recommendedActions": ["Action 1", "Action 2"],
  "complianceDeadline": "YYYY-MM-DD or null"
}`;

    let userMessage = `Analyse the impact of this regulatory update on ${sector.fullName} compliance:

TITLE: ${input.data.updateTitle}
SOURCE: ${input.data.updateSource}
PUBLISHED: ${input.data.publishedAt}

SUMMARY:
${input.data.updateSummary}`;

    if (input.data.currentProgramSummary) {
      userMessage += `\n\nCURRENT COMPLIANCE PROGRAM:\n${input.data.currentProgramSummary}`;
    }

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, _input: LegislationMonitorInput): LegislationImpactResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

    try {
      const parsed = JSON.parse(jsonText.trim());

      return {
        impactLevel: parsed.impactLevel ?? "medium",
        programReviewRequired: parsed.programReviewRequired ?? true,
        summary: String(parsed.summary ?? "Impact assessment complete"),
        impactedAreas: Array.isArray(parsed.impactedAreas)
          ? parsed.impactedAreas.map((a: any) => ({
              area: String(a.area ?? ""),
              currentState: String(a.currentState ?? "Unknown"),
              requiredChange: String(a.requiredChange ?? ""),
              urgency: a.urgency ?? "next_review",
            }))
          : [],
        recommendedActions: Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions.map(String)
          : [],
        complianceDeadline: parsed.complianceDeadline ?? null,
      };
    } catch {
      return {
        impactLevel: "medium",
        programReviewRequired: true,
        summary: raw.slice(0, 300),
        impactedAreas: [],
        recommendedActions: ["Manual review of regulatory update required"],
        complianceDeadline: null,
      };
    }
  }
}
