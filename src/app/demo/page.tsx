'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronDown, ChevronRight, FileDown, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const statusOptions = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-600', icon: Clock },
  { value: 'compliant', label: 'Compliant', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-100 text-red-600', icon: XCircle },
]

// Demo NDIS Practice Standards — real requirements, hardcoded data
const DEMO_STANDARDS = [
  {
    id: '1', standard_number: 1, name: 'Rights and Responsibilities',
    description: 'Each participant accesses supports that promote, uphold and respect their legal and human rights and is enabled to exercise informed choice and control.',
    category: 'Core',
  },
  {
    id: '2', standard_number: 2, name: 'Person-Centred Supports',
    description: 'Each participant accesses supports that are responsive to their individual needs and goals, and which promote their independence.',
    category: 'Core',
  },
  {
    id: '3', standard_number: 3, name: 'Provision of Supports',
    description: 'Each participant accesses competent supports, delivered safely and in accordance with best practice standards.',
    category: 'Core',
  },
  {
    id: '4', standard_number: 4, name: 'Support Provision Environment',
    description: 'Each participant accesses supports in a safe and accessible environment that promotes independence and is appropriate to their needs.',
    category: 'Core',
  },
  {
    id: '5', standard_number: 5, name: 'Governance and Operational Management',
    description: 'Each participant is supported by an organisation that is governed and managed to deliver safe, quality supports.',
    category: 'Core',
  },
  {
    id: '6', standard_number: 6, name: 'Information Management',
    description: 'Each participant\'s information is managed so as to uphold privacy and confidentiality.',
    category: 'Core',
  },
  {
    id: '7', standard_number: 7, name: 'Feedback and Complaints Management',
    description: 'Each participant has access to a complaints process that is responsive and appropriate.',
    category: 'Core',
  },
  {
    id: '8', standard_number: 8, name: 'Human Resource Management',
    description: 'Each participant\'s supports are delivered by competent and qualified workers.',
    category: 'Core',
  },
  {
    id: '9', standard_number: 9, name: 'Continuity of Supports',
    description: 'Each participant receives supports which are planned for and managed so as to minimise disruption.',
    category: 'Core',
  },
  {
    id: '10', standard_number: 10, name: 'Risk Management',
    description: 'Risks to participants, workers and the organisation are identified and managed appropriately.',
    category: 'Supplementary',
  },
  {
    id: '11', standard_number: 11, name: 'Incident Management',
    description: 'Incidents and reportable incidents are identified, managed, resolved and reported.',
    category: 'Supplementary',
  },
  {
    id: '12', standard_number: 12, name: 'Worker Screening',
    description: 'Workers are screened and found suitable to deliver supports to participants.',
    category: 'Supplementary',
  },
  {
    id: '13', standard_number: 13, name: 'Emergency and Disaster Management',
    description: 'Emergency and disaster management plans are in place to protect participants, workers and the community.',
    category: 'Supplementary',
  },
  {
    id: '14', standard_number: 14, name: 'Restrictive Practices',
    description: 'Restrictive practices are only used as a last resort in response to risk of harm and in accordance with legislation.',
    category: 'High Risk',
  },
  {
    id: '15', standard_number: 15, name: 'Behaviour Support',
    description: 'Each participant who requires behaviour support has access to a behaviour support plan that is evidence-based and person-centred.',
    category: 'High Risk',
  },
  {
    id: '16', standard_number: 16, name: 'Specialist Disability Accommodation',
    description: 'Each participant accessing SDA has a home that is appropriate to their needs and promotes independence.',
    category: 'Supplementary',
  },
  {
    id: '17', standard_number: 17, name: 'Early Childhood Supports',
    description: 'Each child and their family receives evidence-based early childhood supports.',
    category: 'Supplementary',
  },
  {
    id: '18', standard_number: 18, name: 'Mealtime Management',
    description: 'Each participant who requires mealtime management has safe and appropriate supports.',
    category: 'High Risk',
  },
  {
    id: '19', standard_number: 19, name: 'Verification Modules',
    description: 'Requirements for lower-risk registration groups verified through a self-assessment and declaration.',
    category: 'Supplementary',
  },
]

// Demo compliance — pre-populated to show a realistic mix
const INITIAL_COMPLIANCE: Record<string, { status: string; notes: string }> = {
  '1': { status: 'compliant', notes: 'Rights policy reviewed and updated March 2025. All participants have signed consent forms.' },
  '2': { status: 'compliant', notes: 'Individual plans in place for all active participants.' },
  '3': { status: 'in_progress', notes: 'Staff competency framework being updated. Target completion: April 2025.' },
  '4': { status: 'compliant', notes: 'All premises meet accessibility standards. Annual fire safety check completed.' },
  '5': { status: 'in_progress', notes: 'Governance framework review underway with board.' },
  '6': { status: 'compliant', notes: 'Privacy policy current. All records stored in compliant systems.' },
  '7': { status: 'compliant', notes: 'Complaints register maintained. Zero unresolved complaints.' },
  '8': { status: 'in_progress', notes: '3 staff pending updated qualifications. Due by end of Q2.' },
  '9': { status: 'compliant', notes: 'Continuity plans documented for all participants.' },
  '10': { status: 'in_progress', notes: 'Risk register being migrated to new system.' },
  '11': { status: 'non_compliant', notes: 'CRITICAL: Incident reporting to NDIS Commission not within 24-hour requirement for 2 incidents in January.' },
  '12': { status: 'compliant', notes: 'All worker screening checks current. Renewal tracker active.' },
  '13': { status: 'in_progress', notes: 'Emergency plan drafted, pending board approval.' },
  '14': { status: 'non_compliant', notes: 'Restrictive practices register needs updating. 1 participant plan overdue for review.' },
  '15': { status: 'in_progress', notes: 'Behaviour support practitioner engaged. 2 plans being developed.' },
  '16': { status: 'not_started', notes: '' },
  '17': { status: 'not_started', notes: '' },
  '18': { status: 'not_started', notes: '' },
  '19': { status: 'compliant', notes: 'Self-assessment completed and submitted.' },
}

