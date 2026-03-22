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
import JSZip from 'jszip'

const COLORS = {
  primary: '8B4513',
  secondary: 'F97316',
  text: '1F2937',
  lightBg: 'FEF3E2',
  border: 'E5E7EB',
}

interface DocumentSection {
  title: string
  content: string
  subsections?: { title: string; content: string }[]
}

interface DocumentItem {
  name: string
  category: string
  standard?: string
  sections: DocumentSection[]
}

interface DownloadPackRequest {
  packName: string
  documents: DocumentItem[]
  organization: {
    name: string
    abn?: string
    authorisedBy: string
    position?: string
  }
  format: 'docx' | 'pdf'
  sector?: string
}

function parseContent(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const lines = content.split('\n').filter(line => line.trim())
  let inList = false

  lines.forEach((line) => {
    const trimmed = line.trim()

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
    } else if (/^\d+[\.\)]\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+[\.\)]\s*/, '')
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'numbers', level: 0 },
          children: [new TextRun({ text, size: 22, font: 'Arial' })],
          spacing: { after: 80 },
        })
      )
      inList = true
    } else if (trimmed) {
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

function createDocument(
  title: string,
  sections: DocumentSection[],
  organization: DownloadPackRequest['organization'],
  sector: string,
  standard?: string
): Document {
  const effectiveDate = new Date().toLocaleDateString('en-AU')
  const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')
  const version = '1.0'

  const children: (Paragraph | Table)[] = []
  const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border }
  const borders = { top: border, bottom: border, left: border, right: border }

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

  const metadataRows: [string, string][] = [
    ['Organisation', organization.name],
    ['ABN/ACN', organization.abn || 'N/A'],
    ['Sector', sector.toUpperCase()],
    ['Version', version],
    ['Effective Date', effectiveDate],
    ['Review Date', reviewDate],
    ['Authorised By', `${organization.authorisedBy}${organization.position ? ` (${organization.position})` : ''}`],
  ]

  if (standard) {
    metadataRows.splice(3, 0, ['Compliance Standard', standard])
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

    const contentParagraphs = parseContent(section.content)
    children.push(...contentParagraphs)

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
            size: { width: 11906, height: 16838 },
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
    const body: DownloadPackRequest = await request.json()

    if (!body.packName || !body.documents || !body.organization?.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const sector = body.sector || 'general'

    const categories = new Set(body.documents.map(d => d.category))
    categories.forEach(category => {
      zip.folder(category)
    })

    for (const doc of body.documents) {
      if (!doc.sections || doc.sections.length === 0) continue

      const document = createDocument(
        doc.name,
        doc.sections,
        body.organization,
        sector,
        doc.standard
      )

      const buffer = await Packer.toBuffer(document)
      const filename = doc.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const folderPath = doc.category || 'Other'
      
      zip.file(`${folderPath}/${filename}.docx`, buffer)
    }

    const readme = generateReadme(body)
    zip.file('README.txt', readme)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipFilename = body.packName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}_Compliance_Pack.zip"`,
      },
    })
  } catch (error: any) {
    console.error('Pack generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate pack' },
      { status: 500 }
    )
  }
}

function generateReadme(data: DownloadPackRequest): string {
  const categories = new Map<string, string[]>()
  
  data.documents.forEach(doc => {
    const category = doc.category || 'Other'
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(doc.name)
  })

  let readme = `
================================================================================
${data.packName.toUpperCase()}
================================================================================

Organisation: ${data.organization.name}
Generated: ${new Date().toLocaleDateString('en-AU')} at ${new Date().toLocaleTimeString('en-AU')}
Authorised By: ${data.organization.authorisedBy}${data.organization.position ? ` (${data.organization.position})` : ''}

--------------------------------------------------------------------------------
CONTENTS
--------------------------------------------------------------------------------

Total Documents: ${data.documents.length}

`

  categories.forEach((docs, category) => {
    readme += `\n${category.toUpperCase()} (${docs.length} documents)\n`
    readme += '-'.repeat(50) + '\n'
    docs.forEach((doc, index) => {
      readme += `  ${index + 1}. ${doc}\n`
    })
  })

  readme += `
--------------------------------------------------------------------------------
IMPORTANT NOTES
--------------------------------------------------------------------------------

1. These documents are templates and should be reviewed and customised
   to suit your organisation's specific needs.

2. Ensure all documents are reviewed by appropriate personnel before
   implementation.

3. Documents should be reviewed annually or when significant changes
   occur to legislation or organisational practices.

4. For compliance with NDIS Practice Standards, ensure all staff are
   trained on the policies and procedures contained in this pack.

--------------------------------------------------------------------------------
Generated by Kwooka Compliance System
https://kwooka.com.au
--------------------------------------------------------------------------------
`

  return readme
}