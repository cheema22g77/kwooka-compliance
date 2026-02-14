import { createClient } from '@supabase/supabase-js';
import { BM25Search, TFIDFSearch } from './bm25-search';

interface ChunkResult {
  id: string;
  content: string;
  chunk_index?: number;
  section_title?: string;
  section_number?: string;
  source_id?: string;
  metadata?: Record<string, unknown>;
  legislation_sources?: Array<{
    name: string;
    source_type: string;
    sector?: string;
  }>;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  matchedTerms: string[];
  source: {
    title: string;
    type: string;
    sector?: string;
  };
  sectionTitle?: string;
  sectionNumber?: string;
  chunkIndex?: number;
}

interface SearchOptions {
  topK?: number;
  expandQuery?: boolean;
  searchMethod?: 'bm25' | 'tfidf' | 'hybrid';
  minScore?: number;
  sector?: string;
}

let bm25Index: BM25Search | null = null;
let tfidfIndex: TFIDFSearch | null = null;
let cachedChunks: ChunkResult[] = [];
let lastIndexTime: number = 0;
const INDEX_CACHE_DURATION = 5 * 60 * 1000;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Server-side only — never use service role key in shared code
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (typeof window !== 'undefined') {
    throw new Error('RAG search can only be called server-side');
  }
  
  if (!url || !key) {
    throw new Error('Supabase server credentials not configured');
  }
  
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function loadAndIndexChunks(): Promise<void> {
  const now = Date.now();

  if (bm25Index && tfidfIndex && (now - lastIndexTime) < INDEX_CACHE_DURATION) {
    return;
  }

  console.log('Loading and indexing legislation chunks...');

  const supabase = getSupabaseClient();

  const { data: chunks, error } = await supabase
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
    .limit(500);

  if (error) {
    console.error('Error fetching chunks:', error);
    throw new Error('Failed to load legislation chunks: ' + error.message);
  }

  if (!chunks || chunks.length === 0) {
    console.warn('No chunks found in database');
    cachedChunks = [];
    return;
  }

  cachedChunks = chunks as ChunkResult[];
  console.log(`Loaded ${cachedChunks.length} chunks`);

  const documents = cachedChunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    metadata: {
      sectionTitle: chunk.section_title,
      sectionNumber: chunk.section_number,
      source: chunk.legislation_sources
    }
  }));

  bm25Index = new BM25Search({ k1: 1.5, b: 0.75 });
  bm25Index.indexDocuments(documents);

  tfidfIndex = new TFIDFSearch();
  tfidfIndex.indexDocuments(documents);

  lastIndexTime = now;
  console.log('Indexing complete');
}

export async function searchLegislation(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    topK = 5,
    expandQuery = true,
    searchMethod = 'bm25',
    minScore = 0.1,
    sector
  } = options;

  await loadAndIndexChunks();

  if (cachedChunks.length === 0) {
    return [];
  }

  const searchQuery = expandQuery
    ? BM25Search.expandNDISQuery(query)
    : query;

  let results;

  switch (searchMethod) {
    case 'tfidf':
      results = tfidfIndex!.search(searchQuery, topK * 2);
      break;

    case 'hybrid':
      const bm25Results = bm25Index!.search(searchQuery, topK * 2);
      const tfidfResults = tfidfIndex!.search(searchQuery, topK * 2);

      const scoreMap = new Map<string, { bm25: number; tfidf: number; matchedTerms: string[] }>();

      const maxBM25 = Math.max(...bm25Results.map(r => r.score), 1);
      const maxTFIDF = Math.max(...tfidfResults.map(r => r.score), 1);

      for (const r of bm25Results) {
        scoreMap.set(r.id, {
          bm25: r.score / maxBM25,
          tfidf: 0,
          matchedTerms: r.matchedTerms
        });
      }

      for (const r of tfidfResults) {
        const existing = scoreMap.get(r.id);
        if (existing) {
          existing.tfidf = r.score / maxTFIDF;
          existing.matchedTerms = Array.from(new Set([...existing.matchedTerms, ...r.matchedTerms]));
        } else {
          scoreMap.set(r.id, {
            bm25: 0,
            tfidf: r.score / maxTFIDF,
            matchedTerms: r.matchedTerms
          });
        }
      }

      results = Array.from(scoreMap.entries())
        .map(([id, scores]) => {
          const chunk = cachedChunks.find(c => c.id === id)!;
          return {
            id,
            content: chunk.content,
            score: scores.bm25 * 0.6 + scores.tfidf * 0.4,
            matchedTerms: scores.matchedTerms,
            metadata: {
              sectionTitle: chunk.section_title,
              sectionNumber: chunk.section_number,
              source: chunk.legislation_sources
            }
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK * 2);
      break;

    case 'bm25':
    default:
      results = bm25Index!.search(searchQuery, topK * 2);
  }

  let filtered = results.filter(r => r.score >= minScore);
  
  if (sector) {
    filtered = filtered.filter(r => {
      const chunk = cachedChunks.find(c => c.id === r.id);
      return chunk?.legislation_sources?.[0]?.sector === sector;
    });
  }

  return filtered
    .slice(0, topK)
    .map(r => {
      const chunk = cachedChunks.find(c => c.id === r.id)!;
      const source = chunk.legislation_sources?.[0];

      return {
        id: r.id,
        content: r.content,
        score: r.score,
        matchedTerms: r.matchedTerms,
        source: {
          title: source?.name || 'NDIS Practice Standards',
          type: source?.source_type || 'standard',
          sector: source?.sector || 'ndis'
        },
        sectionTitle: chunk.section_title,
        sectionNumber: chunk.section_number,
        chunkIndex: chunk.chunk_index
      };
    });
}

export function clearSearchCache(): void {
  bm25Index = null;
  tfidfIndex = null;
  cachedChunks = [];
  lastIndexTime = 0;
}

export async function getIndexStats(): Promise<{
  totalChunks: number;
  indexed: boolean;
  cacheAge: number;
}> {
  await loadAndIndexChunks();

  return {
    totalChunks: cachedChunks.length,
    indexed: bm25Index !== null,
    cacheAge: Date.now() - lastIndexTime
  };
}