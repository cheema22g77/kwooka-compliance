import { generateEmbedding } from './embeddings'

export interface SearchResult {
  id: string
  content: string
  sectionTitle?: string
  sectionNumber?: string
  sourceName: string
  sourceType: string
  sector: string
  similarity: number
}

export interface SearchOptions {
  sector?: string
  threshold?: number
  limit?: number
}

// Direct database search using text matching
export async function keywordSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { sector, limit = 10 } = options
  
  // Import supabase client dynamically to avoid SSR issues
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all chunks and filter manually (simpler approach)
  let dbQuery = supabase
    .from('legislation_chunks')
    .select(`
      id,
      content,
      section_title,
      section_number,
      legislation_sources (
        name,
        source_type,
        sector
      )
    `)
    .limit(100)

  const { data, error } = await dbQuery

  if (error) {
    console.error('Database search error:', error)
    return []
  }

  if (!data || data.length === 0) {
    console.log('No data found in legislation_chunks table')
    return []
  }

  // Extract keywords from query
  const keywords = query.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2)

  // Score each chunk based on keyword matches
  const scoredResults = data
    .filter((row: any) => {
      // Filter by sector if provided
      if (sector && row.legislation_sources?.sector !== sector) {
        return false
      }
      return true
    })
    .map((row: any) => {
      const content = (row.content || '').toLowerCase()
      const title = (row.section_title || '').toLowerCase()
      
      // Count keyword matches
      let score = 0
      for (const keyword of keywords) {
        if (content.includes(keyword)) score += 2
        if (title.includes(keyword)) score += 3
      }
      
      return {
        id: row.id,
        content: row.content,
        sectionTitle: row.section_title,
        sectionNumber: row.section_number,
        sourceName: row.legislation_sources?.name || 'NDIS Practice Standards',
        sourceType: row.legislation_sources?.source_type || 'standard',
        sector: row.legislation_sources?.sector || 'ndis',
        similarity: Math.min(score / 10, 1), // Normalize to 0-1
        score,
      }
    })
    .filter((r: any) => r.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit)

  return scoredResults
}

// Main search function - uses keyword search since OpenAI is unavailable
export async function searchLegislation(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  console.log('Searching for:', query)
  
  // Use keyword search directly
  const results = await keywordSearch(query, options)
  
  console.log('Found', results.length, 'results')
  
  return results
}

// Search with multiple queries (for complex questions)
export async function multiQuerySearch(
  queries: string[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = []
  const seenIds = new Set<string>()

  for (const query of queries) {
    const results = await searchLegislation(query, options)
    
    for (const result of results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id)
        allResults.push(result)
      }
    }
  }

  return allResults.sort((a, b) => b.similarity - a.similarity)
}

// Expand query for better recall
export function expandQuery(query: string, sector?: string): string[] {
  const queries = [query]
  
  const sectorTerms: Record<string, string[]> = {
    ndis: ['NDIS', 'participant', 'disability', 'support', 'provider', 'practice standard'],
    transport: ['HVNL', 'heavy vehicle', 'fatigue', 'chain of responsibility'],
    healthcare: ['NSQHS', 'clinical', 'patient', 'safety', 'quality'],
    aged_care: ['aged care', 'resident', 'quality standard', 'dignity'],
    workplace: ['WHS', 'workplace', 'safety', 'hazard', 'risk', 'PCBU'],
    construction: ['construction', 'SWMS', 'high risk', 'scaffolding'],
  }

  if (sector && sectorTerms[sector]) {
    queries.push(query + ' ' + sectorTerms[sector].slice(0, 3).join(' '))
  }

  return queries
}
