import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chunkLegalDocument } from '@/lib/rag/chunker'
import { generateEmbeddings } from '@/lib/rag/embeddings'

// Use service role for ingestion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { 
      name, 
      sector, 
      sourceType, 
      sourceUrl, 
      content,
      version,
      effectiveDate 
    } = body

    if (!name || !sector || !sourceType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sector, sourceType, content' },
        { status: 400 }
      )
    }

    // 1. Create legislation source
    const { data: source, error: sourceError } = await supabase
      .from('legislation_sources')
      .insert({
        name,
        sector,
        source_type: sourceType,
        source_url: sourceUrl,
        version,
        effective_date: effectiveDate,
      })
      .select()
      .single()

    if (sourceError) {
      throw new Error('Failed to create source: ' + sourceError.message)
    }

    // 2. Chunk the document
    const chunks = chunkLegalDocument(content)
    console.log('Created ' + chunks.length + ' chunks for ' + name)

    // 3. Generate embeddings in batches
    const chunkTexts = chunks.map(c => c.content)
    const embeddings = await generateEmbeddings(chunkTexts)
    console.log('Generated ' + embeddings.length + ' embeddings')

    // 4. Insert chunks with embeddings
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: source.id,
      chunk_index: index,
      content: chunk.content,
      section_title: chunk.sectionTitle,
      section_number: chunk.sectionNumber,
      page_number: chunk.pageNumber,
      embedding: embeddings[index],
      metadata: chunk.metadata || {},
    }))

    // Insert in batches of 100
    const batchSize = 100
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('legislation_chunks')
        .insert(batch)

      if (insertError) {
        throw new Error('Failed to insert chunks: ' + insertError.message)
      }
    }

    return NextResponse.json({
      success: true,
      sourceId: source.id,
      chunksCreated: chunks.length,
      message: 'Successfully ingested ' + name + ' with ' + chunks.length + ' chunks',
    })

  } catch (error: any) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { error: error.message || 'Ingestion failed' },
      { status: 500 }
    )
  }
}
