'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Search, LogOut, Settings, ChevronDown, Loader2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = profile?.email || user?.email || ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
      {/* Mobile Menu Button */}
      {showMenuButton && (
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search - hidden on mobile */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents, findings..."
          className="pl-10 bg-slate-50 border-slate-200"
        />
      </div>

      {/* Mobile: Just show logo text */}
      {showMenuButton && (
        <div className="flex-1 sm:hidden">
          <span className="font-bold text-slate-900">Kwooka</span>
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Mobile Search Button */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 md:gap-3 hover:bg-slate-50 rounded-lg px-2 md:px-3 py-2 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-kwooka-ochre/20 flex items-center justify-center">
              <span className="text-sm font-medium text-kwooka-ochre">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{displayEmail}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-3 border-b">
                  <p className="font-medium text-sm">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
                <div className="p-1">
                  <Link href="/dashboard/settings">
                    <button 
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-slate-50 rounded-md"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
