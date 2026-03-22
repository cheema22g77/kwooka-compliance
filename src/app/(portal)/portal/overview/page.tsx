'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Minus, Loader2,
  Truck, Heart, Home, Briefcase, HardHat,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield, transport: Truck, healthcare: Heart,
  aged_care: Home, workplace: Briefcase, construction: HardHat,
}

export default function PortalOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [score, setScore] = useState(0)
  const [scoreTrend, setScoreTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    openFindings: 0,
    criticalFindings: 0,
    resolvedThisMonth: 0,
  })
  const [recentFindings, setRecentFindings] = useState<any[]>([])

  useEffect(() => {
    fetchPortalData()
  }, [])

  async function fetchPortalData() {
    try {
      const sessionRes = await fetch('/api/portal/auth')
      if (!sessionRes.ok) return
      const session = await sessionRes.json()
      setOrgName(session.orgName)

      // Fetch compliance data for the org via a portal-safe endpoint
      // For now, use demo data since the portal doesn't have direct DB access
      setScore(74)
      setScoreTrend('up')
      setStats({
        totalAnalyses: 12,
        openFindings: 8,
        criticalFindings: 2,
        resolvedThisMonth: 5,
      })
      setRecentFindings([
        { id: 1, title: 'Incident management policy missing mandatory reporting procedures', severity: 'critical', status: 'open', category: 'NDIS' },
        { id: 2, title: 'Worker screening records not updated within 90-day window', severity: 'high', status: 'in_progress', category: 'NDIS' },
        { id: 3, title: 'Emergency evacuation plan lacks disability-specific provisions', severity: 'high', status: 'open', category: 'WHS' },
        { id: 4, title: 'Privacy notice does not reference Australian Privacy Principles', severity: 'medium', status: 'open', category: 'General' },
        { id: 5, title: 'Staff training register incomplete for Q4 period', severity: 'medium', status: 'in_progress', category: 'WHS' },
      ])
    } catch {
      // Ignore errors
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

  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = score >= 70 ? 'from-green-50 to-white' : score >= 40 ? 'from-amber-50 to-white' : 'from-red-50 to-white'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Current compliance status for {orgName}
        </p>
      </div>

      {/* Score + Stats Grid */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Compliance Score */}
        <Card className={cn('md:col-span-2 bg-gradient-to-br', scoreBg)}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Compliance Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn('text-5xl font-black', scoreColor)}>{score}</span>
                  <span className="text-lg text-slate-400">/ 100</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {scoreTrend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                  {scoreTrend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                  {scoreTrend === 'stable' && <Minus className="h-3.5 w-3.5 text-slate-400" />}
                  <span className="text-xs text-slate-400">
                    {scoreTrend === 'up' ? 'Improving' : scoreTrend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
              </div>
              {/* Score ring */}
              <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${score * 2.64} 264`}
                  />
                </svg>
                <span className={cn('absolute inset-0 flex items-center justify-center text-lg font-bold', scoreColor)}>
                  {score}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat cards */}
        {[
          { label: 'Analyses', value: stats.totalAnalyses, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open Findings', value: stats.openFindings, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Critical', value: stats.criticalFindings, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Resolved (Month)', value: stats.resolvedThisMonth, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attention Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFindings.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No outstanding compliance issues</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white"
                >
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    finding.severity === 'critical' ? 'bg-red-50' :
                    finding.severity === 'high' ? 'bg-orange-50' :
                    'bg-yellow-50'
                  )}>
                    <AlertTriangle className={cn(
                      'h-4 w-4',
                      finding.severity === 'critical' ? 'text-red-500' :
                      finding.severity === 'high' ? 'text-orange-500' :
                      'text-yellow-500'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{finding.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={finding.severity as any}>{finding.severity}</Badge>
                      <span className="text-xs text-slate-400">{finding.category}</span>
                    </div>
                  </div>
                  <Badge
                    variant={finding.status === 'open' ? 'destructive' : 'secondary'}
                    className="shrink-0"
                  >
                    {finding.status === 'in_progress' ? 'In Progress' : 'Open'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
