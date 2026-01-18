'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export const ALL_SECTORS = [
  { id: 'ndis', name: 'NDIS', description: 'Practice Standards', color: 'bg-purple-500' },
  { id: 'transport', name: 'Transport', description: 'HVNL & CoR', color: 'bg-blue-500' },
  { id: 'healthcare', name: 'Healthcare', description: 'NSQHS Standards', color: 'bg-red-500' },
  { id: 'aged_care', name: 'Aged Care', description: 'Quality Standards', color: 'bg-green-500' },
  { id: 'workplace', name: 'Workplace', description: 'WHS Act', color: 'bg-amber-500' },
  { id: 'construction', name: 'Construction', description: 'WHS Construction', color: 'bg-orange-500' },
]

interface SectorContextType {
  userSectors: string[]
  primarySector: string
  isLoading: boolean
  hasAccess: (sector: string) => boolean
  getUserSectorObjects: () => typeof ALL_SECTORS
  refreshSectors: () => Promise<void>
}

const SectorContext = createContext<SectorContextType | undefined>(undefined)

// Cache for sector data
let cachedSectors: string[] | null = null
let cachedPrimary: string | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60000 // 1 minute cache

export function SectorProvider({ children }: { children: ReactNode }) {
  const [userSectors, setUserSectors] = useState<string[]>(cachedSectors || ['ndis'])
  const [primarySector, setPrimarySector] = useState<string>(cachedPrimary || 'ndis')
  const [isLoading, setIsLoading] = useState(!cachedSectors)

  useEffect(() => {
    // Use cache if available and fresh
    if (cachedSectors && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setUserSectors(cachedSectors)
      setPrimarySector(cachedPrimary || 'ndis')
      setIsLoading(false)
      return
    }
    
    fetchUserSectors()
  }, [])

  const fetchUserSectors = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Default for non-logged in users - show all sectors
        const defaultSectors = ['ndis', 'transport', 'healthcare', 'aged_care', 'workplace', 'construction']
        setUserSectors(defaultSectors)
        setPrimarySector('ndis')
        cachedSectors = defaultSectors
        cachedPrimary = 'ndis'
        cacheTimestamp = Date.now()
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('sectors, primary_sector')
        .eq('id', user.id)
        .single()

      if (profile) {
        const sectors = profile.sectors || ['ndis']
        const primary = profile.primary_sector || sectors[0] || 'ndis'
        
        setUserSectors(sectors)
        setPrimarySector(primary)
        
        // Update cache
        cachedSectors = sectors
        cachedPrimary = primary
        cacheTimestamp = Date.now()
      }
    } catch (error: any) {
      // Ignore abort errors - they're expected in dev mode
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.error('Error fetching user sectors:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSectors = async () => {
    cachedSectors = null
    cachedPrimary = null
    cacheTimestamp = 0
    setIsLoading(true)
    await fetchUserSectors()
  }

  const hasAccess = (sector: string) => userSectors.includes(sector)

  const getUserSectorObjects = () => ALL_SECTORS.filter(s => userSectors.includes(s.id))

  return (
    <SectorContext.Provider value={{
      userSectors,
      primarySector,
      isLoading,
      hasAccess,
      getUserSectorObjects,
      refreshSectors,
    }}>
      {children}
    </SectorContext.Provider>
  )
}

export function useSector() {
  const context = useContext(SectorContext)
  if (context === undefined) {
    throw new Error('useSector must be used within a SectorProvider')
  }
  return context
}

// Helper to clear cache (call after saving settings)
export function clearSectorCache() {
  cachedSectors = null
  cachedPrimary = null
  cacheTimestamp = 0
}
