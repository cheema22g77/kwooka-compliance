import { saveAs } from 'file-saver'

export interface DocumentData {
  title?: string
  name?: string
  content?: string
  sections?: any[]
  standard?: string
  documentType?: string
  [key: string]: any
}

export async function downloadDocument(
  doc: DocumentData, 
  filename: string, 
  format: 'docx' | 'pdf' = 'docx',
  options?: any
) {
  try {
    // Call the API endpoint to generate the document
    const response = await fetch('/api/documents/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...doc,
        filename,
        format
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate document')
    }

    const blob = await response.blob()
    saveAs(blob, `${filename}.${format}`)
  } catch (error) {
    console.error('Error downloading document:', error)
    throw error
  }
}

export async function downloadPack(
  docs: DocumentData[], 
  packName: string,
  organization?: any,
  format: 'docx' | 'pdf' = 'docx'
) {
  try {
    const response = await fetch('/api/documents/download-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packName,
        documents: docs,
        organization,
        format
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate pack')
    }

    const blob = await response.blob()
    saveAs(blob, `${packName}_Compliance_Pack.zip`)
  } catch (error) {
    console.error('Error downloading pack:', error)
    throw error
  }
}
