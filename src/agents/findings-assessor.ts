// ============================================================================
// RING 5: FINDINGS ASSESSOR AGENT
// Triages and prioritises compliance findings from assessments
// Assigns severity, recommends remediation, estimates effort
// ============================================================================
import { BaseAgent, type AgentInput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { SectorId, FindingSeverity, ComplianceStatus } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

export interface FindingsAssessorInput extends AgentInput {
  data: {
    sector: SectorId;
    findings: Array<{
      title: string;
      description: string;
      currentSeverity?: string;
      regulation?: string;
    }>;
    orgContext?: string;
  };
}

export interface AssessedFinding {
  title: string;
  description: string;
  severity: FindingSeverity;
  status: ComplianceStatus;
  regulation: string;
  remediation: string;
  effortEstimate: "hours" | "days" | "weeks" | "months";
  priority: number;
}

export interface FindingsAssessmentResult {
  assessedFindings: AssessedFinding[];
  criticalCount: number;
  highCount: number;
  overallRiskStatement: string;
  recommendedOrder: string[];
}

export class FindingsAssessor extends BaseAgent<FindingsAssessorInput, FindingsAssessmentResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "findings-assessor",
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

  protected buildMessages(input: FindingsAssessorInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const systemPrompt = `You are a compliance findings triage specialist for the Australian ${sector.fullName} sector.

AUTHORITY: ${sector.authority}
KEY REGULATIONS: ${sector.regulations.join(", ")}

TASK: Assess each finding for severity, recommend remediation, and estimate effort.
Score conservatively — if uncertain, assign higher severity.

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "assessedFindings": [
    {
      "title": "Finding title",
      "description": "What was found",
      "severity": "critical|high|medium|low|info",
      "status": "gap|partial|not_addressed",
      "regulation": "Specific regulation reference",
      "remediation": "How to fix it",
      "effortEstimate": "hours|days|weeks|months",
      "priority": 1
    }
  ],
  "criticalCount": 0,
  "highCount": 0,
  "overallRiskStatement": "Brief risk summary",
  "recommendedOrder": ["Finding to fix first", "Then this one"]
}`;

    const findingsList = input.data.findings
      .map((f, i) => `${i + 1}. ${f.title}: ${f.description}${f.regulation ? ` (Regulation: ${f.regulation})` : ""}`)
      .join("\n");

    let userMessage = `Assess the following ${input.data.findings.length} findings for ${sector.fullName} compliance:\n\n${findingsList}`;

    if (input.data.orgContext) {
      userMessage += `\n\nOrganisation context: ${input.data.orgContext}`;
    }

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, _input: FindingsAssessorInput): FindingsAssessmentResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

    try {
      const parsed = JSON.parse(jsonText.trim());

      const assessedFindings: AssessedFinding[] = Array.isArray(parsed.assessedFindings)
        ? parsed.assessedFindings.map((f: any, i: number) => ({
            title: String(f.title ?? `Finding ${i + 1}`),
            description: String(f.description ?? ""),
            severity: f.severity ?? "medium",
            status: f.status ?? "gap",
            regulation: String(f.regulation ?? ""),
            remediation: String(f.remediation ?? ""),
            effortEstimate: f.effortEstimate ?? "days",
            priority: Number(f.priority) || i + 1,
          }))
        : [];

      return {
        assessedFindings,
        criticalCount: assessedFindings.filter((f) => f.severity === "critical").length,
        highCount: assessedFindings.filter((f) => f.severity === "high").length,
        overallRiskStatement: String(parsed.overallRiskStatement ?? "Assessment complete"),
        recommendedOrder: Array.isArray(parsed.recommendedOrder)
          ? parsed.recommendedOrder.map(String)
          : assessedFindings.map((f) => f.title),
      };
    } catch {
      return {
        assessedFindings: [],
        criticalCount: 0,
        highCount: 0,
        overallRiskStatement: raw.slice(0, 300),
        recommendedOrder: [],
      };
    }
  }
}
