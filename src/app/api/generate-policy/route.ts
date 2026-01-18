import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchLegislation } from '@/lib/enhanced-rag-search'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { policyType, companyName, companyType, standardNumber, sector = 'ndis' } = body

    if (!policyType || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Search for relevant legislation
    let legislationContext = "";
    try {
      const results = await searchLegislation(`${policyType} policy requirements`, {
        topK: 5,
        expandQuery: true,
        searchMethod: 'bm25',
        sector,
      });

      if (results.length > 0) {
        legislationContext = `\n\nRELEVANT REQUIREMENTS FROM NDIS PRACTICE STANDARDS:\n${results.map((r, i) => 
          `${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}: ${r.content}`
        ).join('\n\n')}`;
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError);
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a compliance policy writer for Australian NDIS providers.

Write a comprehensive ${policyType} policy for ${companyName} (${companyType || 'NDIS Provider'}).
${standardNumber ? `This relates to NDIS Practice Standard #${standardNumber}.` : ''}
${legislationContext}

The policy must:
1. Be compliant with NDIS Practice Standards
2. Reference specific Quality Indicators where applicable
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

Write in professional Australian English.`
      }]
    })

    const policy = response.content[0].type === 'text' ? response.content[0].text : 'No policy generated'

    return NextResponse.json({ policy })

  } catch (error: any) {
    console.error('Policy generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
