import { NextRequest, NextResponse } from 'next/server'
import { legislationMonitor, LEGISLATION_SOURCES } from '@/lib/legislation-monitor'
import { createClient } from '@supabase/supabase-js'

// GET - List all legislation sources and their status
export async function GET(request: NextRequest) {
  try {
    const sources = await legislationMonitor.getSourceStatus()
    
    return NextResponse.json({
      sources,
      monitoredUrls: LEGISLATION_SOURCES,
      totalSources: sources.length
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Update legislation content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sourceName, content, version } = body

    if (action === 'update' && sourceName && content) {
      const result = await legislationMonitor.updateLegislationContent(
        sourceName,
        content,
        version
      )
      return NextResponse.json(result)
    }

    if (action === 'check') {
      // Check all sources for updates
      const results = []
      for (const source of LEGISLATION_SOURCES) {
        const checkResult = await legislationMonitor.checkForUpdates(source.checkUrl)
        results.push({
          name: source.name,
          url: source.checkUrl,
          ...checkResult
        })
      }
      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove a legislation source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceName = searchParams.get('name')

    if (!sourceName) {
      return NextResponse.json({ error: 'Source name required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(url, key)

    // Find and delete
    const { data: source } = await supabase
      .from('legislation_sources')
      .select('id')
      .eq('name', sourceName)
      .single()

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Delete chunks first
    await supabase.from('legislation_chunks').delete().eq('source_id', source.id)
    
    // Delete source
    await supabase.from('legislation_sources').delete().eq('id', source.id)

    return NextResponse.json({ success: true, message: `Deleted ${sourceName}` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
