/**
 * /api/analyze — Compliance Document Analysis
 * 
 * MIGRATED TO RING ARCHITECTURE:
 *   - Auth: adapters/database/auth.ts
 *   - Sector config: core/value-objects/sectors.ts (single source)
 *   - LLM: adapters/llm/anthropic.ts (single client)
 *   - Validation: guardrails/validate-analysis.ts
 *   - Persistence: adapters/database/analysis-repo.ts
 *   - RAG: existing lib/enhanced-rag-search.ts (unchanged)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECTORS, isValidSector, type SectorId } from '@/core/value-objects/sectors';
import { llmComplete } from '@/adapters/llm/anthropic';
import { requireAuth, AuthError } from '@/adapters/database/auth';
import { saveAnalysis } from '@/adapters/database/analysis-repo';
import { saveAnalysisFindings } from '@/adapters/database/findings-repo';
import { notifyAnalysisComplete } from '@/adapters/database/notifications-repo';
import { validateAnalysisOutput } from '@/guardrails/validate-analysis';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limiter';
import { searchLegislation } from '@/lib/enhanced-rag-search';

export async function POST(request: NextRequest) {
  // 1. Auth
  let user;
  try {
    user = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 2. Rate limit
  const rateLimitKey = getRateLimitKey(request, user.id);
  const rateCheck = checkRateLimit(rateLimitKey, 'analyze');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before analysing another document.' },
      { status: 429, headers: rateCheck.headers }
    );
  }

  // 3. Parse & validate input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { documentText, sector, documentType, documentName } = body;

  if (!documentText || typeof documentText !== 'string') {
    return NextResponse.json({ error: 'documentText is required' }, { status: 400 });
  }
  if (!sector || !isValidSector(sector)) {
    return NextResponse.json(
      { error: `Invalid sector. Must be one of: ${Object.keys(SECTORS).join(', ')}` },
      { status: 400 }
    );
  }

  const sectorConfig = SECTORS[sector as SectorId];

  // 3. RAG context retrieval
  let legislationContext = '';
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
        searchMethod: 'bm25',
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
            `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}${
              r.sectionTitle ? ` (${r.sectionTitle})` : ''
            }\n${r.content}`
        )
        .join('\n\n---\n\n')}`;
    }
  } catch (ragError) {
    console.error('RAG search error in analyze:', ragError);
  }

  // 4. Build prompt
  const prompt = `You are an expert Australian compliance auditor specializing in ${sectorConfig.fullName}. 
    
Analyze this ${documentType || 'policy'} document for compliance with ${sectorConfig.fullName}, regulated by ${sectorConfig.authority}.

KEY COMPLIANCE AREAS TO CHECK:
${sectorConfig.keyAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}
${legislationContext}

DOCUMENT TEXT:
"""
${documentText.substring(0, 20000)}
"""

Analyze thoroughly against the legislation provided and respond in this exact JSON format (no markdown, no code blocks):
{
  "sector": "${sector}",
  "sectorName": "${sectorConfig.name}",
  "documentType": "${documentType || 'Policy Document'}",
  "overallScore": <number 0-100>,
  "overallStatus": "<COMPLIANT|PARTIAL|NON_COMPLIANT|CRITICAL>",
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "summary": "<2-3 sentence executive summary>",
  "findings": [
    {
      "id": <number>,
      "area": "<compliance area from list above>",
      "title": "<specific finding title>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "status": "<COMPLIANT|GAP|PARTIAL|NOT_ADDRESSED>",
      "description": "<detailed explanation>",
      "evidence": "<quote from document if found, or null>",
      "regulation": "<specific regulation/standard reference>",
      "recommendation": "<specific action to remediate>",
      "priority": <number 1-10>
    }
  ],
  "strengths": [{"area": "<area>", "description": "<what's done well>"}],
  "criticalGaps": ["<list of most urgent gaps>"],
  "actionPlan": [{"priority": <1-5>, "action": "<specific action>", "timeframe": "<immediate|7 days|30 days|90 days>", "responsibility": "<who should action this>"}],
  "complianceByArea": [{"area": "<compliance area>", "score": <0-100>, "status": "<COMPLIANT|PARTIAL|GAP>"}],
  "regulatoryReferences": [{"reference": "<specific section/clause>", "description": "<what it requires>"}],
  "nextAuditFocus": ["<areas to focus on in next review>"]
}`;

  // 5. Call LLM (single shared client)
  let llmResult;
  try {
    llmResult = await llmComplete({
      system: 'You are an expert Australian compliance auditor. Respond only in valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
      temperature: 0.3,
    });
  } catch (error: any) {
    console.error('LLM error:', error);
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 502 });
  }

  // 6. Validate AI output through guardrails
  const validation = validateAnalysisOutput(llmResult.content, sector);

  if (!validation.valid) {
    console.error('Analysis validation failed:', validation.warnings);
    return NextResponse.json({ error: 'AI produced invalid output. Please try again.' }, { status: 502 });
  }

  if (validation.warnings.length > 0) {
    console.warn('Analysis validation warnings:', validation.warnings);
  }

  const analysis = validation.data;
  analysis.regulatoryAuthority = sectorConfig.authority;

  // 7. Persist analysis
  const saved = await saveAnalysis({
    user_id: user.id,
    sector,
    document_type: documentType || 'Policy Document',
    document_name: documentName || 'Untitled',
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

  // 8. Save findings as trackable action items (FIXES THE BROKEN PIPELINE)
  const findingsSaved = await saveAnalysisFindings(
    user.id,
    saved?.id ?? '',
    analysis.findings ?? [],
    sector,
    documentName
  );

  analysis.findingsCreated = findingsSaved;

  // 9. Notify user
  const criticalCount = (analysis.findings ?? []).filter(
    (f: any) => f.severity === 'CRITICAL'
  ).length;
  await notifyAnalysisComplete(
    user.id,
    analysis.overallScore,
    sectorConfig?.name ?? sector,
    documentName || 'Untitled',
    findingsSaved,
    criticalCount,
  ).catch(() => {}); // Don't fail the request if notification fails

  return NextResponse.json(analysis);
}
