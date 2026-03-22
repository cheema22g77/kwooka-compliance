'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { SectorProvider } from '@/contexts/sector-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <SectorProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Mobile overlay */}
        {mobileMenuOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => {
            if (isMobile) {
              setMobileMenuOpen(!mobileMenuOpen)
            } else {
              setSidebarCollapsed(!sidebarCollapsed)
            }
          }}
          mobileOpen={mobileMenuOpen}
          isMobile={isMobile}
        />
        
        <div className={cn(
          'transition-all duration-300',
          isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]')
        )}>
          <Header 
            onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            showMenuButton={isMobile} 
          />
          <main className="p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SectorProvider>
  )
}
