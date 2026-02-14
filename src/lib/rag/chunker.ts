export interface Chunk {
  content: string
  sectionTitle?: string
  sectionNumber?: string
  pageNumber?: number
  metadata?: Record<string, any>
}

export interface ChunkingOptions {
  chunkSize?: number        // Target chunk size in characters
  chunkOverlap?: number     // Overlap between chunks
  preserveSections?: boolean // Try to keep sections together
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveSections: true,
}

// Smart chunking that preserves document structure
export function chunkDocument(
  text: string,
  options: ChunkingOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []

  // Split by sections first (look for section patterns)
  const sectionPatterns = [
    /^#{1,6}\s+(.+)$/gm,                           // Markdown headers
    /^(\d+\.)+\s+(.+)$/gm,                          // Numbered sections (1.1, 1.1.1, etc.)
    /^(Section|Part|Division|Chapter)\s+\d+/gim,    // Legal document sections
    /^(Standard|Requirement|Indicator)\s+\d+/gim,   // Standards documents
  ]

  // Find all section breaks
  const sectionBreaks: { index: number; title: string; number?: string }[] = []
  
  for (const pattern of sectionPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      sectionBreaks.push({
        index: match.index,
        title: match[0].trim(),
        number: extractSectionNumber(match[0]),
      })
    }
  }

  // Sort by position
  sectionBreaks.sort((a, b) => a.index - b.index)

  if (opts.preserveSections && sectionBreaks.length > 0) {
    // Chunk by sections
    for (let i = 0; i < sectionBreaks.length; i++) {
      const start = sectionBreaks[i].index
      const end = i < sectionBreaks.length - 1 
        ? sectionBreaks[i + 1].index 
        : text.length

      const sectionText = text.slice(start, end).trim()
      
      // If section is too large, split it further
      if (sectionText.length > opts.chunkSize! * 2) {
        const subChunks = splitBySize(sectionText, opts.chunkSize!, opts.chunkOverlap!)
        subChunks.forEach((content, idx) => {
          chunks.push({
            content,
            sectionTitle: sectionBreaks[i].title,
            sectionNumber: sectionBreaks[i].number,
            metadata: { subChunk: idx + 1, totalSubChunks: subChunks.length },
          })
        })
      } else if (sectionText.length > 50) { // Minimum chunk size
        chunks.push({
          content: sectionText,
          sectionTitle: sectionBreaks[i].title,
          sectionNumber: sectionBreaks[i].number,
        })
      }
    }
  } else {
    // Simple chunking by size
    const simpleChunks = splitBySize(text, opts.chunkSize!, opts.chunkOverlap!)
    simpleChunks.forEach(content => {
      chunks.push({ content })
    })
  }

  return chunks
}

// Split text by size with overlap
function splitBySize(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  
  let currentChunk = ''
  let previousChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      
      // Add overlap from previous chunk
      const overlapText = getOverlapText(currentChunk, overlap)
      previousChunk = currentChunk
      currentChunk = overlapText + sentence + ' '
    } else {
      currentChunk += sentence + ' '
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

// Get the last N characters for overlap
function getOverlapText(text: string, overlap: number): string {
  if (text.length <= overlap) return text
  
  // Try to break at a sentence boundary
  const lastPart = text.slice(-overlap * 2)
  const sentenceBreak = lastPart.search(/[.!?]\s+/)
  
  if (sentenceBreak !== -1) {
    return lastPart.slice(sentenceBreak + 2)
  }
  
  return text.slice(-overlap)
}

// Extract section number from header
function extractSectionNumber(header: string): string | undefined {
  const match = header.match(/(\d+(?:\.\d+)*)/);
  return match ? match[1] : undefined
}

// Chunk specifically for legal/standards documents
export function chunkLegalDocument(text: string): Chunk[] {
  return chunkDocument(text, {
    chunkSize: 800,
    chunkOverlap: 150,
    preserveSections: true,
  })
}
