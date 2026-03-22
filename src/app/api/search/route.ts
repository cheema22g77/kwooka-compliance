import { NextRequest, NextResponse } from 'next/server'
import { searchLegislation, getIndexStats, clearSearchCache } from '@/lib/enhanced-rag-search'
import { auditLogger } from '@/lib/audit-logger'
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const timer = auditLogger.startTimer()
  
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const { allowed, headers } = checkRateLimit(rateLimitKey, 'search')
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      )
    }

    const body = await request.json()
    const { 
      query, 
      topK = 5, 
      expandQuery = true,
      searchMethod = 'bm25',
      minScore = 0.1,
      sector
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400, headers }
      )
    }

    const results = await searchLegislation(query, {
      topK,
      expandQuery,
      searchMethod,
      minScore,
      sector
    })

    const responseTime = timer()

    // Audit log
    await auditLogger.logSearch({
      query,
      sector,
      resultsCount: results.length,
      searchMethod,
      responseTime,
      success: true
    })

    return NextResponse.json({
      success: true,
      query,
      resultsCount: results.length,
      searchMethod,
      results
    }, { headers })

  } catch (error) {
    const responseTime = timer()
    console.error('Search error:', error)
    
    await auditLogger.logSearch({
      query: 'unknown',
      resultsCount: 0,
      searchMethod: 'unknown',
      responseTime,
      success: false
    })

    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'stats') {
    try {
      const stats = await getIndexStats()
      return NextResponse.json(stats)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get stats', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

  if (action === 'clear-cache') {
    clearSearchCache()
    return NextResponse.json({ success: true, message: 'Cache cleared' })
  }

  return NextResponse.json({ 
    message: 'NDIS Legislation Search API',
    endpoints: {
      'POST /api/search': 'Search legislation chunks',
      'GET /api/search?action=stats': 'Get index statistics',
      'GET /api/search?action=clear-cache': 'Clear search cache'
    }
  })
}
