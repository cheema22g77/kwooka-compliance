'use client'

import React, { useState } from 'react'
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

  return (
    <SectorProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'
        )}>
          <Header />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </SectorProvider>
  )
}
