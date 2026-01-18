'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, AlertTriangle, CheckCircle2, TrendingUp, Shield, Sparkles,
  Loader2, Plus, BarChart3, PieChart, Activity, Target, ArrowRight,
  RefreshCw, Truck, Heart, Home, Briefcase, HardHat,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield, transport: Truck, healthcare: Heart,
  aged_care: Home, workplace: Briefcase, construction: HardHat,
}

export default function DashboardPage() {
  const { userSectors, primarySector, getUserSectorObjects, isLoading: sectorsLoading } = useSector()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState({
    totalDocuments: 0, openFindings: 0, criticalFindings: 0,
    highFindings: 0, mediumFindings: 0, lowFindings: 0,
    complianceScore: 0, resolvedThisMonth: 0, totalAnalyses: 0,
  })
  const [sectorCompliance, setSectorCompliance] = useState<any[]>([])
  const [complianceTrend, setComplianceTrend] = useState<any[]>([])

  const supabase = createClient()
  const availableSectors = getUserSectorObjects()
  const hasSingleSector = availableSectors.length === 1
  const primarySectorInfo = ALL_SECTORS.find(s => s.id === primarySector)

  useEffect(() => {
    if (!sectorsLoading) {
      fetchDashboardData()
    }
  }, [sectorsLoading, userSectors])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.full_name || '')

      // Fetch data in parallel
      const [docsResult, findingsResult, analysesResult] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('findings').select('severity, status').eq('user_id', user.id),
        supabase.from('compliance_analyses')
          .select('sector, overall_score, created_at')
          .eq('user_id', user.id)
          .in('sector', userSectors)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const findings = findingsResult.data || []
      const analyses = analysesResult.data || []
      const openFindings = findings.filter(f => f.status === 'open' || f.status === 'in_progress')

      // Calculate stats
      const avgScore = analyses.length > 0 
        ? Math.round(analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analyses.length)
        : 0

      // Sector compliance
      const sectorMap = new Map<string, number[]>()
      analyses.forEach(a => {
        if (userSectors.includes(a.sector)) {
          const scores = sectorMap.get(a.sector) || []
          scores.push(a.overall_score || 0)
          sectorMap.set(a.sector, scores)
        }
      })

      const sectorData = userSectors.map(sectorId => {
        const scores = sectorMap.get(sectorId) || []
        const sectorInfo = ALL_SECTORS.find(s => s.id === sectorId)
        return {
          sector: sectorInfo?.name || sectorId,
          sectorId,
          score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          hasData: scores.length > 0
        }
      }).filter(s => s.hasData)

      // Compliance trend (simplified)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const now = new Date()
      const trend = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthAnalyses = analyses.filter(a => {
          const aDate = new Date(a.created_at)
          return aDate.getMonth() === date.getMonth() && aDate.getFullYear() === date.getFullYear()
        })
        const avg = monthAnalyses.length > 0
          ? Math.round(monthAnalyses.reduce((s, a) => s + (a.overall_score || 0), 0) / monthAnalyses.length)
          : 0
        trend.push({ month: months[date.getMonth()], score: avg })
      }

      setStats({
        totalDocuments: docsResult.count || 0,
        openFindings: openFindings.length,
        criticalFindings: openFindings.filter(f => f.severity === 'critical').length,
        highFindings: openFindings.filter(f => f.severity === 'high').length,
        mediumFindings: openFindings.filter(f => f.severity === 'medium').length,
        lowFindings: openFindings.filter(f => f.severity === 'low').length,
        complianceScore: avgScore,
        resolvedThisMonth: findings.filter(f => f.status === 'resolved').length,
        totalAnalyses: analyses.length,
      })
      setSectorCompliance(sectorData)
      setComplianceTrend(trend)
    } catch (error) {
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const getScoreBg = (score: number) => score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'

  const findingsBySeverity = [
    { name: 'Critical', value: stats.criticalFindings, color: '#ef4444' },
    { name: 'High', value: stats.highFindings, color: '#f97316' },
    { name: 'Medium', value: stats.mediumFindings, color: '#eab308' },
    { name: 'Low', value: stats.lowFindings, color: '#3b82f6' },
  ].filter(f => f.value > 0)

  if (loading || sectorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back{userName ? `, ${userName}` : ''}! 👋</h1>
          <p className="text-muted-foreground">
            {hasSingleSector ? `Your ${primarySectorInfo?.name} compliance overview` : 'Your compliance overview'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="icon" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/analysis">
            <Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />AI Analysis</Button>
          </Link>
          <Link href="/dashboard/documents">
            <Button className="gap-2 bg-kwooka-ochre hover:bg-kwooka-ochre/90"><Plus className="h-4 w-4" />Upload</Button>
          </Link>
        </div>
      </div>

      {/* Sector Badge */}
      {hasSingleSector && primarySectorInfo && (
        <Card className="bg-gradient-to-r from-kwooka-ochre/5 to-amber-500/5 border-kwooka-ochre/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl', primarySectorInfo.color)}>
                  {React.createElement(SECTOR_ICONS[primarySectorInfo.id], { className: 'h-6 w-6 text-white' })}
                </div>
                <div>
                  <p className="font-semibold">{primarySectorInfo.name} Compliance Dashboard</p>
                  <p className="text-sm text-muted-foreground">{primarySectorInfo.description}</p>
                </div>
              </div>
              <Link href="/dashboard/settings/sectors">
                <Button variant="ghost" size="sm" className="text-kwooka-ochre">Manage Sectors</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{hasSingleSector ? `${primarySectorInfo?.name} Score` : 'Compliance Score'}</p>
                <span className={cn("text-3xl font-bold", stats.complianceScore > 0 ? getScoreColor(stats.complianceScore) : 'text-slate-400')}>
                  {stats.complianceScore > 0 ? `${stats.complianceScore}%` : 'N/A'}
                </span>
              </div>
              <div className={cn("h-14 w-14 rounded-full flex items-center justify-center", stats.complianceScore > 0 ? getScoreBg(stats.complianceScore) : 'bg-slate-300')}>
                <Target className="h-7 w-7 text-white" />
              </div>
            </div>
            {stats.totalAnalyses === 0 && (
              <Link href="/dashboard/analysis" className="mt-2 text-xs text-kwooka-ochre hover:underline block">Run your first analysis →</Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Findings</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.openFindings}</span>
                  {stats.criticalFindings > 0 && <Badge variant="destructive">{stats.criticalFindings} critical</Badge>}
                </div>
              </div>
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <span className="text-3xl font-bold">{stats.totalDocuments}</span>
              </div>
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <span className="text-3xl font-bold text-green-600">{stats.resolvedThisMonth}</span>
              </div>
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-kwooka-ochre" />
              Compliance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {complianceTrend.some(d => d.score > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={complianceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Area type="monotone" dataKey="score" stroke="#f97316" fill="#f9731620" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="h-12 w-12 mb-3 opacity-50" />
                  <p>No data yet</p>
                  <Link href="/dashboard/analysis"><Button variant="outline" size="sm" className="mt-3">Run Analysis</Button></Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-kwooka-ochre" />
              Findings by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              {findingsBySeverity.length > 0 ? (
                <>
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={180}>
                      <RechartsPie>
                        <Pie data={findingsBySeverity} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                          {findingsBySeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2">
                    {findingsBySeverity.map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full flex flex-col items-center justify-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-3 text-green-500" />
                  <p className="text-green-600 font-medium">No open findings!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Compliance */}
      {sectorCompliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance by Sector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sectorCompliance.map(sector => (
              <div key={sector.sectorId} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{sector.sector}</div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getScoreBg(sector.score))} style={{ width: `${sector.score}%` }} />
                </div>
                <div className={cn("w-12 text-right font-medium", getScoreColor(sector.score))}>{sector.score}%</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/analysis">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Analyze Document</p>
                  <p className="text-xs text-muted-foreground">AI compliance check</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/copilot">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Ask Kwooka AI</p>
                  <p className="text-xs text-muted-foreground">Get advice</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/generator">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Generate Policy</p>
                  <p className="text-xs text-muted-foreground">Create documents</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/findings">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Review Findings</p>
                  <p className="text-xs text-muted-foreground">Manage issues</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
