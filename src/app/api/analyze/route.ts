import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { searchLegislation } from '@/lib/enhanced-rag-search'

const SECTOR_CONFIG = {
  ndis: {
    name: 'NDIS',
    fullName: 'NDIS Practice Standards',
    authority: 'NDIS Quality and Safeguards Commission',
    keyAreas: [
      'Rights and Responsibilities',
      'Governance and Operational Management', 
      'Provision of Supports',
      'Support Provision Environment',
      'Worker Screening',
      'Incident Management',
      'Complaints Management',
      'Restrictive Practices'
    ]
  },
  transport: {
    name: 'Transport',
    fullName: 'Heavy Vehicle National Law (HVNL)',
    authority: 'National Heavy Vehicle Regulator (NHVR)',
    keyAreas: ['Chain of Responsibility', 'Fatigue Management', 'Speed Compliance', 'Mass & Loading', 'Vehicle Standards', 'Driver Competency', 'Journey Management', 'Record Keeping']
  },
  healthcare: {
    name: 'Healthcare',
    fullName: 'National Safety and Quality Health Service Standards',
    authority: 'Australian Commission on Safety and Quality in Health Care',
    keyAreas: ['Clinical Governance', 'Partnering with Consumers', 'Infection Prevention', 'Medication Safety', 'Patient Identification', 'Clinical Handover', 'Blood Management', 'Recognising Deterioration']
  },
  aged_care: {
    name: 'Aged Care',
    fullName: 'Aged Care Quality Standards',
    authority: 'Aged Care Quality and Safety Commission',
    keyAreas: ['Consumer Dignity and Choice', 'Ongoing Assessment and Planning', 'Personal Care and Clinical Care', 'Services and Supports', 'Organisation Service Environment', 'Feedback and Complaints', 'Human Resources', 'Organisational Governance']
  },
  workplace: {
    name: 'Workplace Safety',
    fullName: 'Work Health and Safety Act & Regulations',
    authority: 'WorkSafe / SafeWork Australia',
    keyAreas: ['PCBU Duties', 'Risk Management', 'Consultation', 'Training & Competency', 'Incident Notification', 'Hazardous Work', 'Emergency Procedures', 'Worker Health Monitoring']
  },
  construction: {
    name: 'Construction',
    fullName: 'WHS Regulations - Construction Work',
    authority: 'WorkSafe',
    keyAreas: ['Safe Work Method Statements', 'Principal Contractor Duties', 'High Risk Work Licensing', 'Working at Heights', 'Excavation Safety', 'Asbestos Management', 'Electrical Safety', 'Plant & Equipment']
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentText, sector, documentType, documentName, userId } = await request.json()

    if (!documentText || !sector) {
      return NextResponse.json({ error: 'Missing document text or sector' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const sectorConfig = SECTOR_CONFIG[sector as keyof typeof SECTOR_CONFIG]
    if (!sectorConfig) {
      return NextResponse.json({ error: 'Invalid sector' }, { status: 400 })
    }

    // Search for relevant legislation using BM25
    let legislationContext = "";
    try {
      const searchQueries = [
        `${sector} compliance requirements`,
        ...sectorConfig.keyAreas.slice(0, 3)
      ];
      
      const allResults = [];
      for (const query of searchQueries) {
        const results = await searchLegislation(query, {
          topK: 5,
          expandQuery: true,
          searchMethod: 'bm25',
          sector,
        });
        allResults.push(...results);
      }
      
      // Deduplicate by ID
      const uniqueResults = Array.from(
        new Map(allResults.map(r => [r.id, r])).values()
      ).slice(0, 15);

      if (uniqueResults.length > 0) {
        legislationContext = `\n\nRELEVANT LEGISLATION FROM DATABASE:\n${uniqueResults.map((r, i) => 
          `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}${r.sectionTitle ? ` (${r.sectionTitle})` : ''}\n${r.content}`
        ).join('\n\n---\n\n')}`;
      }
    } catch (ragError) {
      console.error("RAG search error in analyze:", ragError);
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
      "regulation": "<specific regulation/standard reference from the legislation provided>",
      "recommendation": "<specific action to remediate>",
      "priority": <number 1-10, 1 being highest priority>
    }
  ],
  "strengths": [{"area": "<area>", "description": "<what's done well>"}],
  "criticalGaps": ["<list of most urgent gaps requiring immediate attention>"],
  "actionPlan": [{"priority": <1-5>, "action": "<specific action>", "timeframe": "<immediate|7 days|30 days|90 days>", "responsibility": "<who should action this>"}],
  "complianceByArea": [{"area": "<compliance area>", "score": <0-100>, "status": "<COMPLIANT|PARTIAL|GAP>"}],
  "regulatoryReferences": [{"reference": "<specific section/clause from legislation>", "description": "<what it requires>"}],
  "nextAuditFocus": ["<areas to focus on in next review>"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    let jsonText = content.text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonText = jsonMatch[1]
    jsonText = jsonText.trim()
    
    const analysis = JSON.parse(jsonText)
    analysis.analyzedAt = new Date().toISOString()
    analysis.regulatoryAuthority = sectorConfig.authority

    // Save to Supabase if userId is provided
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        await supabase.from('compliance_analyses').insert({
          user_id: userId,
          sector: sector,
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
        })
      } catch (dbError) {
        console.error('Error saving to database:', dbError)
      }
    }
    
    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed', details: error.toString() }, { status: 500 })
  }
}
