'use client'

import React, { useState, useEffect } from 'react'
import {
  History, FileText, Search, Filter, Loader2, ChevronRight,
  TrendingUp, TrendingDown, Minus, Calendar, Download, Eye,
  AlertTriangle, CheckCircle2, XCircle, BarChart3, ArrowLeft,
  Shield, Truck, Heart, Home, Briefcase, HardHat, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import { exportAnalysisReport } from '@/lib/pdf/export-report'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield,
  transport: Truck,
  healthcare: Heart,
  aged_care: Home,
  workplace: Briefcase,
  construction: HardHat,
}

interface AnalysisRecord {
  id: string
  sector: string
  document_type: string
  document_name: string
  overall_score: number
  overall_status: string
  risk_level: string
  summary: string
  findings: any[]
  strengths: any[]
  critical_gaps: string[]
  action_plan: any[]
  compliance_by_area: any[]
  raw_analysis: any
  created_at: string
}

export default function AnalysisHistoryPage() {
  const { userSectors } = useSector()
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('compliance_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching analyses:', error)
      } else {
        setAnalyses(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async (analysis: AnalysisRecord) => {
    setExporting(analysis.id)
    try {
      // Reconstruct the analysis object for the export function
      const exportData = {
        ...analysis.raw_analysis,
        sector: analysis.sector,
        sectorName: ALL_SECTORS.find(s => s.id === analysis.sector)?.name || analysis.sector,
        overallScore: analysis.overall_score,
        overallStatus: analysis.overall_status,
        riskLevel: analysis.risk_level,
        summary: analysis.summary,
        findings: analysis.findings,
        strengths: analysis.strengths,
        criticalGaps: analysis.critical_gaps,
        actionPlan: analysis.action_plan,
        complianceByArea: analysis.compliance_by_area,
      }
      exportAnalysisReport(exportData, analysis.document_name)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(null)
    }
  }

  // Filter analyses
  const filteredAnalyses = analyses.filter((a) => {
    const matchesSearch = 
      a.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSector = selectedSector === 'all' || a.sector === selectedSector
    return matchesSearch && matchesSector
  })

  // Calculate stats
  const stats = {
    total: analyses.length,
    avgScore: analyses.length > 0 
      ? Math.round(analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analyses.length)
      : 0,
    compliant: analyses.filter(a => a.overall_status === 'COMPLIANT').length,
    critical: analyses.filter(a => a.risk_level === 'CRITICAL' || a.risk_level === 'HIGH').length,
  }

  // Trend data for chart (last 10 analyses reversed for chronological order)
  const trendData = [...analyses]
    .slice(0, 10)
    .reverse()
    .map((a, i) => ({
      name: new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      score: a.overall_score || 0,
    }))

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-amber-100'
    return 'bg-red-100'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <Badge className="bg-green-100 text-green-700">Compliant</Badge>
      case 'PARTIAL':
        return <Badge className="bg-amber-100 text-amber-700">Partial</Badge>
      case 'NON_COMPLIANT':
        return <Badge className="bg-red-100 text-red-700">Non-Compliant</Badge>
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return <Badge variant="outline" className="text-green-600 border-green-300">Low Risk</Badge>
      case 'MEDIUM':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Medium Risk</Badge>
      case 'HIGH':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">High Risk</Badge>
      case 'CRITICAL':
        return <Badge variant="outline" className="text-red-600 border-red-300">Critical Risk</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analysis">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-kwooka-ochre" />
              Analysis History
            </h1>
            <p className="text-muted-foreground">View and compare your past compliance analyses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalyses}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/dashboard/analysis">
            <Button className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-lg', getScoreBg(stats.avgScore))}>
                <BarChart3 className={cn('h-6 w-6', getScoreColor(stats.avgScore))} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', getScoreColor(stats.avgScore))}>{stats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
                <p className="text-sm text-muted-foreground">Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">High/Critical Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-kwooka-ochre" />
              Compliance Score Trend
            </CardTitle>
            <CardDescription>Your last {trendData.length} analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, "Score"]}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#f97316" 
                    fill="#f9731620" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by document name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedSector === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSector('all')}
                className={cn(selectedSector === 'all' && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}
              >
                All Sectors
              </Button>
              {ALL_SECTORS.filter(s => userSectors.includes(s.id)).map((sector) => {
                const Icon = SECTOR_ICONS[sector.id]
                return (
                  <Button
                    key={sector.id}
                    variant={selectedSector === sector.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSector(sector.id)}
                    className={cn(
                      'gap-1',
                      selectedSector === sector.id && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {sector.name}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis List */}
      {filteredAnalyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-1">
              {analyses.length === 0 ? 'No analyses yet' : 'No matching analyses'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {analyses.length === 0 
                ? 'Run your first compliance analysis to see it here'
                : 'Try adjusting your search or filters'
              }
            </p>
            {analyses.length === 0 && (
              <Link href="/dashboard/analysis">
                <Button className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                  Start Analysis
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => {
            const SectorIcon = SECTOR_ICONS[analysis.sector] || FileText
            const sectorInfo = ALL_SECTORS.find(s => s.id === analysis.sector)
            
            return (
              <Card 
                key={analysis.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAnalysis(selectedAnalysis?.id === analysis.id ? null : analysis)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Sector Icon & Score */}
                    <div className="flex items-center gap-4">
                      <div className={cn('p-3 rounded-xl', sectorInfo?.color || 'bg-slate-500')}>
                        <SectorIcon className="h-6 w-6 text-white" />
                      </div>
                      <div className={cn(
                        'flex items-center justify-center h-14 w-14 rounded-full font-bold text-lg',
                        getScoreBg(analysis.overall_score),
                        getScoreColor(analysis.overall_score)
                      )}>
                        {analysis.overall_score}%
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold truncate">{analysis.document_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {sectorInfo?.name} • {analysis.document_type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(analysis.overall_status)}
                          {getRiskBadge(analysis.risk_level)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {analysis.summary}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(analysis.created_at)}
                        </span>
                        <span>
                          {analysis.findings?.length || 0} findings
                        </span>
                        <span>
                          {analysis.critical_gaps?.length || 0} critical gaps
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExportPDF(analysis)
                        }}
                        disabled={exporting === analysis.id}
                      >
                        {exporting === analysis.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <ChevronRight className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        selectedAnalysis?.id === analysis.id && 'rotate-90'
                      )} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedAnalysis?.id === analysis.id && (
                    <div className="mt-6 pt-6 border-t space-y-4">
                      {/* Compliance by Area */}
                      {analysis.compliance_by_area && analysis.compliance_by_area.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Compliance by Area</h4>
                          <div className="space-y-2">
                            {analysis.compliance_by_area.map((area: any, i: number) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-32 text-sm truncate">{area.area}</div>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      'h-full rounded-full',
                                      area.score >= 80 ? 'bg-green-500' : 
                                      area.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${area.score}%` }}
                                  />
                                </div>
                                <div className="w-12 text-sm text-right font-medium">
                                  {area.score}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Critical Gaps */}
                      {analysis.critical_gaps && analysis.critical_gaps.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Critical Gaps
                          </h4>
                          <ul className="space-y-1">
                            {analysis.critical_gaps.map((gap: string, i: number) => (
                              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Strengths */}
                      {analysis.strengths && analysis.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Strengths
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {analysis.strengths.slice(0, 4).map((strength: any, i: number) => (
                              <div key={i} className="text-sm p-2 bg-green-50 rounded-lg">
                                <span className="font-medium text-green-700">{strength.area}:</span>{' '}
                                <span className="text-green-600">{strength.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}