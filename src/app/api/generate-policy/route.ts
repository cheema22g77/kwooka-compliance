import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { policyType, companyName, companyType, standardNumber } = body

    if (!policyType || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Generate a brief ${policyType} for "${companyName}" (${companyType}). Aligned with NDIS Standard #${standardNumber}. Include: PURPOSE, SCOPE, POLICY STATEMENT, RESPONSIBILITIES, KEY PROCEDURES, REVIEW. Keep concise. Use [DATE], [NAME] as placeholders.`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'AI error: ' + err }, { status: 500 })
    }

    const data = await response.json()
    const policy = data.content?.[0]?.text || ''

    return NextResponse.json({ policy })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
