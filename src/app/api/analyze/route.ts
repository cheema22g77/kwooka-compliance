/**
 * /api/analyze — Compliance Document Analysis
 *
 * MIGRATED TO AGENT ARCHITECTURE:
 *   - Agent: ComplianceAnalyser (Ring 5)
 *   - LLM: AnthropicLLMAdapter implementing ILLMPort (Ring 4)
 *   - Guardrails: runGuardrails pipeline (Ring 6)
 *   - Auth: adapters/database/auth.ts
 *   - Persistence: adapters/database/analysis-repo.ts
 *   - RAG: existing lib/enhanced-rag-search.ts (unchanged)
 *
 * Response shape is identical to the pre-agent version so the frontend
 * doesn't break.
 */

import { NextRequest, NextResponse } from "next/server";
import { SECTORS, isValidSector, type SectorId } from "@/core/value-objects/sectors";
import { requireAuth, AuthError } from "@/adapters/database/auth";
import { getAnthropicAdapter } from "@/adapters/llm/anthropic";
import { saveAnalysis } from "@/adapters/database/analysis-repo";
import { saveAnalysisFindings } from "@/adapters/database/findings-repo";
import { notifyAnalysisComplete } from "@/adapters/database/notifications-repo";
import { runGuardrails } from "@/guardrails";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";
import { searchLegislation } from "@/lib/enhanced-rag-search";
import {
  ComplianceAnalyser,
  type AnalysisResult,
} from "@/agents/compliance-analyser";
import type { OrgId } from "@/core/value-objects";

