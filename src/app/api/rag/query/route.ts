import { NextRequest, NextResponse } from 'next/server'
import { generateRAGResponse } from '@/lib/rag/generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, sector } = body

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    const response = await generateRAGResponse(question, sector)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('RAG query error:', error)
    return NextResponse.json(
      { error: error.message || 'Query failed' },
      { status: 500 }
    )
  }
}
