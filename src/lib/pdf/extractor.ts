/**
 * PDF Text Extraction Utility
 * Extracts text content from PDF files for compliance analysis
 */

// Note: You'll need to install pdf-parse: npm install pdf-parse

/**
 * Extract text from a PDF file (browser/client-side)
 * Uses the PDF.js library which is more browser-compatible
 */
export async function extractPDFTextClient(file: File): Promise<{
  text: string;
  pageCount: number;
  wordCount: number;
}> {
  // Dynamically import pdfjs-dist for client-side
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker path - using CDN for simplicity
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const pageCount = pdf.numPages;
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  const cleanedText = fullText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  
  return {
    text: cleanedText,
    pageCount,
    wordCount,
  };
}

/**
 * Alternative: Simple text extraction using FileReader
 * This is a fallback that works without external libraries
 * but may not work well with all PDFs
 */
export async function extractPDFTextSimple(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
        
        // Try to extract text from PDF structure
        // This is a basic extraction that looks for text streams
        let text = '';
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const content = decoder.decode(typedArray);
        
        // Look for text between BT (begin text) and ET (end text) markers
        const textMatches = content.match(/BT[\s\S]*?ET/g) || [];
        
        for (const match of textMatches) {
          // Extract text from Tj and TJ operators
          const tjMatches = match.match(/\((.*?)\)\s*Tj/g) || [];
          const tjArrayMatches = match.match(/\[(.*?)\]\s*TJ/g) || [];
          
          for (const tj of tjMatches) {
            const textMatch = tj.match(/\((.*?)\)/);
            if (textMatch) {
              text += textMatch[1] + ' ';
            }
          }
          
          for (const tja of tjArrayMatches) {
            const parts = tja.match(/\((.*?)\)/g) || [];
            for (const part of parts) {
              const textMatch = part.match(/\((.*?)\)/);
              if (textMatch) {
                text += textMatch[1];
              }
            }
            text += ' ';
          }
        }
        
        // Clean up the text
        text = text
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (text.length < 100) {
          reject(new Error('Could not extract sufficient text from PDF. Please try copying the text manually.'));
        } else {
          resolve(text);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Main extraction function - tries multiple methods
 */
export async function extractPDFText(file: File): Promise<{
  text: string;
  pageCount?: number;
  wordCount: number;
  method: 'pdfjs' | 'simple' | 'failed';
}> {
  // First, try PDF.js (most reliable)
  try {
    const result = await extractPDFTextClient(file);
    if (result.text.length > 100) {
      return {
        ...result,
        method: 'pdfjs',
      };
    }
  } catch (error) {
    console.warn('PDF.js extraction failed, trying fallback:', error);
  }
  
  // Fallback to simple extraction
  try {
    const text = await extractPDFTextSimple(file);
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      method: 'simple',
    };
  } catch (error) {
    console.warn('Simple extraction failed:', error);
  }
  
  // All methods failed
  return {
    text: '',
    wordCount: 0,
    method: 'failed',
  };
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Format extraction result for display
 */
export function formatExtractionResult(result: {
  text: string;
  pageCount?: number;
  wordCount: number;
  method: string;
}): string {
  const parts = [];
  
  if (result.pageCount) {
    parts.push(`${result.pageCount} page${result.pageCount > 1 ? 's' : ''}`);
  }
  
  parts.push(`${result.wordCount.toLocaleString()} words`);
  
  return `Extracted ${parts.join(', ')} from PDF`;
}