import Anthropic from '@anthropic-ai/sdk'
import { searchLegislation as bm25Search } from '@/lib/enhanced-rag-search'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface RAGResponse {
  answer: string
  citations: Citation[]
  confidence: 'high' | 'medium' | 'low'
}

export interface Citation {
  content: string
  source: string
  section?: string
  similarity: number
}

// Generate answer with RAG using BM25 search
export async function generateRAGResponse(
  question: string,
  sector?: string
): Promise<RAGResponse> {
  // Use BM25 search with query expansion
  let results = await bm25Search(question, {
    topK: 10,
    expandQuery: true,
    searchMethod: 'bm25',
    minScore: 0.1,
    sector,
  })

  // If low results, try hybrid search
  if (results.length < 3) {
    console.log('Trying hybrid search for better coverage')
    const hybridResults = await bm25Search(question, {
      topK: 10,
      expandQuery: true,
      searchMethod: 'hybrid',
      minScore: 0.05,
      sector,
    })
    if (hybridResults.length > results.length) {
      results = hybridResults
    }
  }

  if (results.length === 0) {
    return {
      answer: "I couldn't find specific legislation or standards related to your question in the database. This might be because:\n\n1. The specific topic hasn't been ingested yet\n2. Try using different keywords\n3. The legislation for this sector may not be available\n\nYou can check the RAG Admin page to see what legislation sources are available.",
      citations: [],
      confidence: 'low',
    }
  }

  // Build context from results
  const context = buildContext(results)
  
  // Generate response with Claude
  const systemPrompt = `You are an expert Australian compliance advisor specializing in NDIS, healthcare, aged care, workplace safety, transport, and construction regulations.

Your role is to:
1. Answer questions accurately based on the provided legislation and standards context
2. Always cite the specific section/standard when referencing requirements
3. Be precise and practical in your advice
4. Highlight any critical compliance requirements or deadlines
5. If the context doesn't fully answer the question, acknowledge what's missing

Format your response with:
- Clear, direct answers
- Specific citations in [Source: Section X.X] format
- Practical implications for compliance
- Any related requirements they should be aware of`

  const userPrompt = `Context from Australian legislation and standards:

${context}

---

Question: ${question}

Please provide a comprehensive answer based on the legislation context above. Include specific citations.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const answer = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''

    // Calculate confidence based on BM25 scores
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    const maxScore = Math.max(...results.map(r => r.score))
    const confidence = maxScore > 10 ? 'high' : maxScore > 5 ? 'medium' : 'low'

    // Build citations
    const citations: Citation[] = results.slice(0, 5).map(result => ({
      content: result.content.length > 300 ? result.content.slice(0, 300) + '...' : result.content,
      source: result.source.title,
      section: result.sectionNumber || result.sectionTitle,
      similarity: Math.min(result.score / 15, 1), // Normalize BM25 score to 0-1 range
    }))

    return {
      answer,
      citations,
      confidence: results.length > 3 ? 'high' : confidence,
    }
  } catch (error: any) {
    console.error('Claude API error:', error)
    
    // Return results without AI summary if Claude fails
    return {
      answer: `Based on the NDIS Practice Standards, here are the relevant sections:\n\n${results.slice(0, 3).map(r => `• ${r.sectionTitle || 'Section'}: ${r.content.slice(0, 200)}...`).join('\n\n')}`,
      citations: results.slice(0, 5).map(result => ({
        content: result.content.length > 300 ? result.content.slice(0, 300) + '...' : result.content,
        source: result.source.title,
        section: result.sectionNumber || result.sectionTitle,
        similarity: Math.min(result.score / 15, 1),
      })),
      confidence: 'medium',
    }
  }
}

// Build context string from search results
function buildContext(results: Array<{
  content: string
  source: { title: string; type: string; sector?: string }
  sectionTitle?: string
  sectionNumber?: string
  score: number
  matchedTerms: string[]
}>): string {
  return results.map((result, index) => {
    const header = result.sectionNumber 
      ? `[${result.source.title} - Section ${result.sectionNumber}]`
      : `[${result.source.title}${result.sectionTitle ? ' - ' + result.sectionTitle : ''}]`
    
    return `${index + 1}. ${header} (relevance: ${result.score.toFixed(2)}, matched: ${result.matchedTerms.join(', ')})
${result.content}
`
  }).join('\n---\n')
}

// Analyze a document against legislation
export async function analyzeDocumentCompliance(
  documentText: string,
  sector: string
): Promise<{
  gaps: Array<{ requirement: string; source: string; severity: string }>
  recommendations: string[]
  relevantStandards: Array<{
    content: string
    source: { title: string; type: string }
    sectionTitle?: string
    sectionNumber?: string
    score: number
  }>
}> {
  // Search for relevant standards using BM25
  const relevantStandards = await bm25Search(
    'compliance requirements ' + sector,
    { topK: 20, expandQuery: true, searchMethod: 'hybrid', minScore: 0.05, sector }
  )

  const context = buildContext(relevantStandards)

  const systemPrompt = `You are an expert compliance auditor. Analyze the provided document against the relevant legislation and standards.

Identify:
1. Compliance gaps - requirements not addressed in the document
2. Areas of concern - partial compliance
3. Recommendations for improvement

Be specific and cite the relevant standard/legislation for each finding.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Relevant Legislation and Standards:
${context}

---

Document to Analyze:
${documentText.slice(0, 10000)}

---

Please analyze this document for compliance gaps and provide specific recommendations.
Format your response as JSON with this structure:
{
  "gaps": [{"requirement": "...", "source": "...", "severity": "critical|high|medium|low"}],
  "recommendations": ["..."]
}`
      }],
    })

    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '{}'

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { gaps: [], recommendations: [] }
    
    return {
      gaps: parsed.gaps || [],
      recommendations: parsed.recommendations || [],
      relevantStandards,
    }
  } catch (error) {
    return {
      gaps: [],
      recommendations: ['Unable to analyze document. Please try again.'],
      relevantStandards,
    }
  }
}
