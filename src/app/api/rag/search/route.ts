import { NextRequest, NextResponse } from 'next/server'
import { searchLegislation } from '@/lib/rag/search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, sector, threshold, limit } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const results = await searchLegislation(query, {
      sector,
      threshold: threshold || 0.7,
      limit: limit || 10,
    })

    return NextResponse.json({ results })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
