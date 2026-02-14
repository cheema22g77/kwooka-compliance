/**
 * /api/generate-policy — AI Policy Generator
 * 
 * MIGRATED TO RING ARCHITECTURE:
 *   - Auth: adapters/database/auth.ts
 *   - LLM: adapters/llm/anthropic.ts (single client, was 3rd separate instance)
 *   - Rate limiting: lib/rate-limiter.ts
 *   - RAG: existing lib/enhanced-rag-search.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECTORS, isValidSector, type SectorId } from '@/core/value-objects/sectors';
import { llmComplete } from '@/adapters/llm/anthropic';
import { getAuthUser } from '@/adapters/database/auth';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { searchLegislation } from '@/lib/enhanced-rag-search';

export async function POST(request: NextRequest) {
  // 1. Auth (soft — allow but track)
  const user = await getAuthUser(request);

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user?.id);
  const rateCheck = checkRateLimit(rateLimitKey, 'generatePolicy');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Policy generation is limited to 5 per minute.' },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const body = await request.json();
    const { policyType, companyName, companyType, standardNumber, sector = 'ndis', format } = body;

    if (!policyType) {
      return NextResponse.json({ error: 'Policy type is required' }, { status: 400 });
    }

    const sectorId = sector as SectorId;
    const sectorConfig = isValidSector(sectorId) ? SECTORS[sectorId] : SECTORS.ndis;

    // Search for relevant legislation
    let legislationContext = '';
    try {
      const results = await searchLegislation(`${policyType} policy requirements`, {
        topK: 5,
        expandQuery: true,
        searchMethod: 'bm25',
        sector: sectorId,
      });

      if (results.length > 0) {
        legislationContext = `\n\nRELEVANT REQUIREMENTS FROM ${sectorConfig.authority.toUpperCase()}:\n${results.map(r =>
          `${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}: ${r.content}`
        ).join('\n\n')}`;
      }
    } catch (ragError) {
      console.error('RAG search error:', ragError);
    }

    const prompt = `You are a compliance policy writer for Australian ${sectorConfig.name} providers.

Write a comprehensive ${policyType} policy${companyName ? ` for ${companyName} (${companyType || sectorConfig.name + ' Provider'})` : ''}.
${standardNumber ? `This relates to ${sectorConfig.authority} Standard #${standardNumber}.` : ''}
${legislationContext}

The policy must:
1. Be compliant with ${sectorConfig.authority} requirements
2. Reference specific regulations: ${sectorConfig.regulations.slice(0, 3).join(', ')}
3. Be practical and implementable
4. Include clear responsibilities and timeframes

Format with these sections:
1. PURPOSE - Why this policy exists
2. SCOPE - Who and what it applies to
3. POLICY STATEMENT - The key commitments
4. PROCEDURES - Step-by-step processes
5. RESPONSIBILITIES - Who does what
6. RELATED DOCUMENTS - Links to other policies
7. REVIEW - When and how to review

Write in professional Australian English.`;

    const response = await llmComplete({ system: 'You are an expert Australian compliance policy writer.', messages: [{ role: 'user', content: prompt }], maxTokens: 4096 });
    return NextResponse.json({ policy: response.content, content: response.content });

    return NextResponse.json({ policy: response.content, content: response.content });
  } catch (error: any) {
    console.error('Policy generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
