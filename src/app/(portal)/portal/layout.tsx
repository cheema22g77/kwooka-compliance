'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, FileText, AlertTriangle, Download,
  Loader2, LogOut, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const portalNav = [
  { href: '/portal/overview', icon: BarChart3, label: 'Overview' },
  { href: '/portal/documents', icon: FileText, label: 'Documents' },
  { href: '/portal/findings', icon: AlertTriangle, label: 'Findings' },
  { href: '/portal/reports', icon: Download, label: 'Reports' },
]

interface PortalSession {
  orgId: string
  orgName: string
  email: string
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/portal/auth')
      if (res.ok) {
        const data = await res.json()
        setSession({ orgId: data.orgId, orgName: data.orgName, email: data.email })
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-16 w-16 mx-auto mb-4 rounded-2xl" />
          <Loader2 className="h-6 w-6 animate-spin text-kwooka-ochre mx-auto" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <PortalLogin onSuccess={checkSession} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="font-bold text-sm text-slate-900">Kwooka Compliance</p>
              <p className="text-xs text-slate-400">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{session.orgName}</p>
              <p className="text-xs text-slate-400">{session.email}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <Shield className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">Read-Only</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px">
            {portalNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-kwooka-ochre text-kwooka-ochre'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-6 w-6 rounded-md object-cover" />
            <span className="text-xs text-slate-400">Powered by Kwooka Compliance</span>
          </div>
          <span className="text-xs text-slate-400">Aboriginal-Owned Enterprise · Supply Nation Certified</span>
        </div>
      </footer>
    </div>
  )
}

// ── Login Component ──

function PortalLogin({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setToken(urlToken)
      authenticate(urlToken)
    }
  }, [])

  async function authenticate(t?: string) {
    const tokenToUse = t || token
    if (!tokenToUse.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-kwooka-cream to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/images/kwooka_mascot_clean.png"
            alt="Kwooka"
            className="h-20 w-20 mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-2xl font-bold text-kwooka-charcoal">Client Portal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your invite token to view compliance reports
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-1.5">
              Invite Token
            </label>
            <input
              id="token"
              type="text"
              placeholder="Paste your invite token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && authenticate()}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-kwooka-ochre/50 focus:border-kwooka-ochre"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>
          )}

          <button
            onClick={() => authenticate()}
            disabled={loading || !token.trim()}
            className="w-full h-10 bg-kwooka-ochre text-white rounded-lg text-sm font-medium hover:bg-kwooka-ochre/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Authenticating...' : 'Access Portal'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have a token? Ask your compliance provider for an invite link.
        </p>
      </div>
    </div>
  )
}
