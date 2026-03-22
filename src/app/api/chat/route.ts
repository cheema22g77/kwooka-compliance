/**
 * /api/chat — Compliance Copilot Chat
 *
 * MIGRATED TO AGENT ARCHITECTURE:
 *   - Agent: CopilotAgent (Ring 5) — 4-stage pipeline
 *     1. Classify intent with Haiku (~100ms)
 *     2. Build grounded system prompt from intent + sector + RAG + user context
 *     3. Stream response with Sonnet
 *     4. Validate accumulated text through runGuardrails
 *   - LLM: AnthropicLLMAdapter implementing ILLMPort (Ring 4)
 *   - Guardrails: runGuardrails pipeline (Ring 6)
 *   - Auth: adapters/database/auth.ts
 *   - RAG: existing lib/enhanced-rag-search.ts (unchanged)
 *
 * SSE format is identical to pre-agent version so the frontend doesn't break.
 */

import { NextRequest, NextResponse } from "next/server";
import type { SectorId } from "@/core/value-objects/sectors";
import type { OrgId } from "@/core/value-objects";
import { getAuthUser, getServiceClient } from "@/adapters/database/auth";
import { getAnthropicAdapter } from "@/adapters/llm/anthropic";
import { runGuardrails } from "@/guardrails";
import { searchLegislation } from "@/lib/enhanced-rag-search";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limiter";
import { CopilotAgent } from "@/agents/copilot-agent";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1. Soft auth — don't block unauthenticated users but track if available
  const user = await getAuthUser(request);

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user?.id);
  const rateCheck = checkRateLimit(rateLimitKey, "chat");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429, headers: rateCheck.headers }
    );
  }

  // 3. Parse input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, sector, conversationHistory = [], useRAG = true } = body;

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // 3a. Fetch user's compliance context (findings, scores, evidence gaps)
  let userContext = "";
  if (user) {
    try {
      userContext = await fetchUserComplianceContext(user.id, sector);
    } catch (err) {
      console.error("Failed to fetch user context:", err);
    }
  }

  // 3b. RAG context
  let ragContext = "";
  let citations: any[] = [];

  if (useRAG) {
    try {
      const searchResults = await searchLegislation(message, {
        topK: 5,
        expandQuery: true,
        searchMethod: "bm25",
        minScore: 0.1,
        sector,
      });

      if (searchResults.length > 0) {
        ragContext = `\n\nRELEVANT LEGISLATION & STANDARDS (cite these in your response):\n${searchResults
          .map(
            (r, i) =>
              `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ""}${
                r.sectionTitle ? ` (${r.sectionTitle})` : ""
              }\n${r.content}`
          )
          .join("\n\n---\n\n")}`;

        citations = searchResults.map((r) => ({
          source: r.source.title,
          section: r.sectionNumber || r.sectionTitle,
          score: r.score,
        }));
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError);
    }
  }

  // 4. Create CopilotAgent and stream response
  const agent = new CopilotAgent(getAnthropicAdapter(), runGuardrails);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = "";

        const generator = agent.stream({
          orgId: (user?.id ?? "anonymous") as OrgId,
          message,
          sector: sector as SectorId | undefined,
          conversationHistory,
          ragContext: ragContext || undefined,
          userContext: userContext || undefined,
        });

        // Stream deltas to client (same SSE format as before)
        let streamResult: IteratorResult<string, any>;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          streamResult = await generator.next();
          if (streamResult.done) break;

          const text = streamResult.value;
          fullContent += text;
          const data = JSON.stringify({ type: "delta", content: text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // streamResult.value is the CopilotStreamMeta returned from the generator
        const meta = streamResult.value;

        // If guardrails failed, log it but still send the response
        // (copilot text is already streamed — we can't un-send it, but we
        // flag it in metadata for the frontend to handle if needed)
        if (meta && !meta.guardrailsPassed) {
          console.warn(
            "Copilot guardrail failure:",
            meta.guardrailFailureReason
          );
        }

        // Send done event with metadata (same shape as before)
        const metadata = extractMetadata(fullContent, sector, citations);
        if (meta) {
          (metadata as any).intent = meta.intent;
          (metadata as any).guardrailsPassed = meta.guardrailsPassed;
        }

        const doneData = JSON.stringify({
          type: "done",
          content: fullContent,
          metadata,
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        const errorData = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// fetchUserComplianceContext — unchanged from original
// ---------------------------------------------------------------------------
async function fetchUserComplianceContext(
  userId: string,
  sector?: string
): Promise<string> {
  const supabase = getServiceClient();
  const parts: string[] = [];

  // Fetch open findings (top 10 by severity)
  const { data: findings } = await supabase
    .from("findings")
    .select("title, severity, category, status, due_date")
    .eq("user_id", userId)
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(10);

  if (findings && findings.length > 0) {
    const critical = findings.filter(
      (f) => f.severity === "critical"
    ).length;
    const high = findings.filter((f) => f.severity === "high").length;
    const overdue = findings.filter(
      (f) => f.due_date && new Date(f.due_date) < new Date()
    ).length;

    parts.push(
      `OPEN FINDINGS (${findings.length} total, ${critical} critical, ${high} high${overdue > 0 ? `, ${overdue} OVERDUE` : ""}):`
    );
    for (const f of findings.slice(0, 5)) {
      parts.push(
        `- [${(f.severity || "medium").toUpperCase()}] ${f.title} (${f.category || "General"})${f.due_date ? ` — due ${f.due_date}` : ""}`
      );
    }
    if (findings.length > 5)
      parts.push(`  ...and ${findings.length - 5} more`);
  }

  // Fetch recent analysis scores
  const analysisQuery = supabase
    .from("compliance_analyses")
    .select("sector, document_name, overall_score, overall_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (sector) {
    analysisQuery.eq("sector", sector);
  }

  const { data: analyses } = await analysisQuery;

  if (analyses && analyses.length > 0) {
    const avgScore = Math.round(
      analyses.reduce((s, a) => s + (a.overall_score || 0), 0) /
        analyses.length
    );
    parts.push(`\nRECENT ANALYSES (avg score: ${avgScore}%):`);
    for (const a of analyses) {
      parts.push(
        `- ${a.document_name || "Untitled"}: ${a.overall_score}% (${a.overall_status}) — ${new Date(a.created_at).toLocaleDateString("en-AU")}`
      );
    }
  }

  if (parts.length === 0) {
    return "\n\nUSER CONTEXT: This user has not yet analysed any documents. Encourage them to upload and analyse their first compliance document.";
  }

  return `\n\nUSER'S CURRENT COMPLIANCE STATE (use this to give personalised advice):\n${parts.join("\n")}`;
}

// ---------------------------------------------------------------------------
// extractMetadata — unchanged from original
// ---------------------------------------------------------------------------
function extractMetadata(
  content: string,
  sector?: string,
  citations?: any[]
) {
  const metadata: {
    riskLevel?: string;
    regulationRefs?: Array<{ id: string; name: string; section: string }>;
    confidence?: number;
    citations?: any[];
  } = {};

  if (citations && citations.length > 0) {
    metadata.citations = citations;
  }

  const riskPatterns: Record<string, RegExp> = {
    critical: /\b(critical|severe|immediate action required)\b/i,
    high: /\b(high risk|significant risk|urgent)\b/i,
    medium: /\b(medium risk|moderate|should address)\b/i,
    low: /\b(low risk|minor|consider)\b/i,
  };

  for (const [level, pattern] of Object.entries(riskPatterns)) {
    if (pattern.test(content)) {
      metadata.riskLevel = level;
      break;
    }
  }

  const refs: Array<{ id: string; name: string; section: string }> = [];
  const patterns = [
    /HVNL\s+(?:Section\s+)?(\d+[A-Z]?)/gi,
    /NDIS\s+(?:Practice\s+)?Standard(?:s)?\s+(\d+(?:\.\d+)?)?/gi,
    /WHS\s+(?:Act|Regulations?)(?:\s+Section\s+)?(\d+)?/gi,
    /Quality\s+Indicator(?:s)?\s+(\d+(?:\.\d+)*)/gi,
    /Section\s+(\d+(?:\.\d+)*)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      refs.push({
        id: `ref-${refs.length}`,
        name: match[0],
        section: match[1] || match[0],
      });
    }
  }

  if (refs.length > 0) {
    metadata.regulationRefs = refs.slice(0, 10);
    metadata.confidence = Math.min(0.85 + refs.length * 0.02, 0.95);
  }

  return metadata;
}
