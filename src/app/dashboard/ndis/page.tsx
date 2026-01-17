'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  Loader2,
  Save,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Standard {
  id: string
  standard_number: number
  name: string
  description: string
  category: string
}

interface Compliance {
  id: string
  standard_id: string
  status: string
  evidence_notes: string | null
  last_reviewed: string | null
  next_review_date: string | null
}

const statusOptions = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-600', icon: Clock },
  { value: 'compliant', label: 'Compliant', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-100 text-red-600', icon: XCircle },
]

export default function NDISPage() {
  const [standards, setStandards] = useState<Standard[]>([])
  const [compliance, setCompliance] = useState<Record<string, Compliance>>({})
  const [loading, setLoading] = useState(true)
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch standards
      const { data: standardsData } = await supabase
        .from('ndis_standards')
        .select('*')
        .order('standard_number')

      // Fetch user compliance
      const { data: complianceData } = await supabase
        .from('ndis_compliance')
        .select('*')
        .eq('user_id', user.id)

      setStandards(standardsData || [])
      
      const complianceMap: Record<string, Compliance> = {}
      complianceData?.forEach((c: Compliance) => {
        complianceMap[c.standard_id] = c
      })
      setCompliance(complianceMap)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCompliance = async (standardId: string, status: string, notes?: string) => {
    setSaving(standardId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const existing = compliance[standardId]
      
      if (existing) {
        await (supabase.from('ndis_compliance') as any).update({
          status,
          evidence_notes: notes ?? existing.evidence_notes,
          last_reviewed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await (supabase.from('ndis_compliance') as any).insert({
          user_id: user.id,
          standard_id: standardId,
          status,
          evidence_notes: notes || null,
          last_reviewed: new Date().toISOString(),
        })
      }

      fetchData()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(null)
    }
  }

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0]
  }

  const stats = {
    total: standards.length,
    compliant: Object.values(compliance).filter(c => c.status === 'compliant').length,
    inProgress: Object.values(compliance).filter(c => c.status === 'in_progress').length,
    nonCompliant: Object.values(compliance).filter(c => c.status === 'non_compliant').length,
    notStarted: standards.length - Object.values(compliance).filter(c => c.status !== 'not_started').length,
  }

  const complianceScore = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0

  const coreStandards = standards.filter(s => s.category === 'Core')
  const supplementaryStandards = standards.filter(s => s.category === 'Supplementary')
  const highRiskStandards = standards.filter(s => s.category.includes('High Risk'))

  const filteredStandards = filter === 'all' 
    ? standards 
    : filter === 'core' 
    ? coreStandards 
    : filter === 'supplementary' 
    ? supplementaryStandards 
    : highRiskStandards

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NDIS Practice Standards</h1>
          <p className="text-muted-foreground mt-1">Track your compliance with all 19 NDIS Practice Standards</p>
        </div>
        <Badge className="text-lg px-4 py-2 bg-kwooka-ochre">
          {complianceScore}% Compliant
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Total Standards', value: stats.total, icon: Shield, color: 'text-blue-500 bg-blue-100' },
          { label: 'Compliant', value: stats.compliant, icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-500 bg-blue-100' },
          { label: 'Non-Compliant', value: stats.nonCompliant, icon: XCircle, color: 'text-red-500 bg-red-100' },
          { label: 'Not Started', value: stats.notStarted, icon: AlertTriangle, color: 'text-gray-500 bg-gray-100' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Compliance Progress</span>
            <span className="text-sm text-muted-foreground">{stats.compliant} of {stats.total} standards</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div className="bg-green-500 transition-all" style={{ width: `${(stats.compliant / stats.total) * 100}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(stats.nonCompliant / stats.total) * 100}%` }} />
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Compliant</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> In Progress</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> Non-Compliant</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded" /> Not Started</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: `All Standards (${standards.length})` },
          { value: 'core', label: `Core Module (${coreStandards.length})` },
          { value: 'supplementary', label: `Supplementary (${supplementaryStandards.length})` },
          { value: 'highrisk', label: `High Risk (${highRiskStandards.length})` },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
            className={cn(filter === f.value && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Standards List */}
      <div className="space-y-3">
        {filteredStandards.map((standard) => {
          const comp = compliance[standard.id]
          const status = comp?.status || 'not_started'
          const statusInfo = getStatusInfo(status)
          const StatusIcon = statusInfo.icon
          const isExpanded = expandedStandard === standard.id

          return (
            <Card key={standard.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedStandard(isExpanded ? null : standard.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', statusInfo.color)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-kwooka-ochre">#{standard.standard_number}</span>
                      <h3 className="font-semibold truncate">{standard.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{standard.description}</p>
                  </div>

                  <Badge variant="outline" className="shrink-0">{standard.category}</Badge>
                  <Badge className={cn(statusInfo.color, 'shrink-0')}>{statusInfo.label}</Badge>
                  
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-accent/30 p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Full Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{standard.description}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Compliance Status</Label>
                    <div className="flex gap-2 flex-wrap">
                      {statusOptions.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={status === opt.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateCompliance(standard.id, opt.value)}
                          disabled={saving === standard.id}
                          className={cn(status === opt.value && opt.color)}
                        >
                          {saving === standard.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <opt.icon className="h-4 w-4 mr-1" />
                          )}
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`notes-${standard.id}`} className="text-sm font-medium">Evidence Notes</Label>
                    <textarea
                      id={`notes-${standard.id}`}
                      defaultValue={comp?.evidence_notes || ''}
                      placeholder="Document your evidence, policies, procedures..."
                      rows={3}
                      className="mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== (comp?.evidence_notes || '')) {
                          updateCompliance(standard.id, status, e.target.value)
                        }
                      }}
                    />
                  </div>

                  {comp?.last_reviewed && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last reviewed: {new Date(comp.last_reviewed).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
