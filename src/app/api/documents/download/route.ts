import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
} from 'docx'

// Professional color scheme
const COLORS = {
  primary: '8B4513', // Kwooka brown
  secondary: 'F97316', // Orange accent
  text: '1F2937',
  lightBg: 'FEF3E2',
  border: 'E5E7EB',
}

interface DocumentSection {
  title: string
  content: string
  subsections?: { title: string; content: string }[]
}

interface DownloadRequest {
  title: string
  sections: DocumentSection[]
  organization: {
    name: string
    abn?: string
    authorisedBy: string
    position?: string
  }
  format: 'docx' | 'pdf'
  sector?: string
  standard?: string
  documentType?: string
  version?: string
}

function parseContent(content: string): (Paragraph)[] {
  const paragraphs: Paragraph[] = []
  const lines = content.split('\n').filter(line => line.trim())

  let inList = false
  
  lines.forEach((line) => {
    const trimmed = line.trim()
    
    // Check for bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[•\-\*]\s*/, '')
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun({ text, size: 22, font: 'Arial' })],
          spacing: { after: 80 },
        })
      )
      inList = true
    }
    // Check for numbered list
    else if (/^\d+[\.\)]\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+[\.\)]\s*/, '')
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'numbers', level: 0 },
          children: [new TextRun({ text, size: 22, font: 'Arial' })],
          spacing: { after: 80 },
        })
      )
      inList = true
    }
    // Regular paragraph
    else if (trimmed) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 22, font: 'Arial' })],
          spacing: { after: inList ? 200 : 120 },
        })
      )
      inList = false
    }
  })

  return paragraphs
}

