// ============================================================================
// RING 5: COMPLIANCE ANALYSER AGENT
// Analyses documents against sector-specific regulations
// Replaces: raw API call in src/app/api/analyze/route.ts
// Pattern: Gold's agent + existing Compliance analysis logic
// ============================================================================
import { BaseAgent, type AgentInput, type AgentOutput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { OrgId } from "@/core/value-objects";
import type { SectorId, FindingSeverity, ComplianceStatus, RiskLevel } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

// === Input / Output types ===
export interface AnalyserInput extends AgentInput {
  data: {
    sector: SectorId;
    documentContent: string;
    documentName?: string;
    additionalContext?: string;
  };
}

export interface AnalysisResult {
  overallStatus: ComplianceStatus;
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  findings: Array<{
    title: string;
    description: string;
    severity: FindingSeverity;
    regulation: string;
    requirement: string;
    remediation: string;
    status: ComplianceStatus;
  }>;
  recommendations: string[];
}

export class ComplianceAnalyser extends BaseAgent<AnalyserInput, AnalysisResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "compliance-analyser",
        model: "sonnet",
        systemPrompt: "", // Set dynamically per sector
        maxTokens: 4096,
        temperature: 0.2,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: AnalyserInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const systemPrompt = this.buildSectorPrompt(sector);

    return [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: this.buildUserMessage(input, sector),
      },
    ];
  }

  protected parseOutput(raw: string, input: AnalyserInput): AnalysisResult {
    // Extract JSON from response (may be in code block)
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1]!;
    }

    try {
      const parsed = JSON.parse(jsonText.trim());

      // Validate and normalise
      return {
        overallStatus: parsed.overallStatus ?? parsed.overall_status ?? "partial",
        riskLevel: parsed.riskLevel ?? parsed.risk_level ?? "medium",
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 50))),
        summary: String(parsed.summary ?? "Analysis complete"),
        findings: Array.isArray(parsed.findings) ? parsed.findings.map(this.normaliseFinding) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      };
    } catch (err) {
      // If JSON parse fails, create a minimal result
      return {
        overallStatus: "partial",
        riskLevel: "medium",
        score: 50,
        summary: raw.slice(0, 500),
        findings: [],
        recommendations: ["Please retry the analysis with a more structured document."],
      };
    }
  }

  private normaliseFinding(f: Record<string, unknown>): AnalysisResult["findings"][0] {
    return {
      title: String(f.title ?? "Untitled Finding"),
      description: String(f.description ?? ""),
      severity: (f.severity as FindingSeverity) ?? "medium",
      regulation: String(f.regulation ?? ""),
      requirement: String(f.requirement ?? ""),
      remediation: String(f.remediation ?? ""),
      status: (f.status as ComplianceStatus) ?? "gap",
    };
  }

  private buildSectorPrompt(sector: typeof SECTORS[SectorId]): string {
    return `You are Kwooka, an Australian compliance analysis specialist for the ${sector.fullName} sector.

AUTHORITY: ${sector.authority}
KEY REGULATIONS: ${sector.regulations.join(", ")}
KEY COMPLIANCE AREAS: ${sector.keyAreas.join(", ")}

ANALYSIS INSTRUCTIONS:
1. Analyse the provided document against ${sector.fullName} requirements
2. Identify specific compliance gaps, risks, and areas of non-compliance
3. Reference specific regulations and standards for each finding
4. Provide actionable remediation steps
5. Calculate an overall compliance score (0-100)

CRITICAL RULES:
- Only cite regulations that actually exist in Australian law
- Never fabricate regulation names or section numbers
- Be specific about which requirement is not met
- Provide practical, actionable remediation steps
- Score conservatively — if uncertain, mark as "partial" not "compliant"

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "overallStatus": "compliant|partial|gap|critical",
  "riskLevel": "low|medium|high|critical",
  "score": 0-100,
  "summary": "Brief overall assessment",
  "findings": [
    {
      "title": "Finding title",
      "description": "What was found",
      "severity": "critical|high|medium|low|info",
      "regulation": "Specific regulation reference",
      "requirement": "What is required",
      "remediation": "How to fix it",
      "status": "compliant|partial|gap|not_addressed"
    }
  ],
  "recommendations": ["Action item 1", "Action item 2"]
}`;
  }

  private buildUserMessage(input: AnalyserInput, sector: typeof SECTORS[SectorId]): string {
    let message = `Analyse the following document for compliance with ${sector.fullName}:\n\n`;

    if (input.data.documentName) {
      message += `Document: ${input.data.documentName}\n\n`;
    }

    message += `--- DOCUMENT CONTENT ---\n${input.data.documentContent}\n--- END DOCUMENT ---`;

    if (input.data.additionalContext) {
      message += `\n\nAdditional context: ${input.data.additionalContext}`;
    }

    return message;
  }
}
