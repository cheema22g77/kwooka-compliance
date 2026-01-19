import { saveAs } from 'file-saver'

export interface Document {
  id: string
  title: string
  content: string
  type?: string
  sector?: string
}

export async function downloadDocument(doc: Document, format: 'docx' | 'pdf' = 'docx') {
  try {
    const blob = new Blob([doc.content], { 
      type: format === 'docx' 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf'
    })
    
    const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.${format}`
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error downloading document:', error)
    throw error
  }
}

export async function downloadPack(docs: Document[], packName: string) {
  try {
    // For now, download as a combined text file
    // You can enhance this to create a proper ZIP file
    const combined = docs.map(doc => 
      `=== ${doc.title} ===\n\n${doc.content}\n\n`
    ).join('\n---\n\n')
    
    const blob = new Blob([combined], { type: 'text/plain' })
    const filename = `${packName.replace(/[^a-z0-9]/gi, '_')}_pack.txt`
    saveAs(blob, filename)
  } catch (error) {
    console.error('Error downloading pack:', error)
    throw error
  }
}
