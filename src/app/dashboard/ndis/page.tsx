'use client'

import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronDown, ChevronRight, Loader2, FileDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const statusOptions = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-600', icon: Clock },
  { value: 'compliant', label: 'Compliant', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-100 text-red-600', icon: XCircle },
]

export default function NDISPage() {
  const [standards, setStandards] = useState<any[]>([])
  const [compliance, setCompliance] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: standardsData } = await supabase
        .from('ndis_standards')
        .select('*')
        .order('standard_number')

      const { data: complianceData } = await supabase
        .from('ndis_compliance')
        .select('*')
        .eq('user_id', user.id)

      setStandards(standardsData || [])
      
      const complianceMap: Record<string, any> = {}
      if (complianceData) {
        complianceData.forEach((c: any) => {
          complianceMap[c.standard_id] = c
        })
      }
      setCompliance(complianceMap)
    } catch (err) {
      console.error('Error:', err)
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
    } catch (err) {
      console.error('Update error:', err)
    } finally {
      setSaving(null)
    }
  }

  const exportReport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Kwooka Health Services',
          standards,
          compliance,
          generatedAt: new Date().toLocaleDateString('en-AU', { dateStyle: 'full' })
        })
      })
      
      const html = await response.text()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        setTimeout(() => printWindow.print(), 500)
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const compliantCount = Object.values(compliance).filter((c: any) => c.status === 'compliant').length
  const inProgressCount = Object.values(compliance).filter((c: any) => c.status === 'in_progress').length
  const nonCompliantCount = Object.values(compliance).filter((c: any) => c.status === 'non_compliant').length
  const notStartedCount = standards.length - compliantCount - inProgressCount - nonCompliantCount
  const complianceScore = standards.length > 0 ? Math.round((compliantCount / standards.length) * 100) : 0

  const filteredStandards = filter === 'all' ? standards 
    : filter === 'core' ? standards.filter(s => s.category === 'Core')
    : filter === 'supplementary' ? standards.filter(s => s.category === 'Supplementary')
    : standards.filter(s => s.category?.includes('High Risk'))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NDIS Practice Standards</h1>
          <p className="text-muted-foreground mt-1">Track compliance with all 19 NDIS Practice Standards</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={exportReport} disabled={exporting} variant="outline" size="sm">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
          <Badge className="text-lg px-4 py-2 bg-kwooka-ochre">{complianceScore}% Compliant</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-blue-500 bg-blue-100"><Shield className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{standards.length}</p><p className="text-xs text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-green-500 bg-green-100"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{compliantCount}</p><p className="text-xs text-muted-foreground">Compliant</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-blue-500 bg-blue-100"><Clock className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{inProgressCount}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 bg-red-100"><XCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{nonCompliantCount}</p><p className="text-xs text-muted-foreground">Non-Compliant</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 bg-gray-100"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{notStartedCount}</p><p className="text-xs text-muted-foreground">Not Started</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{compliantCount} of {standards.length}</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full" style={{ width: `${(compliantCount / Math.max(standards.length, 1)) * 100}%` }} />
            <div className="bg-blue-500 h-full" style={{ width: `${(inProgressCount / Math.max(standards.length, 1)) * 100}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${(nonCompliantCount / Math.max(standards.length, 1)) * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {['all', 'core', 'supplementary', 'highrisk'].map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className={cn(filter === f && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}>
            {f === 'all' ? 'All' : f === 'core' ? 'Core' : f === 'supplementary' ? 'Supplementary' : 'High Risk'}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredStandards.map((standard) => {
          const comp = compliance[standard.id]
          const status = comp?.status || 'not_started'
          const statusInfo = getStatusInfo(status)
          const StatusIcon = statusInfo.icon
          const isExpanded = expandedStandard === standard.id

          return (
            <Card key={standard.id}>
              <div className="p-4 cursor-pointer hover:bg-accent/50" onClick={() => setExpandedStandard(isExpanded ? null : standard.id)}>
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
                  <Badge variant="outline">{standard.category}</Badge>
                  <Badge className={cn(statusInfo.color)}>{statusInfo.label}</Badge>
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t bg-accent/30 p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{standard.description}</p>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Status</Label>
                    <div className="flex gap-2 flex-wrap">
                      {statusOptions.map((opt) => (
                        <Button key={opt.value} variant={status === opt.value ? 'default' : 'outline'} size="sm" onClick={() => updateCompliance(standard.id, opt.value)} disabled={saving === standard.id} className={cn(status === opt.value && opt.color)}>
                          {saving === standard.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <opt.icon className="h-4 w-4 mr-1" />}
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Evidence Notes</Label>
                    <textarea 
                      defaultValue={comp?.evidence_notes || ''} 
                      placeholder="Document your evidence..." 
                      rows={3} 
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" 
                      onBlur={(e) => { 
                        if (e.target.value !== (comp?.evidence_notes || '')) {
                          updateCompliance(standard.id, status, e.target.value) 
                        }
                      }} 
                    />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
