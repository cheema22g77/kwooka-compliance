'use client'

import React, { useState, useEffect } from 'react'
import {
  Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSector } from '@/contexts/sector-context'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'finding_due' | 'audit_cycle' | 'custom'
  severity?: string
  status?: string
  sector?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Sector-specific compliance cycles (Australian regulatory calendar)
const COMPLIANCE_CYCLES: Record<string, { title: string; month: number; day: number; recurring: boolean }[]> = {
  ndis: [
    { title: 'NDIS Practice Standards self-assessment due', month: 6, day: 30, recurring: true },
    { title: 'Worker Screening renewals check', month: 3, day: 1, recurring: true },
    { title: 'Incident reporting quarterly review', month: 3, day: 31, recurring: true },
    { title: 'Incident reporting quarterly review', month: 6, day: 30, recurring: true },
    { title: 'Incident reporting quarterly review', month: 9, day: 30, recurring: true },
    { title: 'Incident reporting quarterly review', month: 12, day: 31, recurring: true },
  ],
  transport: [
    { title: 'NHVAS annual compliance review', month: 7, day: 1, recurring: true },
    { title: 'Fatigue management plan review', month: 1, day: 31, recurring: true },
    { title: 'Chain of Responsibility audit', month: 6, day: 30, recurring: true },
    { title: 'Vehicle maintenance schedule review', month: 3, day: 31, recurring: true },
  ],
  healthcare: [
    { title: 'NSQHS Standards self-assessment', month: 6, day: 30, recurring: true },
    { title: 'Clinical governance review', month: 3, day: 31, recurring: true },
    { title: 'Infection control audit', month: 6, day: 30, recurring: true },
    { title: 'Medication management review', month: 9, day: 30, recurring: true },
  ],
  aged_care: [
    { title: 'Aged Care Quality Standards review', month: 6, day: 30, recurring: true },
    { title: 'SIRS quarterly reporting', month: 3, day: 31, recurring: true },
    { title: 'SIRS quarterly reporting', month: 6, day: 30, recurring: true },
    { title: 'SIRS quarterly reporting', month: 9, day: 30, recurring: true },
    { title: 'SIRS quarterly reporting', month: 12, day: 31, recurring: true },
  ],
  workplace: [
    { title: 'Annual WHS management plan review', month: 7, day: 1, recurring: true },
    { title: 'Hazard register quarterly review', month: 3, day: 31, recurring: true },
    { title: 'Emergency procedures test', month: 6, day: 30, recurring: true },
    { title: 'Worker consultation meeting', month: 3, day: 15, recurring: true },
  ],
  construction: [
    { title: 'Safe Work Method Statements review', month: 1, day: 31, recurring: true },
    { title: 'Asbestos register update', month: 7, day: 1, recurring: true },
    { title: 'Principal contractor compliance check', month: 6, day: 30, recurring: true },
    { title: 'Plant and equipment inspection', month: 3, day: 31, recurring: true },
  ],
}

