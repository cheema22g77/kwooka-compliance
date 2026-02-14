'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckSquare, Square, Loader2, Download,
  Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSector } from '@/contexts/sector-context'
import { SECTORS, type SectorId } from '@/core/value-objects/sectors'

// Sector-specific compliance playbooks — real Australian requirements
const PLAYBOOKS: Record<string, { area: string; items: string[] }[]> = {
  ndis: [
    { area: 'Rights and Responsibilities', items: [
      'Participant rights policy documented and accessible',
      'Privacy and dignity procedures in place',
      'Informed consent process documented',
      'Advocacy access information provided to participants',
      'Individual values and beliefs respected in service delivery',
    ]},
    { area: 'Governance and Operational Management', items: [
      'Organisational governance framework documented',
      'Risk management plan current and reviewed annually',
      'Insurance certificates current (public liability, professional indemnity)',
      'ABN and NDIS registration details current',
      'Complaints and feedback policy accessible',
    ]},
    { area: 'Provision of Supports', items: [
      'Individual support plans for each participant',
      'Support delivery aligned with NDIS plans',
      'Progress notes maintained for all supports',
      'Continuity of supports plan documented',
      'Transition planning procedures in place',
    ]},
    { area: 'Worker Screening', items: [
      'NDIS Worker Screening Check for all workers',
      'Working with Children Check where applicable',
      'Screening register maintained and current',
      'Renewal tracking system in place',
      'Contractor screening verification process',
    ]},
    { area: 'Incident Management', items: [
      'Incident management policy and procedures',
      'NDIS Commission reportable incident process',
      'Incident register maintained',
      'Root cause analysis conducted for serious incidents',
      'Quarterly incident review and trend analysis',
    ]},
  ],
  transport: [
    { area: 'Chain of Responsibility', items: [
      'CoR policy documented and communicated',
      'Due diligence procedures for all parties',
      'Consignment documentation processes',
      'Loading and restraint procedures',
      'CoR training records for all staff',
    ]},
    { area: 'Fatigue Management', items: [
      'Fatigue management plan (BFM or AFM)',
      'Work diary compliance procedures',
      'Rest break monitoring system',
      'Driver fitness for duty assessment process',
      'Fatigue risk assessment documented',
    ]},
    { area: 'Vehicle Standards', items: [
      'Vehicle maintenance schedule documented',
      'Pre-trip inspection checklists in use',
      'Defect reporting and rectification process',
      'Vehicle registration and CTP current',
      'Mass and dimension compliance records',
    ]},
    { area: 'Speed Compliance', items: [
      'Speed management policy documented',
      'GPS/telematics monitoring in place',
      'Speed breach investigation procedures',
      'Route risk assessment process',
      'Driver coaching program for speed events',
    ]},
  ],
  healthcare: [
    { area: 'Clinical Governance', items: [
      'Clinical governance framework documented',
      'Credentialing and scope of practice defined',
      'Clinical incident management system',
      'Mortality and morbidity review process',
      'Open disclosure policy and training',
    ]},
    { area: 'Infection Prevention', items: [
      'Infection prevention and control program',
      'Hand hygiene compliance monitoring',
      'Standard and transmission-based precautions',
      'Antimicrobial stewardship program',
      'Healthcare-associated infection surveillance',
    ]},
    { area: 'Medication Safety', items: [
      'Medication management policy current',
      'High-risk medication identification and protocols',
      'Medication reconciliation at transitions',
      'Adverse drug reaction reporting process',
      'Medication storage and disposal procedures',
    ]},
  ],
  aged_care: [
    { area: 'Consumer Dignity and Choice', items: [
      'Consumer-directed care model documented',
      'Cultural and spiritual needs assessment',
      'Interpreter services available',
      'End-of-life care preferences documented',
      'Consumer representatives recognised and supported',
    ]},
    { area: 'Personal Care and Clinical Care', items: [
      'Clinical care governance framework',
      'Medication management system',
      'Pain management protocols',
      'Wound management procedures',
      'Infection prevention and control program',
    ]},
    { area: 'SIRS Reporting', items: [
      'Serious Incident Response Scheme policy',
      'Reportable incident categories understood by staff',
      'Aged Care Quality and Safety Commission reporting process',
      'Within 24-hour notification procedures',
      'Incident investigation and follow-up documented',
    ]},
  ],
  workplace: [
    { area: 'PCBU Duties', items: [
      'WHS policy statement documented',
      'Health and safety management plan',
      'PCBU due diligence obligations documented',
      'Contractor and visitor management procedures',
      'Workers compensation insurance current',
    ]},
    { area: 'Risk Management', items: [
      'Hazard identification process documented',
      'Risk register maintained and current',
      'Hierarchy of controls applied',
      'Safe Work Method Statements for high-risk work',
      'Risk assessments reviewed after incidents',
    ]},
    { area: 'Consultation', items: [
      'Worker consultation arrangements in place',
      'Health and Safety Representative elected',
      'HSR training completed',
      'Issue resolution procedures documented',
      'Consultation records maintained',
    ]},
  ],
  construction: [
    { area: 'Safe Work Method Statements', items: [
      'SWMS for all high-risk construction work',
      'Workers briefed on SWMS before commencing',
      'SWMS reviewed after incidents or changes',
      'SWMS accessible at the workplace',
      'Worker sign-off records maintained',
    ]},
    { area: 'Working at Heights', items: [
      'Fall prevention plan documented',
      'Edge protection and guardrail systems',
      'Scaffold inspection and tagging system',
      'EWP operator licensing verified',
      'Rescue plan for working at heights',
    ]},
    { area: 'Asbestos Management', items: [
      'Asbestos register and management plan',
      'Asbestos awareness training for workers',
      'Licensed removalist used for friable asbestos',
      'Air monitoring during removal works',
      'Clearance certificates obtained post-removal',
    ]},
  ],
}

