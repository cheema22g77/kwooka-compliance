import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { documentText, standardId, standardName, requirements } = await request.json()

    if (!documentText || !standardId) {
      return NextResponse.json({ error: 'Missing document text or standard ID' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `You are an NDIS compliance expert auditor. Analyze this policy document against NDIS Practice Standard: "${standardName}".

REQUIREMENTS TO CHECK:
${requirements.map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.description}\n   Evidence examples: ${r.evidence_examples}`).join('\n\n')}

DOCUMENT TEXT:
"""
${documentText.substring(0, 15000)}
"""

Analyze the document and respond in this exact JSON format (no markdown):
{
  "overallScore": <number 0-100>,
  "overallStatus": "<COMPLIANT|PARTIAL|NON_COMPLIANT>",
  "summary": "<2-3 sentence summary>",
  "requirements": [
    {
      "requirementNumber": <number>,
      "title": "<requirement title>",
      "status": "<MET|PARTIAL|NOT_MET>",
      "foundInDocument": <true|false>,
      "relevantQuote": "<quote from document or null>",
      "explanation": "<why this status>",
      "recommendation": "<what to add/fix or null if MET>"
    }
  ],
  "gaps": ["<list of major gaps>"],
  "strengths": ["<list of strengths>"],
  "recommendations": ["<prioritized list of actions>"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    let jsonText = content.text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonText = jsonMatch[1]
    
    const analysis = JSON.parse(jsonText.trim())
    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
