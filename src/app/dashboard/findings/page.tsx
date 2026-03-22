'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getSeverityColor, getStatusColor } from '@/lib/utils'

const severityOptions = ['All', 'critical', 'high', 'medium', 'low', 'info']
const CATEGORIES = ['Privacy', 'Security', 'Safety', 'HR', 'Legal', 'Training', 'Financial', 'Other']

export default function FindingsPage() {
  const [findings, setFindings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('All')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newFinding, setNewFinding] = useState({ title: '', description: '', severity: 'medium', category: 'Security', due_date: '' })
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  const fetchFindings = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('findings').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setFindings(data || [])
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFindings() }, [])

  const handleCreate = async () => {
    if (!newFinding.title || !newFinding.description) return
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await (supabase.from('findings') as any).insert({ user_id: user.id, title: newFinding.title, description: newFinding.description, severity: newFinding.severity, category: newFinding.category, due_date: newFinding.due_date || null, status: 'open' })
      setShowCreateDialog(false)
      setNewFinding({ title: '', description: '', severity: 'medium', category: 'Security', due_date: '' })
      fetchFindings()
    } catch (error) { console.error('Error:', error) }
    finally { setCreating(false) }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus }
      if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString()
      await (supabase.from('findings') as any).update(updates).eq('id', id)
      fetchFindings()
    } catch (error) { console.error('Error:', error) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this finding?')) return
    try { await supabase.from('findings').delete().eq('id', id); fetchFindings() }
    catch (error) { console.error('Error:', error) }
  }

  const filtered = findings.filter((f) => {
    const matchSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSev = selectedSeverity === 'All' || f.severity === selectedSeverity
    return matchSearch && matchSev
  })

  const stats = {
    total: findings.length,
    critical: findings.filter(f => f.severity === 'critical').length,
    open: findings.filter(f => f.status === 'open').length,
    overdue: findings.filter(f => f.due_date && new Date(f.due_date) < new Date() && f.status !== 'resolved').length,
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Findings</h1>
          <p className="text-muted-foreground mt-1">Track and manage compliance findings</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4" />Create Finding</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Findings', value: stats.total, icon: FileText, color: 'text-blue-500 bg-blue-100' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-500 bg-red-100' },
          { label: 'Open Issues', value: stats.open, icon: Clock, color: 'text-yellow-500 bg-yellow-100' },
          { label: 'Overdue', value: stats.overdue, icon: XCircle, color: 'text-orange-500 bg-orange-100' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.color)}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div></div></CardContent></Card>
          )
        })}
      </div>

      <Card><CardContent className="p-4"><div className="flex flex-col lg:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search findings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div><div className="flex gap-2 flex-wrap">{severityOptions.map((sev) => (<Button key={sev} variant={selectedSeverity === sev ? 'default' : 'outline'} size="sm" onClick={() => setSelectedSeverity(sev)} className={cn(selectedSeverity === sev && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90')}>{sev === 'All' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}</Button>))}</div></div></CardContent></Card>

      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-16 w-16 rounded-xl object-cover mx-auto mb-4 opacity-60" /><h3 className="font-medium text-lg mb-1">{findings.length === 0 ? 'No findings yet' : 'No matches'}</h3><p className="text-muted-foreground text-sm mb-4">{findings.length === 0 ? 'Analyse a document to generate findings' : 'Adjust filters'}</p>{findings.length === 0 && <Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />Create Finding</Button>}</CardContent></Card>
        ) : (
          filtered.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow"><CardContent className="p-6"><div className="flex flex-col lg:flex-row lg:items-start gap-4"><div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', f.severity === 'critical' && 'bg-red-100 text-red-600', f.severity === 'high' && 'bg-orange-100 text-orange-600', f.severity === 'medium' && 'bg-yellow-100 text-yellow-600', f.severity === 'low' && 'bg-blue-100 text-blue-600', f.severity === 'info' && 'bg-gray-100 text-gray-600')}><AlertTriangle className="h-5 w-5" /></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-lg">{f.title}</h3><p className="text-muted-foreground text-sm mt-1 line-clamp-2">{f.description}</p></div><div className="flex items-center gap-2 shrink-0"><Badge className={cn(getSeverityColor(f.severity), 'capitalize')}>{f.severity}</Badge><Badge className={cn(getStatusColor(f.status), 'capitalize')}>{f.status.replace('_', ' ')}</Badge></div></div><div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground"><span>{f.category}</span>{f.due_date && (<><span>•</span><div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>Due {formatDate(f.due_date)}</span></div></>)}<span>•</span><span>Created {formatDate(f.created_at)}</span></div></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleStatusChange(f.id, 'in_progress')}>Mark In Progress</DropdownMenuItem><DropdownMenuItem onClick={() => handleStatusChange(f.id, 'resolved')}>Mark Resolved</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(f.id)} className="text-destructive">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></CardContent></Card>
          ))
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} /><div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-semibold">Create Finding</h2><Button variant="ghost" size="icon" onClick={() => setShowCreateDialog(false)}><X className="h-5 w-5" /></Button></div><div className="space-y-4"><div className="space-y-2"><Label htmlFor="title">Title *</Label><Input id="title" value={newFinding.title} onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })} placeholder="e.g., Missing data breach procedure" /></div><div className="space-y-2"><Label htmlFor="description">Description *</Label><textarea id="description" value={newFinding.description} onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })} placeholder="Describe the issue..." rows={3} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Severity</Label><select value={newFinding.severity} onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="info">Info</option></select></div><div className="space-y-2"><Label>Category</Label><select value={newFinding.category} onChange={(e) => setNewFinding({ ...newFinding, category: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div></div><div className="space-y-2"><Label>Due Date</Label><Input type="date" value={newFinding.due_date} onChange={(e) => setNewFinding({ ...newFinding, due_date: e.target.value })} /></div></div><div className="flex justify-end gap-3 mt-6"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreate} disabled={!newFinding.title || !newFinding.description || creating}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Create</Button></div></div></div>
      )}
    </div>
  )
}
// Force rebuild Sat 17 Jan 2026 18:43:47 AWST