export default function DemoPage() {
  const [compliance, setCompliance] = useState(INITIAL_COMPLIANCE)
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const updateCompliance = (standardId: string, status: string, notes?: string) => {
    setCompliance(prev => ({
      ...prev,
      [standardId]: {
        status,
        notes: notes ?? prev[standardId]?.notes ?? '',
      }
    }))
  }

  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0]

  const standards = DEMO_STANDARDS
  const compliantCount = Object.values(compliance).filter(c => c.status === 'compliant').length
  const inProgressCount = Object.values(compliance).filter(c => c.status === 'in_progress').length
  const nonCompliantCount = Object.values(compliance).filter(c => c.status === 'non_compliant').length
  const notStartedCount = standards.length - compliantCount - inProgressCount - nonCompliantCount
  const complianceScore = Math.round((compliantCount / standards.length) * 100)

  const filteredStandards = filter === 'all' ? standards
    : filter === 'core' ? standards.filter(s => s.category === 'Core')
    : filter === 'supplementary' ? standards.filter(s => s.category === 'Supplementary')
    : standards.filter(s => s.category === 'High Risk')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-kwooka-charcoal to-kwooka-rust text-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <span className="font-semibold text-sm">Kwooka Compliance — Live Demo</span>
              <span className="text-white/60 text-xs ml-2">Interactive, no signup required</span>
            </div>
          </div>
          <Link href="/auth/signup">
            <Button size="sm" className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 text-white gap-1.5 text-xs">
              Start Free <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">NDIS Practice Standards</h1>
              <p className="text-slate-500 mt-0.5 text-sm">Track compliance with all 19 NDIS Practice Standards</p>
            </div>
          </div>
          <Badge className="text-lg px-5 py-2 bg-kwooka-ochre shrink-0 self-start sm:self-auto">{complianceScore}% Compliant</Badge>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-blue-500 bg-blue-100"><Shield className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{standards.length}</p><p className="text-xs text-slate-500">Total</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-green-500 bg-green-100"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{compliantCount}</p><p className="text-xs text-slate-500">Compliant</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-blue-500 bg-blue-100"><Clock className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{inProgressCount}</p><p className="text-xs text-slate-500">In Progress</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 bg-red-100"><XCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{nonCompliantCount}</p><p className="text-xs text-slate-500">Non-Compliant</p></div></div></CardContent></Card>
          <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 bg-gray-100"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{notStartedCount}</p><p className="text-xs text-slate-500">Not Started</p></div></div></CardContent></Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progress</span>
              <span className="text-sm text-slate-500">{compliantCount} of {standards.length}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(compliantCount / standards.length) * 100}%` }} />
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(inProgressCount / standards.length) * 100}%` }} />
              <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(nonCompliantCount / standards.length) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Compliant</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> In Progress</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Non-Compliant</span>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'core', 'supplementary', 'highrisk'].map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className={cn(filter === f && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}>
              {f === 'all' ? 'All Standards' : f === 'core' ? 'Core' : f === 'supplementary' ? 'Supplementary' : 'High Risk'}
            </Button>
          ))}
        </div>

        {/* Standards List */}
        <div className="space-y-3">
          {filteredStandards.map(standard => {
            const comp = compliance[standard.id]
            const status = comp?.status || 'not_started'
            const statusInfo = getStatusInfo(status)
            const StatusIcon = statusInfo.icon
            const isExpanded = expandedStandard === standard.id

            return (
              <Card key={standard.id}>
                <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedStandard(isExpanded ? null : standard.id)}>
                  <div className="flex items-center gap-4">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', statusInfo.color)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-kwooka-ochre">#{standard.standard_number}</span>
                        <h3 className="font-semibold truncate text-slate-900">{standard.name}</h3>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{standard.description}</p>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex">{standard.category}</Badge>
                    <Badge className={cn(statusInfo.color, 'shrink-0')}>{statusInfo.label}</Badge>
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t bg-slate-50/50 p-5 space-y-4">
                    <p className="text-sm text-slate-600">{standard.description}</p>
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-slate-700">Status</Label>
                      <div className="flex gap-2 flex-wrap">
                        {statusOptions.map(opt => (
                          <Button
                            key={opt.value}
                            variant={status === opt.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateCompliance(standard.id, opt.value)}
                            className={cn(status === opt.value && opt.color)}
                          >
                            <opt.icon className="h-4 w-4 mr-1" />
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Evidence Notes</Label>
                      <textarea
                        defaultValue={comp?.notes || ''}
                        placeholder="Document your evidence..."
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kwooka-ochre/30"
                        onBlur={(e) => {
                          if (e.target.value !== (comp?.notes || '')) {
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

        {/* CTA Footer */}
        <Card className="border-kwooka-ochre/20 bg-gradient-to-r from-kwooka-ochre/5 to-amber-50">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-14 w-14 rounded-xl object-cover" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-slate-900">Ready to track your own compliance?</h3>
              <p className="text-sm text-slate-500 mt-0.5">Upload real documents, get AI analysis, and generate audit-ready reports.</p>
            </div>
            <Link href="/auth/signup">
              <Button className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 gap-2 whitespace-nowrap">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
