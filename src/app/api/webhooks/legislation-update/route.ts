import { NextRequest, NextResponse } from 'next/server'
import { legislationMonitor } from '@/lib/legislation-monitor'

// Webhook secret for security
const WEBHOOK_SECRET = process.env.LEGISLATION_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceName, content, version, source } = body

    // Validate required fields
    if (!sourceName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceName, content' },
        { status: 400 }
      )
    }

    // Update the legislation
    const result = await legislationMonitor.updateLegislationContent(
      sourceName,
      content,
      version
    )

    // Log the webhook call
    console.log(`[WEBHOOK] Legislation update received for: ${sourceName}`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
