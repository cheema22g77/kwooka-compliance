/**
 * /api/generate-policy — AI Policy Generator
 *
 * MIGRATED TO AGENT ARCHITECTURE:
 *   - Agent: PolicyGenerator (Ring 5)
 *   - LLM: AnthropicLLMAdapter implementing ILLMPort (Ring 4)
 *   - Guardrails: runGuardrails pipeline (Ring 6)
 *   - Auth: adapters/database/auth.ts
 *   - RAG: existing lib/enhanced-rag-search.ts (unchanged)
 *
 * Response shape preserved: { policy: string, content: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { SECTORS, isValidSector, type SectorId } from "@/core/value-objects/sectors";
import type { OrgId } from "@/core/value-objects";
import { getAuthUser } from "@/adapters/database/auth";
import { getAnthropicAdapter } from "@/adapters/llm/anthropic";
import { runGuardrails } from "@/guardrails";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";
import { searchLegislation } from "@/lib/enhanced-rag-search";
import { PolicyGenerator } from "@/agents/policy-generator";

export async function POST(request: NextRequest) {
  // 1. Auth (soft — allow but track)
  const user = await getAuthUser(request);

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user?.id);
  const rateCheck = checkRateLimit(rateLimitKey, "generatePolicy");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Policy generation is limited to 5 per minute.",
      },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const body = await request.json();
    const {
      policyType,
      companyName,
      companyType,
      standardNumber,
      sector = "ndis",
      format,
    } = body;

    if (!policyType) {
      return NextResponse.json(
        { error: "Policy type is required" },
        { status: 400 }
      );
    }

    const sectorId = sector as SectorId;
    const sectorConfig = isValidSector(sectorId) ? SECTORS[sectorId] : SECTORS.ndis;

    // RAG context
    let legislationContext = "";
    try {
      const results = await searchLegislation(
        `${policyType} policy requirements`,
        {
          topK: 5,
          expandQuery: true,
          searchMethod: "bm25",
          sector: sectorId,
        }
      );

      if (results.length > 0) {
        legislationContext = `\n\nRELEVANT REQUIREMENTS FROM ${sectorConfig.authority.toUpperCase()}:\n${results
          .map(
            (r) =>
              `${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ""}: ${r.content}`
          )
          .join("\n\n")}`;
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError);
    }

    // Run PolicyGenerator agent
    const agent = new PolicyGenerator(getAnthropicAdapter(), runGuardrails);

    const output = await agent.run({
      orgId: (user?.id ?? "anonymous") as OrgId,
      data: {
        sector: isValidSector(sectorId) ? sectorId : ("ndis" as SectorId),
        policyType,
        companyName,
        companyType,
        standardNumber,
        format,
        additionalContext: legislationContext || undefined,
      },
    });

    if (!output.success || !output.result) {
      console.error("Policy generation agent failed:", output.error);
      return NextResponse.json(
        { error: "Policy generation failed. Please try again." },
        { status: 502 }
      );
    }

    // Return in legacy format: { policy, content }
    const content = output.result.fullContent;
    return NextResponse.json({ policy: content, content });
  } catch (error: any) {
    console.error("Policy generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
