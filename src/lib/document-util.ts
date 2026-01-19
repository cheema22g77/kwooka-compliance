
// Client-side PDF generation utility
// Uses html2pdf.js for browser-based PDF creation

declare global {
  interface Window {
    html2pdf: any
  }
}

interface PdfOptions {
  filename?: string
  margin?: number | number[]
  pagebreak?: { mode: string[] }
  image?: { type: string; quality: number }
  html2canvas?: { scale: number; useCORS: boolean }
  jsPDF?: { unit: string; format: string; orientation: string }
}

// Load html2pdf.js dynamically
export async function loadHtml2Pdf(): Promise<void> {
  if (typeof window !== 'undefined' && !window.html2pdf) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load html2pdf.js'))
      document.head.appendChild(script)
    })
  }
}

// Generate PDF from HTML string
export async function generatePdfFromHtml(
  htmlContent: string,
  filename: string = 'document.pdf',
  options: PdfOptions = {}
): Promise<Blob> {
  await loadHtml2Pdf()

  const defaultOptions: PdfOptions = {
    margin: 10,
    filename,
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }

  const mergedOptions = { ...defaultOptions, ...options }

  const container = document.createElement('div')
  container.innerHTML = htmlContent
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  document.body.appendChild(container)

  try {
    const pdf = await window.html2pdf()
      .set(mergedOptions)
      .from(container)
      .outputPdf('blob')
    
    return pdf
  } finally {
    document.body.removeChild(container)
  }
}

// Download PDF directly
export async function downloadPdf(
  htmlContent: string,
  filename: string = 'document.pdf',
  options: PdfOptions = {}
): Promise<void> {
  const blob = await generatePdfFromHtml(htmlContent, filename, options)
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Download DOCX from API
export async function downloadDocx(
  apiEndpoint: string,
  data: any,
  filename: string
): Promise<void> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, format: 'docx' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate document')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Download document in specified format
export async function downloadDocument(
  apiEndpoint: string,
  data: any,
  filename: string,
  format: 'docx' | 'pdf' = 'docx'
): Promise<void> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, format }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate document')
  }

  if (format === 'pdf') {
    const result = await response.json()
    if (result.html) {
      await downloadPdf(result.html, result.filename || filename)
    }
  } else {
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Download ZIP pack
export async function downloadPack(
  apiEndpoint: string,
  data: any,
  filename: string
): Promise<void> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate pack')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.zip') ? filename : `${filename}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}