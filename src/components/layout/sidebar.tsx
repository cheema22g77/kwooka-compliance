'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, AlertTriangle, FileText,
  Settings, ChevronLeft, ChevronRight, LogOut, Loader2, X,
  HelpCircle, Database, CalendarDays, ClipboardCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  isMobile?: boolean
}

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Score & overview' },
  { href: '/dashboard/analysis', icon: Sparkles, label: 'Analyse', description: 'Upload, chat & generate' },
  { href: '/dashboard/findings', icon: AlertTriangle, label: 'Findings', description: 'Track & resolve' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documents', description: 'Policies & evidence' },
  { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar', description: 'Deadlines & audits' },
  { href: '/dashboard/playbooks', icon: ClipboardCheck, label: 'Playbooks', description: 'Checklists & reports' },
]

const adminNavItems = [
  { href: '/dashboard/admin', icon: Database, label: 'RAG Admin' },
  { href: '/dashboard/legislation', icon: FileText, label: 'Legislation' },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, isMobile }: SidebarProps) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      window.location.href = '/auth/login'
    } catch (error) {
      window.location.href = '/auth/login'
    }
  }

  const handleNavClick = () => {
    if (isMobile && mobileOpen) {
      onToggle()
    }
  }

  const isVisible = isMobile ? mobileOpen : true

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300',
        isMobile && !mobileOpen && '-translate-x-full',
        isMobile && mobileOpen && 'translate-x-0 w-[260px]',
        !isMobile && collapsed && 'w-[70px]',
        !isMobile && !collapsed && 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
          <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-9 w-9 rounded-xl object-cover" />
          {(!collapsed || isMobile) && (
            <span className="font-bold text-lg text-slate-900">Kwooka</span>
          )}
        </Link>
        {isMobile ? (
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-slate-400 hover:text-slate-600"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={handleNavClick}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                  isActive
                    ? 'bg-kwooka-ochre/10 text-kwooka-ochre'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-kwooka-ochre')} />
                {(!collapsed || isMobile) && (
                  <div className="flex-1 min-w-0">
                    <span className="block">{item.label}</span>
                    {item.description && (
                      <span className="block text-xs font-normal text-slate-400 mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          )
        })}

        {/* Admin section — smaller, secondary */}
        {(!collapsed || isMobile) && (
          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={handleNavClick}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom: Help + Settings */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-1">
        <Link href="/dashboard/settings" onClick={handleNavClick}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all text-sm',
            pathname === '/dashboard/settings' && 'bg-slate-100 text-slate-900'
          )}>
            <Settings className="h-4 w-4 shrink-0" />
            {(!collapsed || isMobile) && <span>Settings</span>}
          </div>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all text-sm disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" />
          )}
          {(!collapsed || isMobile) && <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  )
}
