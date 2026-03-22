import * as pdfjs from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window === 'undefined') {
  // Server-side
  const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

export interface ParsedPDF {
  text: string
  pages: PageContent[]
  metadata: PDFMetadata
  success: boolean
  error?: string
}

export interface PageContent {
  pageNumber: number
  text: string
  items: TextItem[]
}

export interface TextItem {
  text: string
  x: number
  y: number
  fontSize?: number
  fontName?: string
}

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  pageCount: number
}

export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedPDF> {
  try {
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    const metadata = await pdf.getMetadata() as any
    
    const pages: PageContent[] = []
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      const items: TextItem[] = textContent.items
        .filter((item): item is any => 'str' in item)
        .map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          fontSize: item.height,
          fontName: item.fontName
        }))

      // Reconstruct text with proper spacing
      const pageText = reconstructText(items)
      
      pages.push({
        pageNumber: i,
        text: pageText,
        items
      })
      
      fullText += pageText + '\n\n'
    }

    return {
      text: fullText.trim(),
      pages,
      metadata: {
        title: metadata.info?.Title,
        author: metadata.info?.Author,
        subject: metadata.info?.Subject,
        keywords: metadata.info?.Keywords,
        creator: metadata.info?.Creator,
        producer: metadata.info?.Producer,
        creationDate: metadata.info?.CreationDate ? parseDate(metadata.info.CreationDate) : undefined,
        modificationDate: metadata.info?.ModDate ? parseDate(metadata.info.ModDate) : undefined,
        pageCount: pdf.numPages
      },
      success: true
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    return {
      text: '',
      pages: [],
      metadata: { pageCount: 0 },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Reconstruct text from items with proper spacing
function reconstructText(items: TextItem[]): string {
  if (items.length === 0) return ''

  // Sort by Y (top to bottom) then X (left to right)
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y // Higher Y = higher on page
    if (Math.abs(yDiff) > 5) return yDiff
    return a.x - b.x
  })

  const lines: string[] = []
  let currentLine = ''
  let lastY = sorted[0]?.y ?? 0
  let lastX = 0

  for (const item of sorted) {
    // Check if new line (Y changed significantly)
    if (Math.abs(item.y - lastY) > 5) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim())
      }
      currentLine = item.text
      lastX = item.x + (item.text.length * 5) // Estimate width
    } else {
      // Same line - check for spacing
      const gap = item.x - lastX
      if (gap > 10) {
        currentLine += ' ' + item.text
      } else if (gap > 3) {
        currentLine += ' ' + item.text
      } else {
        currentLine += item.text
      }
      lastX = item.x + (item.text.length * 5)
    }
    lastY = item.y
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim())
  }

  // Join lines, detecting paragraphs
  let result = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    
    result += line
    
    // Add paragraph break if line ends with period and next starts with capital
    if (line.match(/[.!?]$/) && nextLine?.match(/^[A-Z]/)) {
      result += '\n\n'
    } else if (nextLine) {
      result += ' '
    }
  }

  return result
}

// Parse PDF date format
function parseDate(dateStr: string): Date | undefined {
  try {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/)
    if (match) {
      const [, year, month, day, hour = '00', min = '00', sec = '00'] = match
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      )
    }
  } catch {
    // Ignore parsing errors
  }
  return undefined
}

// Extract structured sections from PDF text
export function extractSections(text: string): Array<{ title: string; content: string; level: number }> {
  const sections: Array<{ title: string; content: string; level: number }> = []
  
  // Common section header patterns
  const headerPatterns = [
    /^(#{1,6})\s+(.+)$/gm,                           // Markdown headers
    /^(\d+(?:\.\d+)*)\s+([A-Z][^\n]+)$/gm,           // Numbered sections (1.1 Title)
    /^(Part|Section|Chapter|Division)\s+(\d+[A-Za-z]?)[:\s]+(.+)$/gim, // Legal sections
    /^([A-Z][A-Z\s]{2,})$/gm,                        // ALL CAPS headers
  ]

  const lines = text.split('\n')
  let currentSection: { title: string; content: string; level: number } | null = null

  for (const line of lines) {
    let isHeader = false
    let headerLevel = 0
    let headerTitle = ''

    // Check each pattern
    for (const pattern of headerPatterns) {
      pattern.lastIndex = 0
      const match = pattern.exec(line)
      if (match) {
        isHeader = true
        if (match[1].startsWith('#')) {
          headerLevel = match[1].length
          headerTitle = match[2]
        } else if (match[1].match(/^\d/)) {
          headerLevel = match[1].split('.').length
          headerTitle = `${match[1]} ${match[2]}`
        } else {
          headerLevel = 1
          headerTitle = line.trim()
        }
        break
      }
    }

    if (isHeader) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: headerTitle,
        content: '',
        level: headerLevel
      }
    } else if (currentSection) {
      currentSection.content += line + '\n'
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection)
  }

  return sections.map(s => ({
    ...s,
    content: s.content.trim()
  }))
}
