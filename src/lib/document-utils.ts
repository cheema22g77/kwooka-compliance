import { saveAs } from 'file-saver'

export interface DocumentData {
  title?: string
  name?: string
  content?: string
  sections?: any[]
  standard?: string
  documentType?: string
  organization?: any
  sector?: string
  [key: string]: any
}

export async function downloadDocument(
  urlOrDoc: string | DocumentData, 
  dataOrFilename?: DocumentData | string, 
  formatOrOptions?: 'docx' | 'pdf' | any,
  filename?: string
) {
  try {
    let response: Response
    let finalFilename: string

    // Handle: downloadDocument('/api/...', { data }, 'name', 'docx')
    if (typeof urlOrDoc === 'string' && urlOrDoc.startsWith('/api')) {
      response = await fetch(urlOrDoc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataOrFilename)
      })
      finalFilename = typeof formatOrOptions === 'string' ? formatOrOptions : 'document'
    } 
    // Handle: downloadDocument({ doc }, 'filename', 'docx')
    else if (typeof urlOrDoc === 'object') {
      response = await fetch('/api/documents/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...urlOrDoc,
          filename: dataOrFilename,
          format: formatOrOptions || 'docx'
        })
      })
      finalFilename = typeof dataOrFilename === 'string' ? dataOrFilename : 'document'
    } else {
      throw new Error('Invalid arguments')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to generate document')
    }

    const blob = await response.blob()
    const ext = blob.type.includes('pdf') ? 'pdf' : 'docx'
    saveAs(blob, `${finalFilename}.${ext}`)
  } catch (error) {
    console.error('Error downloading document:', error)
    throw error
  }
}

export async function downloadPack(
  docsOrUrl: DocumentData[] | string,
  packNameOrData?: string | any,
  organizationOrFormat?: any,
  format: 'docx' | 'pdf' = 'docx'
) {
  try {
    let response: Response
    let finalPackName: string

    // Handle: downloadPack('/api/...', { data })
    if (typeof docsOrUrl === 'string' && docsOrUrl.startsWith('/api')) {
      response = await fetch(docsOrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packNameOrData)
      })
      finalPackName = packNameOrData?.packName || 'Compliance_Pack'
    }
    // Handle: downloadPack(docs[], 'packName', org, 'docx')
    else {
      response = await fetch('/api/documents/download-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packName: packNameOrData,
          documents: docsOrUrl,
          organization: organizationOrFormat,
          format
        })
      })
      finalPackName = typeof packNameOrData === 'string' ? packNameOrData : 'Compliance_Pack'
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to generate pack')
    }

    const blob = await response.blob()
    saveAs(blob, `${finalPackName}_Compliance_Pack.zip`)
  } catch (error) {
    console.error('Error downloading pack:', error)
    throw error
  }
}
