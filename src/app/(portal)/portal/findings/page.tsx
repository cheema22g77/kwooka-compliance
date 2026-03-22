'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, Search,
  Loader2, Filter, ArrowRight, XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Finding {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: 'open' | 'in_progress' | 'remediated' | 'closed'
  category: string
  dueDate: string | null
  createdAt: string
}

const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low', 'info'] as const

export default function PortalFindingsPage() {
  const [loading, setLoading] = useState(true)
  const [findings, setFindings] = useState<Finding[]>([])
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  useEffect(() => {
    fetchFindings()
  }, [])

  async function fetchFindings() {
    try {
      setFindings([
        { id: '1', title: 'Incident management policy missing mandatory reporting procedures', description: 'The current incident management policy does not include mandatory reporting procedures required under NDIS Practice Standard 4.', severity: 'critical', status: 'open', category: 'NDIS Practice Standards', dueDate: '2026-04-01', createdAt: '2026-02-15' },
        { id: '2', title: 'Worker screening records not updated within 90-day window', description: 'Three staff members have worker screening checks older than 90 days without renewal.', severity: 'high', status: 'in_progress', category: 'Worker Screening', dueDate: '2026-03-30', createdAt: '2026-02-10' },
        { id: '3', title: 'Emergency evacuation plan lacks disability-specific provisions', description: 'Evacuation plan does not address mobility-impaired participants or sensory disabilities.', severity: 'high', status: 'open', category: 'WHS', dueDate: '2026-04-15', createdAt: '2026-02-08' },
        { id: '4', title: 'Privacy notice does not reference Australian Privacy Principles', description: 'Privacy collection notice needs updating to reference APPs 1-13.', severity: 'medium', status: 'open', category: 'Privacy', dueDate: null, createdAt: '2026-01-20' },
        { id: '5', title: 'Staff training register incomplete for Q4 period', description: 'Training records for October-December are missing for 6 staff members.', severity: 'medium', status: 'in_progress', category: 'Training', dueDate: '2026-03-15', createdAt: '2026-01-15' },
        { id: '6', title: 'Risk assessment template needs annual review', description: 'Risk assessment template was last reviewed 14 months ago.', severity: 'low', status: 'remediated', category: 'Governance', dueDate: null, createdAt: '2025-12-01' },
        { id: '7', title: 'Complaints register format updated to new standard', description: 'Complaints register format has been updated to include all required fields.', severity: 'low', status: 'closed', category: 'NDIS', dueDate: null, createdAt: '2025-11-15' },
      ])
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  const filtered = findings.filter((f) => {
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
                          f.description.toLowerCase().includes(search.toLowerCase())
    const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const statCounts = {
    total: findings.length,
    open: findings.filter(f => f.status === 'open').length,
    inProgress: findings.filter(f => f.status === 'in_progress').length,
    resolved: findings.filter(f => f.status === 'remediated' || f.status === 'closed').length,
    critical: findings.filter(f => f.severity === 'critical' && f.status === 'open').length,
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    open: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Open' },
    in_progress: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'In Progress' },
    remediated: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Remediated' },
    closed: { icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Closed' },
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
        <h1 className="text-2xl font-bold text-slate-900">Compliance Findings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track compliance findings and remediation progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Total', value: statCounts.total, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Open', value: statCounts.open, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'In Progress', value: statCounts.inProgress, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved', value: statCounts.resolved, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Critical', value: statCounts.critical, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search findings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1">
              {SEVERITY_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSeverityFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize',
                    severityFilter === f
                      ? 'bg-kwooka-ochre text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No findings match your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((finding) => {
                const sc = statusConfig[finding.status] || statusConfig.open
                const StatusIcon = sc.icon
                const isOverdue = finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status === 'open'

                return (
                  <div
                    key={finding.id}
                    className={cn(
                      'p-4 rounded-lg border transition-colors',
                      isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-100'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', sc.bg)}>
                        <StatusIcon className={cn('h-4 w-4', sc.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{finding.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{finding.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={finding.severity}>{finding.severity}</Badge>
                          <Badge variant="outline" className="text-slate-500">{sc.label}</Badge>
                          <span className="text-xs text-slate-400">{finding.category}</span>
                          {finding.dueDate && (
                            <span className={cn('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-slate-400')}>
                              {isOverdue ? 'OVERDUE — ' : 'Due '}
                              {new Date(finding.dueDate).toLocaleDateString('en-AU')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Remediation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['critical', 'high', 'medium', 'low'].map((sev) => {
              const sevFindings = findings.filter(f => f.severity === sev)
              const resolved = sevFindings.filter(f => f.status === 'remediated' || f.status === 'closed').length
              const total = sevFindings.length
              const pct = total > 0 ? Math.round((resolved / total) * 100) : 100

              if (total === 0) return null

              return (
                <div key={sev} className="flex items-center gap-4">
                  <Badge variant={sev as any} className="w-16 justify-center capitalize">{sev}</Badge>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        sev === 'critical' ? 'bg-red-500' :
                        sev === 'high' ? 'bg-orange-500' :
                        sev === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">
                    {resolved}/{total} resolved
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
