// ============================================================================
// RING 5: REPORT DRAFTER AGENT
// Generates audit reports from assessment data and findings
// Output is structured for PDF/DOCX rendering
// ============================================================================
import { BaseAgent, type AgentInput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { SectorId, RiskLevel, FindingSeverity } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

export interface ReportDrafterInput extends AgentInput {
  data: {
    sector: SectorId;
    orgName: string;
    overallScore: number;
    riskLevel: RiskLevel;
    findings: Array<{
      title: string;
      severity: FindingSeverity;
      status: string;
      description: string;
    }>;
    assessmentDate: string;
    previousScore?: number;
  };
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface ReportDrafterResult {
  reportTitle: string;
  executiveSummary: string;
  sections: ReportSection[];
  riskMatrix: Array<{
    area: string;
    level: RiskLevel;
    trend: "improving" | "stable" | "declining";
  }>;
  recommendations: string[];
  nextReviewDate: string;
}

export class ReportDrafter extends BaseAgent<ReportDrafterInput, ReportDrafterResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "report-drafter",
        model: "sonnet",
        systemPrompt: "",
        maxTokens: 4096,
        temperature: 0.3,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: ReportDrafterInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const criticalCount = input.data.findings.filter((f) => f.severity === "critical").length;
    const highCount = input.data.findings.filter((f) => f.severity === "high").length;

    const systemPrompt = `You are a compliance audit report writer for the Australian ${sector.fullName} sector.

AUTHORITY: ${sector.authority}

TASK: Draft a professional audit report from the assessment data provided.
The report must be suitable for board-level review and regulatory submission.

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "reportTitle": "Compliance Audit Report — Sector Name",
  "executiveSummary": "2-3 paragraph executive summary",
  "sections": [
    { "title": "Section title", "content": "Section content" }
  ],
  "riskMatrix": [
    { "area": "Compliance area", "level": "low|medium|high|critical", "trend": "improving|stable|declining" }
  ],
  "recommendations": ["Recommendation 1"],
  "nextReviewDate": "YYYY-MM-DD"
}`;

    const findingsSummary = input.data.findings
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`)
      .join("\n");

    let userMessage = `Draft an audit report for ${input.data.orgName}.

SECTOR: ${sector.fullName}
ASSESSMENT DATE: ${input.data.assessmentDate}
OVERALL SCORE: ${input.data.overallScore}%
RISK LEVEL: ${input.data.riskLevel}
FINDINGS: ${input.data.findings.length} total (${criticalCount} critical, ${highCount} high)
${input.data.previousScore !== undefined ? `PREVIOUS SCORE: ${input.data.previousScore}%` : ""}

FINDINGS DETAIL:
${findingsSummary}`;

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, input: ReportDrafterInput): ReportDrafterResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

    try {
      const parsed = JSON.parse(jsonText.trim());

      return {
        reportTitle: String(parsed.reportTitle ?? "Compliance Audit Report"),
        executiveSummary: String(parsed.executiveSummary ?? ""),
        sections: Array.isArray(parsed.sections)
          ? parsed.sections.map((s: any) => ({
              title: String(s.title ?? ""),
              content: String(s.content ?? ""),
            }))
          : [],
        riskMatrix: Array.isArray(parsed.riskMatrix)
          ? parsed.riskMatrix.map((r: any) => ({
              area: String(r.area ?? ""),
              level: r.level ?? "medium",
              trend: r.trend ?? "stable",
            }))
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(String)
          : [],
        nextReviewDate:
          parsed.nextReviewDate ??
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
      };
    } catch {
      return {
        reportTitle: "Compliance Audit Report",
        executiveSummary: raw.slice(0, 500),
        sections: [],
        riskMatrix: [],
        recommendations: [],
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
      };
    }
  }
}