export async function POST(request: NextRequest) {
  // 1. Auth
  let user;
  try {
    user = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user.id);
  const rateCheck = checkRateLimit(rateLimitKey, "analyze");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Please wait before analysing another document.",
      },
      { status: 429, headers: rateCheck.headers }
    );
  }

  // 3. Parse & validate input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentText, sector, documentType, documentName } = body;

  if (!documentText || typeof documentText !== "string") {
    return NextResponse.json(
      { error: "documentText is required" },
      { status: 400 }
    );
  }
  if (!sector || !isValidSector(sector)) {
    return NextResponse.json(
      {
        error: `Invalid sector. Must be one of: ${Object.keys(SECTORS).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const sectorConfig = SECTORS[sector as SectorId];

  // 4. RAG context retrieval
  let legislationContext = "";
  try {
    const searchQueries = [
      `${sector} compliance requirements`,
      ...sectorConfig.keyAreas.slice(0, 3),
    ];

    const allResults: any[] = [];
    for (const query of searchQueries) {
      const results = await searchLegislation(query, {
        topK: 5,
        expandQuery: true,
        searchMethod: "bm25",
        sector,
      });
      allResults.push(...results);
    }

    const uniqueResults = Array.from(
      new Map(allResults.map((r) => [r.id, r])).values()
    ).slice(0, 15);

    if (uniqueResults.length > 0) {
      legislationContext = `\n\nRELEVANT LEGISLATION FROM DATABASE:\n${uniqueResults
        .map(
          (r, i) =>
            `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ""}${
              r.sectionTitle ? ` (${r.sectionTitle})` : ""
            }\n${r.content}`
        )
        .join("\n\n---\n\n")}`;
    }
  } catch (ragError) {
    console.error("RAG search error in analyze:", ragError);
  }

  // 5. Run ComplianceAnalyser agent
  const agent = new ComplianceAnalyser(
    getAnthropicAdapter(),
    runGuardrails
  );

  let agentOutput;
  try {
    agentOutput = await agent.run({
      orgId: user.id as OrgId,
      data: {
        sector: sector as SectorId,
        documentContent: documentText.substring(0, 20000),
        documentName: documentName || "Untitled",
        additionalContext: legislationContext || undefined,
      },
    });
  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }

  if (!agentOutput.success || !agentOutput.result) {
    console.error("Agent failed:", agentOutput.error);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }

  // 6. Map agent result to the legacy API response shape
  const result = agentOutput.result;
  const analysis = mapToLegacyResponse(result, sector as SectorId, documentType, sectorConfig);

  // 7. Persist analysis
  const saved = await saveAnalysis({
    user_id: user.id,
    sector,
    document_type: documentType || "Policy Document",
    document_name: documentName || "Untitled",
    overall_score: analysis.overallScore,
    overall_status: analysis.overallStatus,
    risk_level: analysis.riskLevel,
    summary: analysis.summary,
    findings: analysis.findings,
    strengths: analysis.strengths,
    critical_gaps: analysis.criticalGaps,
    action_plan: analysis.actionPlan,
    compliance_by_area: analysis.complianceByArea,
    raw_analysis: analysis,
  });

  // 8. Save findings as trackable action items
  const findingsSaved = await saveAnalysisFindings(
    user.id,
    saved?.id ?? "",
    analysis.findings ?? [],
    sector,
    documentName
  );

  analysis.findingsCreated = findingsSaved;

  // 9. Notify user
  const criticalCount = (analysis.findings ?? []).filter(
    (f: any) => f.severity === "CRITICAL"
  ).length;
  await notifyAnalysisComplete(
    user.id,
    analysis.overallScore,
    sectorConfig?.name ?? sector,
    documentName || "Untitled",
    findingsSaved,
    criticalCount
  ).catch(() => {}); // Don't fail the request if notification fails

  return NextResponse.json(analysis);
}

// ---------------------------------------------------------------------------
// Map the agent's AnalysisResult to the legacy response shape the frontend
// expects. Uppercases enum values and fills in optional arrays.
// ---------------------------------------------------------------------------
function mapToLegacyResponse(
  result: AnalysisResult,
  sector: SectorId,
  documentType: string | undefined,
  sectorConfig: (typeof SECTORS)[SectorId]
): any {
  const statusMap: Record<string, string> = {
    compliant: "COMPLIANT",
    partial: "PARTIAL",
    gap: "NON_COMPLIANT",
    not_addressed: "NON_COMPLIANT",
    critical: "CRITICAL",
  };

  const riskMap: Record<string, string> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
  };

  const severityMap: Record<string, string> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    info: "INFO",
  };

  const findingStatusMap: Record<string, string> = {
    compliant: "COMPLIANT",
    partial: "PARTIAL",
    gap: "GAP",
    not_addressed: "NOT_ADDRESSED",
    critical: "GAP",
  };

  const findings = result.findings.map((f, i) => ({
    id: i + 1,
    area: f.regulation || sectorConfig.keyAreas[0] || sector,
    title: f.title,
    severity: severityMap[f.severity] ?? "MEDIUM",
    status: findingStatusMap[f.status] ?? "GAP",
    description: f.description,
    evidence: null,
    regulation: f.regulation,
    recommendation: f.remediation,
    priority: severityToPriority(f.severity),
  }));

  const criticalGaps = result.findings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .map((f) => f.title);

  const actionPlan = result.recommendations.map((rec, i) => ({
    priority: i + 1,
    action: rec,
    timeframe: i === 0 ? "immediate" : i < 3 ? "7 days" : "30 days",
    responsibility: "Compliance Officer",
  }));

  return {
    sector,
    sectorName: sectorConfig.name,
    documentType: documentType || "Policy Document",
    overallScore: result.score,
    overallStatus: statusMap[result.overallStatus] ?? "PARTIAL",
    riskLevel: riskMap[result.riskLevel] ?? "MEDIUM",
    summary: result.summary,
    findings,
    strengths: [],
    criticalGaps,
    actionPlan,
    complianceByArea: [],
    regulatoryReferences: result.findings
      .filter((f) => f.regulation)
      .map((f) => ({
        reference: f.regulation,
        description: f.requirement,
      })),
    nextAuditFocus: criticalGaps.slice(0, 3),
    regulatoryAuthority: sectorConfig.authority,
    analyzedAt: new Date().toISOString(),
    _validation: { warnings: 0, fixes: 0, validated: true },
  };
}

function severityToPriority(severity: string): number {
  switch (severity) {
    case "critical": return 1;
    case "high": return 3;
    case "medium": return 5;
    case "low": return 7;
    case "info": return 9;
    default: return 5;
  }
}
