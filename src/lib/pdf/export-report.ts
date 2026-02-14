import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AnalysisData {
  sector: string
  sectorName: string
  documentType: string
  overallScore: number
  overallStatus: string
  riskLevel: string
  summary: string
  findings: Array<{
    area: string
    title: string
    severity: string
    status: string
    description: string
    recommendation?: string
    regulation?: string
  }>
  strengths: Array<{
    area: string
    description: string
  }>
  criticalGaps: string[]
  actionPlan: Array<{
    priority: number
    action: string
    timeframe: string
    responsibility: string
  }>
  complianceByArea: Array<{
    area: string
    score: number
    status: string
  }>
  regulatoryAuthority: string
  analyzedAt: string
}

export function exportAnalysisReport(analysis: AnalysisData, documentName?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // Colors
  const primaryColor: [number, number, number] = [196, 98, 26] // Kwooka ochre
  const darkColor: [number, number, number] = [45, 52, 54]
  const grayColor: [number, number, number] = [120, 120, 120]
  const greenColor: [number, number, number] = [16, 185, 129]
  const redColor: [number, number, number] = [239, 68, 68]
  const amberColor: [number, number, number] = [245, 158, 11]

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Helper function to get status color
  const getStatusColor = (status: string): [number, number, number] => {
    switch (status.toUpperCase()) {
      case 'COMPLIANT': return greenColor
      case 'PARTIAL': return amberColor
      case 'GAP':
      case 'NON_COMPLIANT':
      case 'CRITICAL': return redColor
      default: return grayColor
    }
  }

  const getSeverityColor = (severity: string): [number, number, number] => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return redColor
      case 'HIGH': return [249, 115, 22]
      case 'MEDIUM': return amberColor
      case 'LOW': return [59, 130, 246]
      default: return grayColor
    }
  }

  // ===== HEADER =====
  // Logo placeholder (orange rectangle)
  doc.setFillColor(...primaryColor)
  doc.rect(margin, yPos, 12, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('K', margin + 4, yPos + 8)

  // Title
  doc.setTextColor(...darkColor)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Compliance Analysis Report', margin + 18, yPos + 9)

  yPos += 20

  // Subtitle with date
  doc.setTextColor(...grayColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dateStr = new Date(analysis.analyzedAt || Date.now()).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated: ${dateStr}`, margin, yPos)
  yPos += 15

  // ===== DOCUMENT INFO BOX =====
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F')
  
  doc.setTextColor(...darkColor)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Document Information', margin + 5, yPos + 8)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...grayColor)
  
  const col1X = margin + 5
  const col2X = margin + 90
  
  doc.text(`Sector: ${analysis.sectorName}`, col1X, yPos + 18)
  doc.text(`Document Type: ${analysis.documentType}`, col1X, yPos + 26)
  doc.text(`Regulatory Authority: ${analysis.regulatoryAuthority || 'N/A'}`, col2X, yPos + 18)
  if (documentName) {
    doc.text(`Document: ${documentName}`, col2X, yPos + 26)
  }
  
  yPos += 45

  // ===== COMPLIANCE SCORE BOX =====
  const scoreBoxWidth = 60
  const scoreBoxHeight = 50
  const scoreBoxX = margin
  
  // Score background
  const scoreColor = analysis.overallScore >= 80 ? greenColor : analysis.overallScore >= 60 ? amberColor : redColor
  doc.setFillColor(...scoreColor)
  doc.roundedRect(scoreBoxX, yPos, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F')
  
  // Score text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text(`${analysis.overallScore}%`, scoreBoxX + scoreBoxWidth / 2, yPos + 25, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Compliance Score', scoreBoxX + scoreBoxWidth / 2, yPos + 38, { align: 'center' })

  // Status and Risk boxes
  const infoBoxX = scoreBoxX + scoreBoxWidth + 10
  const infoBoxWidth = pageWidth - 2 * margin - scoreBoxWidth - 10
  
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(infoBoxX, yPos, infoBoxWidth, scoreBoxHeight, 3, 3, 'F')
  
  doc.setTextColor(...darkColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Overall Status:', infoBoxX + 5, yPos + 15)
  doc.text('Risk Level:', infoBoxX + 5, yPos + 35)
  
  // Status badge
  const statusColor = getStatusColor(analysis.overallStatus)
  doc.setFillColor(...statusColor)
  doc.roundedRect(infoBoxX + 45, yPos + 8, 40, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text(analysis.overallStatus, infoBoxX + 65, yPos + 16, { align: 'center' })
  
  // Risk badge
  const riskColor = analysis.riskLevel === 'LOW' ? greenColor : analysis.riskLevel === 'MEDIUM' ? amberColor : redColor
  doc.setFillColor(...riskColor)
  doc.roundedRect(infoBoxX + 45, yPos + 28, 40, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(analysis.riskLevel || 'N/A', infoBoxX + 65, yPos + 36, { align: 'center' })
  
  yPos += scoreBoxHeight + 15

  // ===== EXECUTIVE SUMMARY =====
  doc.setTextColor(...darkColor)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Executive Summary', margin, yPos)
  yPos += 8
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...grayColor)
  
  const summaryLines = doc.splitTextToSize(analysis.summary, pageWidth - 2 * margin)
  doc.text(summaryLines, margin, yPos)
  yPos += summaryLines.length * 5 + 10

  // ===== CRITICAL GAPS (if any) =====
  if (analysis.criticalGaps && analysis.criticalGaps.length > 0) {
    checkNewPage(40)
    
    doc.setFillColor(254, 242, 242)
    doc.setDrawColor(...redColor)
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8 + analysis.criticalGaps.length * 8, 3, 3, 'FD')
    
    doc.setTextColor(...redColor)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('⚠ Critical Gaps Requiring Immediate Attention', margin + 5, yPos + 6)
    yPos += 12
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    analysis.criticalGaps.forEach((gap, i) => {
      const gapLines = doc.splitTextToSize(`• ${gap}`, pageWidth - 2 * margin - 10)
      doc.text(gapLines, margin + 5, yPos)
      yPos += gapLines.length * 4 + 2
    })
    yPos += 10
  }

  // ===== COMPLIANCE BY AREA TABLE =====
  if (analysis.complianceByArea && analysis.complianceByArea.length > 0) {
    checkNewPage(60)
    
    doc.setTextColor(...darkColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Compliance by Area', margin, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Area', 'Score', 'Status']],
      body: analysis.complianceByArea.map(area => [
        area.area,
        `${area.score}%`,
        area.status
      ]),
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const status = data.cell.raw as string
          if (status === 'COMPLIANT') {
            data.cell.styles.textColor = greenColor
          } else if (status === 'PARTIAL') {
            data.cell.styles.textColor = amberColor
          } else {
            data.cell.styles.textColor = redColor
          }
          data.cell.styles.fontStyle = 'bold'
        }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15
  }

  // ===== DETAILED FINDINGS TABLE =====
  if (analysis.findings && analysis.findings.length > 0) {
    checkNewPage(60)
    
    doc.setTextColor(...darkColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Detailed Findings (${analysis.findings.length})`, margin, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Area', 'Finding', 'Severity', 'Status']],
      body: analysis.findings.map(finding => [
        finding.area,
        finding.title,
        finding.severity,
        finding.status
      ]),
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 2) {
            const severity = data.cell.raw as string
            data.cell.styles.textColor = getSeverityColor(severity)
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.column.index === 3) {
            const status = data.cell.raw as string
            data.cell.styles.textColor = getStatusColor(status)
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15
  }

  // ===== ACTION PLAN TABLE =====
  if (analysis.actionPlan && analysis.actionPlan.length > 0) {
    checkNewPage(60)
    
    doc.setTextColor(...darkColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommended Action Plan', margin, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Priority', 'Action', 'Timeframe', 'Responsibility']],
      body: analysis.actionPlan.map(action => [
        action.priority.toString(),
        action.action,
        action.timeframe,
        action.responsibility
      ]),
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 35 }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.fillColor = primaryColor
          data.cell.styles.textColor = [255, 255, 255]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15
  }

  // ===== STRENGTHS =====
  if (analysis.strengths && analysis.strengths.length > 0) {
    checkNewPage(40)
    
    doc.setTextColor(...darkColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Strengths Identified', margin, yPos)
    yPos += 8
    
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, analysis.strengths.length * 18 + 5, 3, 3, 'F')
    yPos += 5
    
    analysis.strengths.forEach((strength, i) => {
      doc.setTextColor(...greenColor)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`✓ ${strength.area}`, margin + 5, yPos + 5)
      
      doc.setTextColor(...grayColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const descLines = doc.splitTextToSize(strength.description, pageWidth - 2 * margin - 15)
      doc.text(descLines, margin + 10, yPos + 12)
      yPos += 18
    })
  }

  // ===== FOOTER ON ALL PAGES =====
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    
    // Footer line
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    
    // Footer text
    doc.setTextColor(...grayColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Generated by Kwooka Compliance | AI-Powered Compliance Platform', margin, pageHeight - 8)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  // Save the PDF
  const fileName = `compliance-report-${analysis.sectorName.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
  
  return fileName
}
