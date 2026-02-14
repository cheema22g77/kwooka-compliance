'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle2, Sparkles, Loader2, ArrowRight,
  TrendingUp, TrendingDown, Minus, Upload, Shield,
  Truck, Heart, Home, Briefcase, HardHat, Target, CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useSector } from '@/contexts/sector-context'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield, transport: Truck, healthcare: Heart,
  aged_care: Home, workplace: Briefcase, construction: HardHat,
}

export default function DashboardPage() {
  const { userSectors, primarySector, isLoading: sectorsLoading } = useSector()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [hasData, setHasData] = useState(false)
  const [score, setScore] = useState(0)
  const [scoreTrend, setScoreTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [findings, setFindings] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    openFindings: 0,
    criticalFindings: 0,
    documentsAnalysed: 0,
    resolvedThisMonth: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    if (!sectorsLoading) fetchData()
  }, [sectorsLoading, userSectors])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.full_name || '')

      // Fetch in parallel
      const [analysesResult, findingsResult] = await Promise.all([
        supabase
          .from('compliance_analyses')
          .select('overall_score, sector, created_at, document_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('findings')
          .select('id, title, severity, status, category, created_at, due_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      const analyses = analysesResult.data || []
      const allFindings = findingsResult.data || []
      const openFindings = allFindings.filter(f => f.status === 'open' || f.status === 'in_progress')

      setHasData(analyses.length > 0 || allFindings.length > 0)

      // Calculate compliance score (average of recent analyses)
      if (analyses.length > 0) {
        const avgScore = Math.round(
          analyses.slice(0, 10).reduce((sum, a) => sum + (a.overall_score || 0), 0) / Math.min(analyses.length, 10)
        )
        setScore(avgScore)

        // Trend: compare last 5 vs previous 5
        if (analyses.length >= 6) {
          const recent = analyses.slice(0, 5).reduce((s, a) => s + (a.overall_score || 0), 0) / 5
          const older = analyses.slice(5, 10).reduce((s, a) => s + (a.overall_score || 0), 0) / Math.min(analyses.slice(5, 10).length, 5)
          if (recent > older + 3) setScoreTrend('up')
          else if (recent < older - 3) setScoreTrend('down')
          else setScoreTrend('stable')
        }
      }

      // Get top urgent findings (critical + high, open)
      const urgentFindings = openFindings
        .filter(f => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
      setFindings(urgentFindings)

      // Stats
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      setStats({
        totalAnalyses: analyses.length,
        openFindings: openFindings.length,
        criticalFindings: openFindings.filter(f => f.severity === 'critical').length,
        documentsAnalysed: new Set(analyses.map(a => a.document_name)).size,
        resolvedThisMonth: allFindings.filter(f => f.status === 'resolved' && f.created_at >= monthStart).length,
      })
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
    setLoading(false)
  }

  if (loading || sectorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your compliance data...</p>
        </div>
      </div>
    )
  }

  // Empty state — guided onboarding
  if (!hasData) {
    return <EmptyDashboard userName={userName} />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-12 w-12 rounded-xl object-cover" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-500 mt-0.5">Here's your compliance overview</p>
        </div>
      </div>

      {/* Compliance Score — the hero */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-slate-50">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Score Ring */}
            <div className="relative">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 327} 327`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-900">{score}</span>
                <span className="text-xs text-slate-500 font-medium">out of 100</span>
              </div>
            </div>

            {/* Score Details */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <h2 className="text-lg font-semibold text-slate-900">Compliance Score</h2>
                {scoreTrend === 'up' && (
                  <Badge className="bg-green-100 text-green-700 gap-1"><TrendingUp className="h-3 w-3" /> Improving</Badge>
                )}
                {scoreTrend === 'down' && (
                  <Badge className="bg-red-100 text-red-700 gap-1"><TrendingDown className="h-3 w-3" /> Declining</Badge>
                )}
                {scoreTrend === 'stable' && (
                  <Badge className="bg-slate-100 text-slate-600 gap-1"><Minus className="h-3 w-3" /> Stable</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Based on {stats.totalAnalyses} {stats.totalAnalyses === 1 ? 'analysis' : 'analyses'} across {stats.documentsAnalysed} {stats.documentsAnalysed === 1 ? 'document' : 'documents'}
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-slate-900">{stats.openFindings}</p>
                  <p className="text-xs text-slate-500">Open findings</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-red-600">{stats.criticalFindings}</p>
                  <p className="text-xs text-slate-500">Critical</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedThisMonth}</p>
                  <p className="text-xs text-slate-500">Resolved this month</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      {findings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Needs Attention
              </CardTitle>
              <Link href="/dashboard/findings">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                    f.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  )}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{f.title}</p>
                    <p className="text-xs text-slate-500">{f.category}</p>
                  </div>
                  <Badge className={cn(
                    'shrink-0 capitalize text-xs',
                    f.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  )}>
                    {f.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/analysis">
          <Card className="hover:shadow-md hover:border-kwooka-ochre/30 transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-kwooka-ochre/10 flex items-center justify-center group-hover:bg-kwooka-ochre/20 transition-colors">
                <Sparkles className="h-5 w-5 text-kwooka-ochre" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Analyse</p>
                <p className="text-xs text-slate-500">Upload & score</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-kwooka-ochre transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/findings">
          <Card className="hover:shadow-md hover:border-kwooka-ochre/30 transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Findings</p>
                <p className="text-xs text-slate-500">{stats.openFindings} open</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-amber-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/calendar">
          <Card className="hover:shadow-md hover:border-kwooka-ochre/30 transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Calendar</p>
                <p className="text-xs text-slate-500">Deadlines & audits</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-blue-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

function EmptyDashboard({ userName }: { userName: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-10">
        <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-20 w-20 rounded-2xl object-cover mx-auto mb-5 shadow-lg" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-slate-500 text-lg">
          Let's get your compliance sorted. Three steps.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <Card className="border-2 border-kwooka-ochre/20 hover:border-kwooka-ochre/40 transition-colors">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-kwooka-ochre/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-kwooka-ochre">1</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Select your sector</h3>
              <p className="text-sm text-slate-500 mt-0.5">NDIS, Transport, Healthcare, Aged Care, Workplace Safety, or Construction</p>
            </div>
            <Link href="/dashboard/settings">
              <Button size="sm" variant="outline" className="shrink-0 gap-1">
                Set up <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="border-2 border-slate-200">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-slate-400">2</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Upload your first policy</h3>
              <p className="text-sm text-slate-500 mt-0.5">Any compliance document — policy, procedure, audit report, or risk assessment</p>
            </div>
            <Link href="/dashboard/analysis">
              <Button size="sm" variant="outline" className="shrink-0 gap-1">
                Upload <Upload className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="border-2 border-slate-200">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-slate-400">3</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Get your compliance score</h3>
              <p className="text-sm text-slate-500 mt-0.5">AI analyses your document in 60 seconds and creates trackable findings</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-8">
        <Link href="/dashboard/analysis">
          <Button size="lg" className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 text-white gap-2 px-8">
            <Sparkles className="h-4 w-4" />
            Start Your First Analysis
          </Button>
        </Link>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
