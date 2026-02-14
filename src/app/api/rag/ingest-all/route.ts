import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chunkLegalDocument } from '@/lib/rag/chunker'
import { WHS_STANDARDS } from '@/lib/rag/sample-data/whs-standards'
import { AGED_CARE_STANDARDS } from '@/lib/rag/sample-data/aged-care-standards'
import { HVNL_STANDARDS } from '@/lib/rag/sample-data/hvnl-standards'
import { NSQHS_STANDARDS } from '@/lib/rag/sample-data/nsqhs-standards'
import { WHS_CONSTRUCTION } from '@/lib/rag/sample-data/whs-construction'
import { NDIS_CODE_OF_CONDUCT } from '@/lib/rag/sample-data/ndis-code-of-conduct'
import { FAIR_WORK_ACT } from '@/lib/rag/sample-data/fair-work-act'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ALL_LEGISLATION = [
  WHS_STANDARDS,
  AGED_CARE_STANDARDS,
  HVNL_STANDARDS,
  NSQHS_STANDARDS,
  WHS_CONSTRUCTION,
  NDIS_CODE_OF_CONDUCT,
  FAIR_WORK_ACT,
]

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const results: any[] = []

    for (const legislation of ALL_LEGISLATION) {
      console.log(`Processing: ${legislation.name}`)

      // Check if already exists
      const { data: existing } = await supabase
        .from('legislation_sources')
        .select('id')
        .eq('name', legislation.name)
        .single()

      if (existing) {
        console.log(`Skipping ${legislation.name} - already exists`)
        results.push({ name: legislation.name, status: 'skipped', reason: 'already exists' })
        continue
      }

      // Create source
      const { data: source, error: sourceError } = await supabase
        .from('legislation_sources')
        .insert({
          name: legislation.name,
          sector: legislation.sector,
          source_type: legislation.sourceType,
          source_url: legislation.sourceUrl,
          version: legislation.version,
          effective_date: legislation.effectiveDate,
        })
        .select()
        .single()

      if (sourceError) {
        console.error(`Error creating source for ${legislation.name}:`, sourceError)
        results.push({ name: legislation.name, status: 'error', error: sourceError.message })
        continue
      }

      // Chunk the document
      const chunks = chunkLegalDocument(legislation.content)
      console.log(`Created ${chunks.length} chunks for ${legislation.name}`)

      // Insert chunks
      const chunkRecords = chunks.map((chunk, index) => ({
        source_id: source.id,
        chunk_index: index,
        content: chunk.content,
        section_title: chunk.sectionTitle,
        section_number: chunk.sectionNumber,
        metadata: {},
      }))

      const batchSize = 100
      let insertedChunks = 0

      for (let i = 0; i < chunkRecords.length; i += batchSize) {
        const batch = chunkRecords.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('legislation_chunks')
          .insert(batch)

        if (insertError) {
          console.error(`Error inserting chunks for ${legislation.name}:`, insertError)
        } else {
          insertedChunks += batch.length
        }
      }

      results.push({
        name: legislation.name,
        status: 'success',
        sourceId: source.id,
        chunksCreated: insertedChunks,
      })
    }

    // Clear the BM25 search cache
    const { clearSearchCache } = await import('@/lib/enhanced-rag-search')
    clearSearchCache()

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      totalSuccess: results.filter(r => r.status === 'success').length,
      totalSkipped: results.filter(r => r.status === 'skipped').length,
    })

  } catch (error: any) {
    console.error('Bulk ingestion error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to ingest all legislation',
    legislation: ALL_LEGISLATION.map(l => ({ name: l.name, sector: l.sector })),
  })
}
