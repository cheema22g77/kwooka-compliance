'use client'

import React, { useState, useEffect } from 'react'
import {
  Webhook, Plus, Trash2, Loader2, Check, X,
  Copy, AlertTriangle, Zap, ChevronDown, ChevronUp,
  Play, Pause, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

const EVENT_GROUPS: Record<string, string[]> = {
  'Assessment': ['AssessmentStarted', 'AssessmentCompleted', 'AssessmentFailed'],
  'Findings': ['FindingCreated', 'FindingStatusChanged', 'FindingEscalated', 'FindingAssigned', 'FindingOverdue'],
  'Evidence': ['EvidenceUploaded', 'EvidenceLinked', 'CoverageMapped'],
  'Program': ['ProgramCreated', 'ProgramVersionCreated', 'ProgramApproved', 'ProgramReviewDue'],
  'Document': ['DocumentUploaded', 'DocumentExpiring', 'RetentionWarning'],
  'Legislation': ['LegislationChangeDetected', 'ImpactAssessed'],
  'Organisation': ['OrgCreated', 'SectorAdded', 'TierChanged'],
  'System': ['GuardrailRejection', 'CircuitBreakerStateChanged', 'DeadlineApproaching', 'AuditPackGenerated', 'AgentRunCompleted'],
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/integrations/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks ?? [])
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  async function createWebhook() {
    if (!newUrl.trim()) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), events: selectedEvents }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      setNewSecret(data.secret)
      setNewUrl('')
      setSelectedEvents([])
      setShowCreate(false)
      fetchWebhooks()
    } catch {
      setError('Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  async function toggleWebhook(id: string, active: boolean) {
    await fetch('/api/integrations/webhooks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    fetchWebhooks()
  }

  async function deleteWebhook(id: string) {
    await fetch('/api/integrations/webhooks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchWebhooks()
  }

  async function testWebhook(id: string) {
    setTesting(id)
    // Simulate a test ping
    setTimeout(() => setTesting(null), 2000)
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  function toggleGroup(group: string) {
    const events = EVENT_GROUPS[group] || []
    const allSelected = events.every((e) => selectedEvents.includes(e))
    if (allSelected) {
      setSelectedEvents((prev) => prev.filter((e) => !events.includes(e)))
    } else {
      setSelectedEvents((prev) => [...new Set([...prev, ...events])])
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Receive real-time notifications when compliance events occur
        </p>
      </div>

      {/* Secret reveal */}
      {newSecret && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  Copy your signing secret now — it will not be shown again
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-800 select-all">
                    {newSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(newSecret)}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  Use this secret to verify webhook signatures via the X-Kwooka-Signature header.
                </p>
                <Button size="sm" variant="ghost" className="mt-2 text-amber-700" onClick={() => setNewSecret(null)}>
                  I've saved the secret
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-kwooka-ochre" />
                Webhook Endpoints
              </CardTitle>
              <CardDescription>Enterprise plan required</CardDescription>
            </div>
            {!showCreate && (
              <Button onClick={() => setShowCreate(true)} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Endpoint
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Create form */}
          {showCreate && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border space-y-4">
              <div>
                <Label htmlFor="webhookUrl">Endpoint URL (HTTPS only)</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://your-app.com/webhooks/kwooka"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Events (leave empty to receive all events)</Label>
                <div className="mt-2 space-y-2">
                  {Object.entries(EVENT_GROUPS).map(([group, events]) => {
                    const selected = events.filter((e) => selectedEvents.includes(e)).length
                    const isExpanded = expandedGroups[group]

                    return (
                      <div key={group} className="border rounded-lg overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2 bg-white hover:bg-slate-50 text-left"
                          onClick={() => setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected === events.length}
                              ref={(el) => { if (el) el.indeterminate = selected > 0 && selected < events.length }}
                              onChange={() => toggleGroup(group)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm font-medium">{group}</span>
                            {selected > 0 && (
                              <Badge variant="secondary" className="text-[10px]">{selected}</Badge>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 py-2 bg-slate-50 border-t space-y-1">
                            {events.map((evt) => (
                              <label key={evt} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedEvents.includes(evt)}
                                  onChange={() => toggleEvent(evt)}
                                  className="rounded border-slate-300"
                                />
                                {evt}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={createWebhook} disabled={creating || !newUrl.trim()} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create Endpoint
                </Button>
                <Button variant="ghost" onClick={() => { setShowCreate(false); setError(null) }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No webhook endpoints configured</p>
              <p className="text-xs text-slate-400 mt-1">Create an endpoint to start receiving events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    wh.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          wh.active ? 'bg-green-500' : 'bg-slate-300'
                        )} />
                        <p className="text-sm font-mono text-slate-700 truncate">{wh.url}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {wh.events.length === 0 ? (
                          <Badge variant="secondary" className="text-[10px]">All events</Badge>
                        ) : (
                          wh.events.slice(0, 3).map((e) => (
                            <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                          ))
                        )}
                        {wh.events.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{wh.events.length - 3} more</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => testWebhook(wh.id)}
                        disabled={testing === wh.id || !wh.active}
                        className="text-slate-500"
                      >
                        {testing === wh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => toggleWebhook(wh.id, !wh.active)}
                        className="text-slate-500"
                      >
                        {wh.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => deleteWebhook(wh.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification docs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verifying Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono whitespace-pre leading-relaxed">
{`const crypto = require('crypto');

function verifyWebhook(body, secret, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const received = signatureHeader.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );
}`}
          </code>
        </CardContent>
      </Card>
    </div>
  )
}