function createProfessionalDocument(data: DownloadRequest): Document {
  const {
    title,
    sections,
    organization,
    sector = 'NDIS',
    standard,
    documentType = 'Policy',
    version = '1.0',
  } = data

  const effectiveDate = new Date().toLocaleDateString('en-AU')
  const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')

  const children: (Paragraph | Table)[] = []
  const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border }
  const borders = { top: border, bottom: border, left: border, right: border }

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48,
          color: COLORS.primary,
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Metadata table
  const metadataRows: [string, string][] = [
    ['Organisation', organization.name],
    ['ABN/ACN', organization.abn || 'N/A'],
    ['Document Type', documentType],
    ['Sector', sector.toUpperCase()],
    ['Version', version],
    ['Effective Date', effectiveDate],
    ['Review Date', reviewDate],
    ['Authorised By', `${organization.authorisedBy}${organization.position ? ` (${organization.position})` : ''}`],
  ]

  if (standard) {
    metadataRows.splice(4, 0, ['Compliance Standard', standard])
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3000, 6360],
      rows: metadataRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: COLORS.lightBg, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 22, font: 'Arial' })],
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: value, size: 22, font: 'Arial' })],
                  }),
                ],
              }),
            ],
          })
      ),
    })
  )

  children.push(new Paragraph({ children: [], spacing: { after: 400 } }))

  // Sections
  sections.forEach((section, sectionIndex) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: `${sectionIndex + 1}. ${section.title}`,
            bold: true,
            size: 28,
            color: COLORS.primary,
            font: 'Arial',
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    )

    // Parse and add content paragraphs
    const contentParagraphs = parseContent(section.content)
    children.push(...contentParagraphs)

    // Subsections
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection, subIndex) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: `${sectionIndex + 1}.${subIndex + 1} ${subsection.title}`,
                bold: true,
                size: 24,
                color: COLORS.text,
                font: 'Arial',
              }),
            ],
            spacing: { before: 200, after: 150 },
          })
        )

        const subParagraphs = parseContent(subsection.content)
        children.push(...subParagraphs)
      })
    }
  })

  // Version history
  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'Document Version History',
          bold: true,
          size: 28,
          color: COLORS.primary,
          font: 'Arial',
        }),
      ],
      spacing: { before: 300, after: 200 },
    })
  )

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1500, 2000, 2500, 3360],
      rows: [
        new TableRow({
          children: ['Version', 'Date', 'Author', 'Changes'].map(
            (header) =>
              new TableCell({
                borders,
                shading: { fill: COLORS.lightBg, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: header, bold: true, size: 20, font: 'Arial' })],
                  }),
                ],
              })
          ),
        }),
        new TableRow({
          children: [version, effectiveDate, organization.authorisedBy, 'Initial release'].map(
            (cell) =>
              new TableCell({
                borders,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cell, size: 20, font: 'Arial' })],
                  }),
                ],
              })
          ),
        }),
      ],
    })
  )

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: COLORS.primary },
          paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial', color: COLORS.text },
          paragraph: { spacing: { before: 200, after: 150 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${organization.name} | ${title}`,
                    size: 18,
                    color: '666666',
                    font: 'Arial',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'CONFIDENTIAL - ', size: 16, color: '999999', font: 'Arial' }),
                  new TextRun({ text: `Version ${version} | `, size: 16, color: '999999', font: 'Arial' }),
                  new TextRun({ text: 'Page ', size: 16, color: '999999', font: 'Arial' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '999999', font: 'Arial' }),
                  new TextRun({ text: ' of ', size: 16, color: '999999', font: 'Arial' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '999999', font: 'Arial' }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json()

    if (!body.title || !body.sections || !body.organization?.name) {
      return NextResponse.json(
        { error: 'Missing required fields: title, sections, and organization.name' },
        { status: 400 }
      )
    }

    const format = body.format || 'docx'
    const filename = body.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')

    if (format === 'pdf') {
      // Return HTML for client-side PDF generation
      const htmlContent = generateHtmlForPdf(body)
      return NextResponse.json({
        html: htmlContent,
        filename: `${filename}.pdf`,
        format: 'pdf',
      })
    }

    // Generate DOCX
    const doc = createProfessionalDocument(body)
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (error: any) {
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate document' },
      { status: 500 }
    )
  }
}

function generateHtmlForPdf(data: DownloadRequest): string {
  const {
    title,
    sections,
    organization,
    sector = 'NDIS',
    standard,
    documentType = 'Policy',
    version = '1.0',
  } = data

  const effectiveDate = new Date().toLocaleDateString('en-AU')
  const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')

  const sectionsHtml = sections.map((section, index) => {
    const contentHtml = section.content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return `<li>${trimmed.replace(/^[•\-\*]\s*/, '')}</li>`
        }
        if (/^\d+[\.\)]\s/.test(trimmed)) {
          return `<li>${trimmed.replace(/^\d+[\.\)]\s*/, '')}</li>`
        }
        return `<p>${trimmed}</p>`
      })
      .join('')

    const subsectionsHtml = section.subsections
      ? section.subsections.map((sub, subIndex) => `
          <h3>${index + 1}.${subIndex + 1} ${sub.title}</h3>
          ${sub.content.split('\n').filter(l => l.trim()).map(p => `<p>${p.trim()}</p>`).join('')}
        `).join('')
      : ''

    return `
      <div class="section">
        <h2>${index + 1}. ${section.title}</h2>
        ${contentHtml.includes('<li>') ? `<ul>${contentHtml}</ul>` : contentHtml}
        ${subsectionsHtml}
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
    .title { font-size: 24pt; font-weight: bold; color: #8B4513; margin-bottom: 10px; }
    .metadata { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    .metadata td { border: 1px solid #e5e7eb; padding: 10px 15px; }
    .metadata td:first-child { background-color: #fef3e2; font-weight: bold; width: 35%; }
    h2 { font-size: 14pt; color: #8B4513; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    h3 { font-size: 12pt; color: #374151; margin-top: 20px; margin-bottom: 10px; }
    p { margin-bottom: 12px; text-align: justify; }
    ul, ol { margin-bottom: 15px; padding-left: 25px; }
    li { margin-bottom: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9pt; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${title}</div>
    <div style="color: #666; font-size: 10pt;">${organization.name}</div>
  </div>
  
  <table class="metadata">
    <tr><td>Organisation</td><td>${organization.name}</td></tr>
    <tr><td>ABN/ACN</td><td>${organization.abn || 'N/A'}</td></tr>
    <tr><td>Document Type</td><td>${documentType}</td></tr>
    <tr><td>Sector</td><td>${sector.toUpperCase()}</td></tr>
    ${standard ? `<tr><td>Compliance Standard</td><td>${standard}</td></tr>` : ''}
    <tr><td>Version</td><td>${version}</td></tr>
    <tr><td>Effective Date</td><td>${effectiveDate}</td></tr>
    <tr><td>Review Date</td><td>${reviewDate}</td></tr>
    <tr><td>Authorised By</td><td>${organization.authorisedBy}${organization.position ? ` (${organization.position})` : ''}</td></tr>
  </table>
  
  ${sectionsHtml}
  
  <div class="footer">
    <p>CONFIDENTIAL - ${organization.name} - Version ${version}</p>
    <p>Generated by Kwooka Compliance System</p>
  </div>
</body>
</html>
  `
}
