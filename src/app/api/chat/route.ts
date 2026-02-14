/**
 * /api/chat — Compliance Copilot Chat
 * 
 * MIGRATED TO RING ARCHITECTURE:
 *   - Auth: adapters/database/auth.ts
 *   - Sector config: core/value-objects/sectors.ts
 *   - LLM: adapters/llm/anthropic.ts (single client)
 *   - RAG: existing lib/enhanced-rag-search.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECTORS, type SectorId } from '@/core/value-objects/sectors';
import { llmStream } from '@/adapters/llm/anthropic';
import { getAuthUser, getServiceClient } from '@/adapters/database/auth';
import { searchLegislation } from '@/lib/enhanced-rag-search';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limiter';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1. Soft auth — don't block unauthenticated users but track if available
  const user = await getAuthUser(request);

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user?.id);
  const rateCheck = checkRateLimit(rateLimitKey, 'chat');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429, headers: rateCheck.headers }
    );
  }

  // 3. Parse input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, sector, conversationHistory = [], useRAG = true } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // 3a. Fetch user's compliance context (findings, scores, evidence gaps)
  let userContext = '';
  if (user) {
    try {
      userContext = await fetchUserComplianceContext(user.id, sector);
    } catch (err) {
      console.error('Failed to fetch user context:', err);
    }
  }

  // 3b. RAG context
  let ragContext = '';
  let citations: any[] = [];

  if (useRAG) {
    try {
      const searchResults = await searchLegislation(message, {
        topK: 5,
        expandQuery: true,
        searchMethod: 'bm25',
        minScore: 0.1,
        sector,
      });

      if (searchResults.length > 0) {
        ragContext = `\n\nRELEVANT LEGISLATION & STANDARDS (cite these in your response):\n${searchResults
          .map(
            (r, i) =>
              `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}${
                r.sectionTitle ? ` (${r.sectionTitle})` : ''
              }\n${r.content}`
          )
          .join('\n\n---\n\n')}`;

        citations = searchResults.map((r) => ({
          source: r.source.title,
          section: r.sectionNumber || r.sectionTitle,
          score: r.score,
        }));
      }
    } catch (ragError) {
      console.error('RAG search error:', ragError);
    }
  }

  // 4. Build system prompt from SINGLE sector config source + user context
  const systemPrompt = buildChatSystemPrompt(sector) + userContext + ragContext;
  const messages = [
    ...(conversationHistory ?? []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // 5. Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await llmStream({
          system: systemPrompt,
          messages,
          maxTokens: 4096,
          temperature: 0.7,
        });

        let fullContent = '';

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullContent += text;
            const data = JSON.stringify({ type: 'delta', content: text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          if (event.type === 'message_stop') {
            const metadata = extractMetadata(fullContent, sector, citations);
            const doneData = JSON.stringify({ type: 'done', content: fullContent, metadata });
            controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          }
        }

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Build system prompt using SINGLE sector config
 */
function buildChatSystemPrompt(sector?: string): string {
  const basePrompt = `You are the Kwooka Compliance Copilot, an expert AI assistant specialising in Australian regulatory compliance. You work for Kwooka Health Services Ltd, an Aboriginal-owned enterprise (Supply Nation certified) based in Western Australia.

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

  if (sector && SECTORS[sector as SectorId]) {
    const s = SECTORS[sector as SectorId];
    return `${basePrompt}

CURRENT FOCUS: ${s.fullName}

KEY REGULATIONS:
${s.regulations.map((r) => `- ${r}`).join('\n')}

REGULATORY AUTHORITIES:
${s.authorities.map((a) => `- ${a}`).join('\n')}

KEY COMPLIANCE AREAS:
${s.keyAreas.map((a) => `- ${a}`).join('\n')}`;
  }

  return basePrompt;
}

/**
 * Fetch user's compliance state to make copilot contextual
 */
async function fetchUserComplianceContext(userId: string, sector?: string): Promise<string> {
  const supabase = getServiceClient();
  const parts: string[] = [];

  // Fetch open findings (top 10 by severity)
  const { data: findings } = await supabase
    .from('findings')
    .select('title, severity, category, status, due_date')
    .eq('user_id', userId)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (findings && findings.length > 0) {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const overdue = findings.filter(f => f.due_date && new Date(f.due_date) < new Date()).length;

    parts.push(`OPEN FINDINGS (${findings.length} total, ${critical} critical, ${high} high${overdue > 0 ? `, ${overdue} OVERDUE` : ''}):`);
    for (const f of findings.slice(0, 5)) {
      parts.push(`- [${(f.severity || 'medium').toUpperCase()}] ${f.title} (${f.category || 'General'})${f.due_date ? ` — due ${f.due_date}` : ''}`);
    }
    if (findings.length > 5) parts.push(`  ...and ${findings.length - 5} more`);
  }

  // Fetch recent analysis scores
  const analysisQuery = supabase
    .from('compliance_analyses')
    .select('sector, document_name, overall_score, overall_status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (sector) {
    analysisQuery.eq('sector', sector);
  }

  const { data: analyses } = await analysisQuery;

  if (analyses && analyses.length > 0) {
    const avgScore = Math.round(analyses.reduce((s, a) => s + (a.overall_score || 0), 0) / analyses.length);
    parts.push(`\nRECENT ANALYSES (avg score: ${avgScore}%):`);
    for (const a of analyses) {
      parts.push(`- ${a.document_name || 'Untitled'}: ${a.overall_score}% (${a.overall_status}) — ${new Date(a.created_at).toLocaleDateString('en-AU')}`);
    }
  }

  if (parts.length === 0) {
    return '\n\nUSER CONTEXT: This user has not yet analysed any documents. Encourage them to upload and analyse their first compliance document.';
  }

  return `\n\nUSER'S CURRENT COMPLIANCE STATE (use this to give personalised advice):\n${parts.join('\n')}`;
}

/**
 * Extract metadata from AI response
 */
function extractMetadata(content: string, sector?: string, citations?: any[]) {
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
      refs.push({ id: `ref-${refs.length}`, name: match[0], section: match[1] || match[0] });
    }
  }

  if (refs.length > 0) {
    metadata.regulationRefs = refs.slice(0, 10);
    metadata.confidence = Math.min(0.85 + refs.length * 0.02, 0.95);
  }

  return metadata;
}
