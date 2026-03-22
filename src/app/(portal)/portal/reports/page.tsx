'use client'

import React, { useState, useEffect } from 'react'
import {
  Download, FileText, Calendar, Loader2, Shield,
  BarChart3, Clock, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  title: string
  type: 'compliance_pack' | 'sector_report' | 'findings_summary' | 'evidence_map'
  sector: string | null
  score: number | null
  generatedAt: string
  status: 'ready' | 'generating'
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  compliance_pack: { icon: Shield, label: 'Compliance Pack', color: 'text-kwooka-ochre', bg: 'bg-kwooka-ochre/10' },
  sector_report: { icon: BarChart3, label: 'Sector Report', color: 'text-blue-600', bg: 'bg-blue-50' },
  findings_summary: { icon: FileText, label: 'Findings Summary', color: 'text-amber-600', bg: 'bg-amber-50' },
  evidence_map: { icon: CheckCircle2, label: 'Evidence Map', color: 'text-green-600', bg: 'bg-green-50' },
}

export default function PortalReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      setReports([
        { id: '1', title: 'NDIS Compliance Pack — Q1 2026', type: 'compliance_pack', sector: 'ndis', score: 74, generatedAt: '2026-03-20T10:30:00Z', status: 'ready' },
        { id: '2', title: 'WHS Sector Report — March 2026', type: 'sector_report', sector: 'workplace', score: 82, generatedAt: '2026-03-18T14:00:00Z', status: 'ready' },
        { id: '3', title: 'Findings Summary — All Sectors', type: 'findings_summary', sector: null, score: null, generatedAt: '2026-03-15T09:00:00Z', status: 'ready' },
        { id: '4', title: 'Evidence Coverage Map — NDIS', type: 'evidence_map', sector: 'ndis', score: 68, generatedAt: '2026-03-12T16:30:00Z', status: 'ready' },
        { id: '5', title: 'Transport CoR Compliance Pack', type: 'compliance_pack', sector: 'transport', score: 91, generatedAt: '2026-03-10T11:00:00Z', status: 'ready' },
        { id: '6', title: 'NDIS Compliance Pack — Q4 2025', type: 'compliance_pack', sector: 'ndis', score: 65, generatedAt: '2025-12-20T10:00:00Z', status: 'ready' },
      ])
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Download compliance reports and audit packs
        </p>
      </div>

      {/* Report cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const config = TYPE_CONFIG[report.type] || TYPE_CONFIG.compliance_pack
          const Icon = config.icon

          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
                    <Icon className={cn('h-6 w-6', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{report.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      {report.sector && (
                        <span className="text-xs text-slate-400 uppercase">{report.sector}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      {report.score !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            'h-2 w-2 rounded-full',
                            report.score >= 70 ? 'bg-green-500' :
                            report.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          )} />
                          <span className={cn(
                            'text-sm font-semibold',
                            report.score >= 70 ? 'text-green-600' :
                            report.score >= 40 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {report.score}%
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.generatedAt).toLocaleDateString('en-AU')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-kwooka-ochre border-kwooka-ochre/30 hover:bg-kwooka-ochre/5"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-kwooka-ochre/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-kwooka-ochre" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">About these reports</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Compliance reports are generated by AI-powered analysis of your policies, procedures, and evidence
                against Australian regulatory requirements. Reports are audit-ready and include regulation references,
                compliance scores, findings, and recommended actions. Contact your compliance provider to request
                additional reports or updated analyses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