export default function CalendarPage() {
  const { userSectors } = useSector()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', date: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [userSectors])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get findings with due dates
      const { data: findings } = await supabase
        .from('findings')
        .select('id, title, severity, status, due_date, category')
        .eq('user_id', user.id)
        .not('due_date', 'is', null)
        .neq('status', 'resolved')
        .order('due_date', { ascending: true })

      const findingEvents: CalendarEvent[] = (findings || []).map(f => ({
        id: f.id,
        title: f.title,
        date: f.due_date,
        type: 'finding_due' as const,
        severity: f.severity,
        status: f.status,
        sector: f.category,
      }))

      // Generate sector compliance cycle events for this year and next
      const cycleEvents: CalendarEvent[] = []
      const years = [currentYear, currentYear + 1]

      for (const sector of userSectors) {
        const cycles = COMPLIANCE_CYCLES[sector] || []
        for (const cycle of cycles) {
          for (const year of years) {
            const date = `${year}-${String(cycle.month).padStart(2, '0')}-${String(cycle.day).padStart(2, '0')}`
            cycleEvents.push({
              id: `cycle-${sector}-${cycle.title}-${year}`,
              title: cycle.title,
              date,
              type: 'audit_cycle',
              sector,
            })
          }
        }
      }

      setEvents([...findingEvents, ...cycleEvents])
    } catch (error) {
      console.error('Calendar fetch error:', error)
    }
    setLoading(false)
  }

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Save as a finding with due date (type: custom reminder)
      await supabase.from('findings').insert({
        user_id: user.id,
        title: newEvent.title,
        description: 'Custom compliance deadline',
        severity: 'medium',
        category: 'Compliance Deadline',
        status: 'open',
        due_date: newEvent.date,
      })

      setNewEvent({ title: '', date: '' })
      setShowAddForm(false)
      fetchEvents()
    } catch (error) {
      console.error('Add event error:', error)
    }
  }

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction
    let newYear = currentYear
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0) { newMonth = 11; newYear-- }
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  // Get events for current month view
  const monthEvents = events.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Upcoming events (next 30 days)
  const today = new Date()
  const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const upcomingEvents = events
    .filter(e => {
      const d = new Date(e.date)
      return d >= today && d <= thirtyDaysOut
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Overdue events
  const overdueEvents = events
    .filter(e => new Date(e.date) < today && e.type === 'finding_due')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Days in month for calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  // Adjust for Monday start (Australian calendar)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Calendar</h1>
          <p className="text-slate-500 mt-1">Deadlines, audit cycles, and compliance milestones</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 gap-1">
          <Plus className="h-4 w-4" /> Add Deadline
        </Button>
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <Card className="border-kwooka-ochre/20">
          <CardContent className="p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Deadline Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. NDIS Audit Preparation Due"
                />
              </div>
              <div className="w-44">
                <Label className="text-xs mb-1 block">Date</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <Button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.date} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {overdueEvents.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-700 text-sm">{overdueEvents.length} overdue item{overdueEvents.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1">
              {overdueEvents.slice(0, 3).map(e => (
                <p key={e.id} className="text-sm text-red-600">
                  {e.title} — was due {formatDate(e.date)}
                </p>
              ))}
              {overdueEvents.length > 3 && (
                <p className="text-xs text-red-400">and {overdueEvents.length - 3} more...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">{MONTHS[currentMonth]} {currentYear}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
              ))}
            </div>
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = events.filter(e => e.date === dateStr)
                const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear

                return (
                  <div
                    key={day}
                    className={cn(
                      'h-16 p-1 rounded-lg text-sm',
                      isToday && 'bg-kwooka-ochre/10 ring-1 ring-kwooka-ochre/30',
                      dayEvents.length > 0 && !isToday && 'bg-slate-50'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isToday ? 'text-kwooka-ochre' : 'text-slate-600'
                    )}>{day}</span>
                    {dayEvents.slice(0, 2).map((e, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'text-[10px] truncate rounded px-1 mt-0.5',
                          e.type === 'finding_due' && e.severity === 'critical' && 'bg-red-100 text-red-700',
                          e.type === 'finding_due' && e.severity === 'high' && 'bg-orange-100 text-orange-700',
                          e.type === 'finding_due' && e.severity !== 'critical' && e.severity !== 'high' && 'bg-amber-100 text-amber-700',
                          e.type === 'audit_cycle' && 'bg-blue-100 text-blue-700',
                          e.type === 'custom' && 'bg-purple-100 text-purple-700',
                        )}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 px-1">+{dayEvents.length - 2}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-kwooka-ochre" />
                Next 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 8).map(e => (
                    <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50">
                      <div className={cn(
                        'h-2 w-2 rounded-full mt-1.5 shrink-0',
                        e.type === 'finding_due' ? 'bg-amber-500' : 'bg-blue-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{e.title}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(e.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded bg-red-400" />
                <span className="text-slate-600">Critical findings due</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded bg-amber-400" />
                <span className="text-slate-600">Findings due</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded bg-blue-400" />
                <span className="text-slate-600">Sector audit cycle</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
