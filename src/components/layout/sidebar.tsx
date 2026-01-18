'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, AlertTriangle, Shield, Sparkles,
  Settings, HelpCircle, ChevronLeft, ChevronRight,
  MessageCircle, Wand2, LogOut, Loader2, Scale, Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & Analytics' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documents', description: 'Upload & Manage' },
  { href: '/dashboard/findings', icon: AlertTriangle, label: 'Findings', description: 'Compliance Issues' },
  { href: '/dashboard/legislation', icon: Scale, label: 'Legislation', description: 'AI-Powered Search', badge: 'NEW' },
  { href: '/dashboard/analysis', icon: Sparkles, label: 'AI Analysis', description: 'Analyze Documents' },
  { href: '/dashboard/generator', icon: Wand2, label: 'Policy Generator', description: 'Templates & AI' },
  { href: '/dashboard/admin', icon: Database, label: 'RAG Admin', description: 'Manage Legislation' },
]

const bottomNavItems = [
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/help', icon: HelpCircle, label: 'Help' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.clear()
      window.location.href = '/auth/login'
    }
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-slate-200 px-4', collapsed && 'justify-center')}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-10 w-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-bold text-slate-900">Kwooka</span>
              <span className="text-[10px] text-slate-500 block -mt-1">COMPLIANCE</span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn('ml-auto h-8 w-8 flex-shrink-0', collapsed && 'ml-0 mt-2')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
                  isActive
                    ? 'bg-kwooka-ochre/10 text-kwooka-ochre'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-kwooka-ochre')} />
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-sm font-medium block', isActive && 'text-kwooka-ochre')}>
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="text-xs text-slate-400 block truncate">{item.description}</span>
                      )}
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-kwooka-ochre text-white rounded flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* AI Copilot Card with Mascot - Only show when not collapsed */}
      {!collapsed && (
        <div className="p-3 flex-shrink-0">
          <div className="bg-gradient-to-br from-kwooka-sand/50 to-amber-100/50 rounded-xl p-4 relative overflow-hidden">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <img 
                  src="/images/kwooka_mascot_clean.png" 
                  alt="Kwooka Mascot" 
                  className="h-16 w-16 object-contain"
                />
                <span className="absolute -top-1 -right-1 text-[10px] bg-kwooka-ochre text-white px-1.5 py-0.5 rounded-full">AI</span>
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-semibold text-slate-800 text-sm">Ask Kwooka</h4>
              <p className="text-xs text-slate-600 mt-0.5">Your AI compliance assistant</p>
              <Link href="/dashboard/copilot">
                <Button size="sm" className="mt-2 w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90 h-8 text-xs">
                  <MessageCircle className="h-3 w-3 mr-1.5" />
                  Start Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="border-t border-slate-200 p-3 space-y-1 flex-shrink-0">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100',
                  collapsed && 'justify-center'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </div>
            </Link>
          )
        })}
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left',
            'text-red-600 hover:bg-red-50',
            collapsed && 'justify-center',
            loggingOut && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
          ) : (
            <LogOut className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && <span className="text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  )
}
