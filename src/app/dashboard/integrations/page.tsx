'use client'

import React, { useState, useEffect } from 'react'
import {
  Key, Plus, Trash2, Copy, Check, AlertTriangle,
  Loader2, Shield, Clock, Eye, EyeOff, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

interface ApiKey {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
  revokedAt: string | null
  isActive: boolean
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    try {
      const res = await fetch('/api/integrations/keys')
      const data = await res.json()
      if (res.ok) {
        setKeys(data.keys ?? [])
      }
    } catch {
      // Ignore fetch errors in dev mode
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setNewKeyValue(data.key)
      setNewKeyName('')
      fetchKeys()
    } catch {
      setError('Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(keyId: string) {
    try {
      const res = await fetch('/api/integrations/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })

      if (res.ok) {
        fetchKeys()
      }
    } catch {
      // Ignore
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeKeys = keys.filter(k => k.isActive)
  const revokedKeys = keys.filter(k => !k.isActive)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage API keys for programmatic access to Kwooka Compliance
        </p>
      </div>

      {/* New key reveal */}
      {newKeyValue && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  Copy your API key now — it will not be shown again
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-800 select-all">
                    {newKeyValue}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKeyValue)}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-amber-700"
                  onClick={() => setNewKeyValue(null)}
                >
                  I've saved the key
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-kwooka-ochre" />
                API Keys
              </CardTitle>
              <CardDescription>
                Use API keys to access the Kwooka API from your applications.
                Requires Enterprise plan.
              </CardDescription>
            </div>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Key
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Create form */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
              <Label htmlFor="keyName" className="text-sm font-medium">Key Name</Label>
              <p className="text-xs text-slate-500 mb-2">
                A descriptive name to identify this key (e.g., "Production Backend", "CI Pipeline")
              </p>
              <div className="flex gap-2">
                <Input
                  id="keyName"
                  placeholder="e.g., Production Backend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createKey()}
                />
                <Button
                  onClick={createKey}
                  disabled={creating || !newKeyName.trim()}
                  className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 shrink-0"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowCreateForm(false); setError(null) }}
                  className="shrink-0"
                >
                  Cancel
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
          )}

          {/* Active keys list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No active API keys</p>
              <p className="text-xs text-slate-400 mt-1">
                Create a key to start using the Kwooka API
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 bg-white border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <Key className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{key.name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {new Date(key.createdAt).toLocaleDateString('en-AU')}
                        </span>
                        {key.lastUsedAt && (
                          <span>
                            Last used {new Date(key.lastUsedAt).toLocaleDateString('en-AU')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => revokeKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Revoked keys */}
          {revokedKeys.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                Revoked Keys
              </p>
              <div className="space-y-2">
                {revokedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500 line-through">{key.name}</p>
                        <p className="text-xs text-slate-400">
                          Revoked {key.revokedAt ? new Date(key.revokedAt).toLocaleDateString('en-AU') : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Authentication</p>
              <code className="block bg-slate-900 text-green-400 p-3 rounded-lg text-sm font-mono">
                curl -H "Authorization: Bearer kw_live_YOUR_KEY" \{'\n'}
                {'  '}https://kwooka-compliance-main.vercel.app/api/v1/health
              </code>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Analyse a Document</p>
              <code className="block bg-slate-900 text-green-400 p-3 rounded-lg text-sm font-mono whitespace-pre">
{`curl -X POST \\
  -H "Authorization: Bearer kw_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"documentContent":"...","sector":"ndis"}' \\
  /api/v1/analyse`}
              </code>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Available Endpoints</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { method: 'GET', path: '/api/v1/health', desc: 'Health check' },
                  { method: 'POST', path: '/api/v1/analyse', desc: 'Analyse document' },
                  { method: 'POST', path: '/api/v1/search', desc: 'Search legislation' },
                ].map((ep) => (
                  <div key={ep.path} className="p-2.5 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-xs font-mono text-slate-600">{ep.path.split('/api/v1')[1]}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
