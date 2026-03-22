import { createClient } from '@supabase/supabase-js'
import { chunkLegalDocument } from '@/lib/rag/chunker'
import { clearSearchCache } from '@/lib/enhanced-rag-search'

interface LegislationSource {
  id: string
  name: string
  sector: string
  sourceUrl: string
  lastChecked?: string
  lastUpdated?: string
  contentHash?: string
}

interface UpdateResult {
  source: string
  status: 'updated' | 'unchanged' | 'error' | 'new'
  message: string
  chunksAffected?: number
}

// Simple hash function to detect content changes
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

// Official legislation URLs to monitor
export const LEGISLATION_SOURCES = [
  {
    name: 'NDIS Practice Standards',
    sector: 'ndis',
    checkUrl: 'https://www.ndiscommission.gov.au/providers/registered-ndis-providers/provider-obligations-and-requirements/ndis-practice-standards',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'NDIS Code of Conduct',
    sector: 'ndis',
    checkUrl: 'https://www.ndiscommission.gov.au/about/ndis-code-conduct',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'Work Health and Safety Act 2020 (WA)',
    sector: 'workplace',
    checkUrl: 'https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_1120_homepage.html',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'Fair Work Act 2009',
    sector: 'workplace',
    checkUrl: 'https://www.legislation.gov.au/Series/C2009A00028',
    rssUrl: 'https://www.legislation.gov.au/feeds/asx/C2009A00028',
    apiUrl: null,
  },
  {
    name: 'Aged Care Quality Standards',
    sector: 'aged_care',
    checkUrl: 'https://www.agedcarequality.gov.au/providers/standards',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'Heavy Vehicle National Law',
    sector: 'transport',
    checkUrl: 'https://www.nhvr.gov.au/law-policies/heavy-vehicle-national-law-and-regulations',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'National Safety and Quality Health Service Standards',
    sector: 'healthcare',
    checkUrl: 'https://www.safetyandquality.gov.au/standards/nsqhs-standards',
    rssUrl: null,
    apiUrl: null,
  },
  {
    name: 'WHS Construction Regulations',
    sector: 'construction',
    checkUrl: 'https://www.legislation.wa.gov.au/legislation/statutes.nsf/law_s52057.html',
    rssUrl: null,
    apiUrl: null,
  },
]

export class LegislationMonitor {
  private supabase

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    this.supabase = createClient(url, key)
  }

  // Check if a page has been modified (using Last-Modified header or content hash)
  async checkForUpdates(sourceUrl: string, lastHash?: string): Promise<{
    hasChanges: boolean
    newHash?: string
    lastModified?: string
  }> {
    try {
      const response = await fetch(sourceUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Kwooka-Compliance-Monitor/1.0'
        }
      })

      const lastModified = response.headers.get('last-modified')
      
      // If we can get the content, hash it to detect changes
      const fullResponse = await fetch(sourceUrl)
      const content = await fullResponse.text()
      const newHash = hashContent(content)

      return {
        hasChanges: lastHash ? newHash !== lastHash : true,
        newHash,
        lastModified: lastModified || undefined
      }
    } catch (error) {
      console.error(`Error checking ${sourceUrl}:`, error)
      return { hasChanges: false }
    }
  }

  // Log a check to the database
  async logCheck(sourceName: string, status: string, details?: string) {
    try {
      await this.supabase.from('legislation_update_logs').insert({
        source_name: sourceName,
        status,
        details,
        checked_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log check:', error)
    }
  }

  // Get all sources and their last check status
  async getSourceStatus(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('legislation_sources')
      .select('id, name, sector, source_url, version, updated_at, metadata')
      .order('name')

    if (error) throw error
    return data || []
  }

  // Update content hash for a source
  async updateSourceHash(sourceId: string, hash: string) {
    await this.supabase
      .from('legislation_sources')
      .update({ 
        metadata: { contentHash: hash, lastChecked: new Date().toISOString() }
      })
      .eq('id', sourceId)
  }

  // Manual update: replace content for a source
  async updateLegislationContent(
    sourceName: string, 
    newContent: string,
    version?: string
  ): Promise<UpdateResult> {
    try {
      // Find the source
      const { data: source, error: findError } = await this.supabase
        .from('legislation_sources')
        .select('id, name')
        .eq('name', sourceName)
        .single()

      if (findError || !source) {
        return { source: sourceName, status: 'error', message: 'Source not found' }
      }

      // Delete old chunks
      const { error: deleteError } = await this.supabase
        .from('legislation_chunks')
        .delete()
        .eq('source_id', source.id)

      if (deleteError) {
        return { source: sourceName, status: 'error', message: 'Failed to delete old chunks' }
      }

      // Create new chunks
      const chunks = chunkLegalDocument(newContent)
      const chunkRecords = chunks.map((chunk, index) => ({
        source_id: source.id,
        chunk_index: index,
        content: chunk.content,
        section_title: chunk.sectionTitle,
        section_number: chunk.sectionNumber,
        metadata: {},
      }))

      const { error: insertError } = await this.supabase
        .from('legislation_chunks')
        .insert(chunkRecords)

      if (insertError) {
        return { source: sourceName, status: 'error', message: 'Failed to insert new chunks' }
      }

      // Update source metadata
      const newHash = hashContent(newContent)
      await this.supabase
        .from('legislation_sources')
        .update({
          version: version || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          metadata: { contentHash: newHash, lastUpdated: new Date().toISOString() }
        })
        .eq('id', source.id)

      // Clear search cache
      clearSearchCache()

      await this.logCheck(sourceName, 'updated', `Updated with ${chunks.length} chunks`)

      return {
        source: sourceName,
        status: 'updated',
        message: `Successfully updated with ${chunks.length} chunks`,
        chunksAffected: chunks.length
      }
    } catch (error: any) {
      return { source: sourceName, status: 'error', message: error.message }
    }
  }
}

export const legislationMonitor = new LegislationMonitor()
