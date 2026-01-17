import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, standards, compliance, generatedAt } = body

    // Calculate stats
    const total = standards.length
    const compliantCount = Object.values(compliance).filter((c: any) => c.status === 'compliant').length
    const inProgressCount = Object.values(compliance).filter((c: any) => c.status === 'in_progress').length
    const nonCompliantCount = Object.values(compliance).filter((c: any) => c.status === 'non_compliant').length
    const notStartedCount = total - compliantCount - inProgressCount - nonCompliantCount
    const score = total > 0 ? Math.round((compliantCount / total) * 100) : 0

    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NDIS Compliance Report - ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; line-height: 1.6; }
    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #d97706; }
    .logo { font-size: 28px; font-weight: bold; color: #d97706; }
    .subtitle { color: #666; margin-top: 5px; }
    .company { font-size: 24px; margin-top: 20px; }
    .date { color: #666; font-size: 14px; margin-top: 10px; }
    .score-section { background: #fef3c7; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .score { font-size: 64px; font-weight: bold; color: ${score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'}; }
    .score-label { font-size: 18px; color: #666; }
    .stats { display: flex; justify-content: space-around; margin: 30px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .compliant { color: #059669; }
    .in-progress { color: #3b82f6; }
    .non-compliant { color: #dc2626; }
    .not-started { color: #6b7280; }
    h2 { font-size: 20px; margin: 30px 0 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .standard { padding: 15px; margin: 10px 0; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
    .standard-header { display: flex; justify-content: space-between; align-items: center; }
    .standard-name { font-weight: 600; }
    .standard-num { color: #d97706; font-weight: bold; margin-right: 8px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-compliant { background: #d1fae5; color: #059669; }
    .status-in_progress { background: #dbeafe; color: #3b82f6; }
    .status-non_compliant { background: #fee2e2; color: #dc2626; }
    .status-not_started { background: #f3f4f6; color: #6b7280; }
    .evidence { margin-top: 10px; font-size: 14px; color: #666; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
    @media print { .page { padding: 20px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">🦘 Kwooka Compliance</div>
      <div class="subtitle">NDIS Practice Standards Compliance Report</div>
      <div class="company">${companyName}</div>
      <div class="date">Generated: ${generatedAt}</div>
    </div>

    <div class="score-section">
      <div class="score">${score}%</div>
      <div class="score-label">Overall Compliance Score</div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value compliant">${compliantCount}</div>
        <div class="stat-label">Compliant</div>
      </div>
      <div class="stat">
        <div class="stat-value in-progress">${inProgressCount}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat">
        <div class="stat-value non-compliant">${nonCompliantCount}</div>
        <div class="stat-label">Non-Compliant</div>
      </div>
      <div class="stat">
        <div class="stat-value not-started">${notStartedCount}</div>
        <div class="stat-label">Not Started</div>
      </div>
    </div>

    <h2>Standards Overview</h2>
    ${standards.map((std: any) => {
      const comp = compliance[std.id]
      const status = comp?.status || 'not_started'
      const statusLabel = status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      return `
        <div class="standard">
          <div class="standard-header">
            <div class="standard-name"><span class="standard-num">#${std.standard_number}</span>${std.name}</div>
            <span class="status-badge status-${status}">${statusLabel}</span>
          </div>
          ${comp?.evidence_notes ? `<div class="evidence"><strong>Evidence:</strong> ${comp.evidence_notes}</div>` : ''}
        </div>
      `
    }).join('')}

    <div class="footer">
      <p>This report was generated by Kwooka Compliance Platform</p>
      <p>© ${new Date().getFullYear()} Kwooka Health Services Ltd | ABN: XX XXX XXX XXX</p>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