interface ChecklistState {
  [key: string]: boolean
}

export default function PlaybooksPage() {
  const { userSectors } = useSector()
  const [activeSector, setActiveSector] = useState<string>('')
  const [checklist, setChecklist] = useState<ChecklistState>({})
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Set default sector
  useEffect(() => {
    if (userSectors.length > 0 && !activeSector) {
      setActiveSector(userSectors[0])
    }
    setLoading(false)
  }, [userSectors])

  // Load checklist state from localStorage (simple persistence)
  useEffect(() => {
    if (!activeSector) return
    try {
      const saved = localStorage.getItem(`playbook-${activeSector}`)
      if (saved) {
        setChecklist(JSON.parse(saved))
      } else {
        setChecklist({})
      }
      // Expand all areas by default
      const playbook = PLAYBOOKS[activeSector] || []
      const expanded: Record<string, boolean> = {}
      playbook.forEach(p => { expanded[p.area] = true })
      setExpandedAreas(expanded)
    } catch { setChecklist({}) }
  }, [activeSector])

  // Save checklist state
  const toggleItem = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] }
    setChecklist(updated)
    try {
      localStorage.setItem(`playbook-${activeSector}`, JSON.stringify(updated))
    } catch {}
  }

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }))
  }

  // Generate audit report PDF
  const generateAuditReport = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/audit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: activeSector }),
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const data = await response.json()

      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      let y = 20

      // Header
      doc.setFillColor(217, 119, 6) // kwooka-ochre
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('KWOOKA COMPLIANCE', margin, 18)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Audit-Ready Report — ${data.sector.fullName}`, margin, 28)

      y = 45

      // Executive Summary
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Executive Summary', margin, y)
      y += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const summaryLines = [
        `Overall Compliance Score: ${data.summary.averageScore}%`,
        `Risk Level: ${data.summary.riskLevel}`,
        `Evidence Coverage: ${data.summary.coveragePercent}% of compliance areas`,
        `Documents Analysed: ${data.summary.totalAnalyses}`,
        `Open Findings: ${data.findings.open} (${data.findings.critical} critical, ${data.findings.high} high)`,
        `Resolved Findings: ${data.findings.resolved}`,
        `Report Generated: ${new Date(data.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        `Regulatory Authority: ${data.sector.authority}`,
      ]

      for (const line of summaryLines) {
        doc.text(line, margin, y)
        y += 6
      }

      y += 5

      // Evidence Coverage Table
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Evidence Coverage by Compliance Area', margin, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Compliance Area', 'Score', 'Status', 'Documents']],
        body: data.evidenceCoverage.map((e: any) => [
          e.area,
          e.score > 0 ? `${e.score}%` : '—',
          e.status,
          e.documentCount.toString(),
        ]),
        headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [252, 247, 235] },
        margin: { left: margin, right: margin },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Open Findings
      if (data.findings.items.length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Open Findings', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Finding', 'Severity', 'Category', 'Status']],
          body: data.findings.items.map((f: any) => [
            f.title,
            (f.severity || 'medium').toUpperCase(),
            f.category || '—',
            f.status || 'open',
          ]),
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [252, 247, 235] },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
          },
        })

        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Action Plan
      if (data.actionPlan && data.actionPlan.length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Recommended Action Plan', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Priority', 'Action', 'Timeframe', 'Responsibility']],
          body: data.actionPlan.slice(0, 10).map((a: any) => [
            `P${a.priority || '—'}`,
            a.action,
            a.timeframe || '—',
            a.responsibility || '—',
          ]),
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [252, 247, 235] },
          margin: { left: margin, right: margin },
        })

        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Playbook Progress
      const playbook = PLAYBOOKS[activeSector] || []
      if (playbook.length > 0) {
        if (y > 200) { doc.addPage(); y = 20 }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Compliance Checklist Progress', margin, y)
        y += 5

        const checklistRows = playbook.flatMap(area =>
          area.items.map(item => {
            const key = `${area.area}::${item}`
            return [checklist[key] ? '✓' : '✗', area.area, item]
          })
        )

        autoTable(doc, {
          startY: y,
          head: [['Done', 'Area', 'Item']],
          body: checklistRows,
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [252, 247, 235] },
          margin: { left: margin, right: margin },
          columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 45 } },
        })
      }

      // Footer on all pages
      const totalPages = (doc as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Kwooka Compliance — Audit Report — Page ${i} of ${totalPages}`,
          pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' }
        )
        doc.text(
          'Generated by Kwooka Health Services Ltd (Supply Nation Certified)',
          pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
        )
      }

      // Download
      const sectorName = SECTORS[activeSector as SectorId]?.name || activeSector
      const dateStr = new Date().toISOString().split('T')[0]
      doc.save(`Kwooka-Audit-Report-${sectorName}-${dateStr}.pdf`)
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Stats
  const playbook = PLAYBOOKS[activeSector] || []
  const totalItems = playbook.reduce((sum, area) => sum + area.items.length, 0)
  const completedItems = playbook.reduce((sum, area) =>
    sum + area.items.filter(item => checklist[`${area.area}::${item}`]).length, 0
  )
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Playbooks</h1>
          <p className="text-slate-500 mt-1">Pre-built checklists and audit report generation</p>
        </div>
        <Button
          onClick={generateAuditReport}
          disabled={generating || !activeSector}
          className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 gap-2"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Download className="h-4 w-4" /> Generate Audit Report</>
          )}
        </Button>
      </div>

      {/* Sector Selector */}
      {userSectors.length > 1 && (
        <div className="flex gap-2">
          {userSectors.map(sId => {
            const sc = SECTORS[sId as SectorId]
            if (!sc) return null
            return (
              <Button
                key={sId}
                variant={activeSector === sId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSector(sId)}
                className={cn(activeSector === sId && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}
              >
                {sc.name}
              </Button>
            )
          })}
        </div>
      )}

      {/* Progress Card */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                {SECTORS[activeSector as SectorId]?.name || 'Select a sector'} Compliance Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{completedItems} of {totalItems} items completed</p>
            </div>
            <div className="text-right">
              <p className={cn(
                'text-3xl font-bold',
                progressPercent >= 80 ? 'text-green-600' :
                progressPercent >= 50 ? 'text-amber-600' : 'text-red-600'
              )}>
                {progressPercent}%
              </p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progressPercent >= 80 ? 'bg-green-500' :
                progressPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      {playbook.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700 mb-1">No playbook for this sector yet</p>
            <p className="text-sm text-slate-500">Playbooks are being expanded. Try NDIS or Transport.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {playbook.map(area => {
            const areaCompleted = area.items.filter(item => checklist[`${area.area}::${item}`]).length
            const areaTotal = area.items.length
            const isExpanded = expandedAreas[area.area] !== false

            return (
              <Card key={area.area}>
                <button
                  onClick={() => toggleArea(area.area)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold',
                      areaCompleted === areaTotal ? 'bg-green-100 text-green-700' :
                      areaCompleted > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {areaCompleted}/{areaTotal}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{area.area}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-1 border-t pt-3">
                      {area.items.map(item => {
                        const key = `${area.area}::${item}`
                        const done = checklist[key]
                        return (
                          <button
                            key={key}
                            onClick={() => toggleItem(key)}
                            className={cn(
                              'w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors',
                              done ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-slate-50'
                            )}
                          >
                            {done ? (
                              <CheckSquare className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <span className={cn(
                              'text-sm',
                              done ? 'text-green-700 line-through' : 'text-slate-700'
                            )}>
                              {item}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
