'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
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
  isSaving: boolean
  hasAccess: (sector: string) => boolean
  getUserSectorObjects: () => typeof ALL_SECTORS
  refreshSectors: () => Promise<void>
  setSectors: (sectors: string[], primarySector?: string) => Promise<boolean>
  setPrimarySectorOnly: (sector: string) => Promise<boolean>
  addSector: (sector: string) => Promise<boolean>
  removeSector: (sector: string) => Promise<boolean>
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
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

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

      setUserId(user.id)

      // Fetch from user_sectors table
      const { data: sectorData, error } = await supabase
        .from('user_sectors')
        .select('sector_id, is_primary')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching sectors:', error)
        // Fall back to defaults
        setUserSectors(['ndis'])
        setPrimarySector('ndis')
        setIsLoading(false)
        return
      }

      if (sectorData && sectorData.length > 0) {
        const sectors = sectorData.map(s => s.sector_id)
        const primary = sectorData.find(s => s.is_primary)?.sector_id || sectors[0] || 'ndis'
        
        setUserSectors(sectors)
        setPrimarySector(primary)
        
        // Update cache
        cachedSectors = sectors
        cachedPrimary = primary
        cacheTimestamp = Date.now()
      } else {
        // No sectors saved yet - default to NDIS and save it
        const defaultSectors = ['ndis']
        setUserSectors(defaultSectors)
        setPrimarySector('ndis')
        
        // Save default sector to database
        await supabase.from('user_sectors').insert({
          user_id: user.id,
          sector_id: 'ndis',
          is_primary: true
        })
        
        cachedSectors = defaultSectors
        cachedPrimary = 'ndis'
        cacheTimestamp = Date.now()
      }
    } catch (error: any) {
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

  /**
   * Set all sectors at once (replaces existing)
   */
  const setSectors = useCallback(async (sectors: string[], primary?: string): Promise<boolean> => {
    if (!userId || sectors.length === 0) return false
    
    setIsSaving(true)
    try {
      // Delete all existing sectors for this user
      await supabase
        .from('user_sectors')
        .delete()
        .eq('user_id', userId)
      
      // Determine primary sector
      const primarySectorId = primary || sectors[0]
      
      // Insert new sectors
      const inserts = sectors.map(sector_id => ({
        user_id: userId,
        sector_id,
        is_primary: sector_id === primarySectorId
      }))
      
      const { error } = await supabase
        .from('user_sectors')
        .insert(inserts)
      
      if (error) {
        console.error('Error saving sectors:', error)
        return false
      }
      
      // Update local state
      setUserSectors(sectors)
      setPrimarySector(primarySectorId)
      
      // Update cache
      cachedSectors = sectors
      cachedPrimary = primarySectorId
      cacheTimestamp = Date.now()
      
      return true
    } catch (error) {
      console.error('Error setting sectors:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, supabase])

  /**
   * Change only the primary sector
   */
  const setPrimarySectorOnly = useCallback(async (sector: string): Promise<boolean> => {
    if (!userId || !userSectors.includes(sector)) return false
    
    setIsSaving(true)
    try {
      // Set all to non-primary
      await supabase
        .from('user_sectors')
        .update({ is_primary: false })
        .eq('user_id', userId)
      
      // Set the new primary
      const { error } = await supabase
        .from('user_sectors')
        .update({ is_primary: true })
        .eq('user_id', userId)
        .eq('sector_id', sector)
      
      if (error) {
        console.error('Error setting primary sector:', error)
        return false
      }
      
      setPrimarySector(sector)
      cachedPrimary = sector
      cacheTimestamp = Date.now()
      
      return true
    } catch (error) {
      console.error('Error setting primary sector:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, userSectors, supabase])

  /**
   * Add a single sector
   */
  const addSector = useCallback(async (sector: string): Promise<boolean> => {
    if (!userId || userSectors.includes(sector)) return false
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_sectors')
        .insert({
          user_id: userId,
          sector_id: sector,
          is_primary: userSectors.length === 0 // Make primary if first sector
        })
      
      if (error) {
        console.error('Error adding sector:', error)
        return false
      }
      
      const newSectors = [...userSectors, sector]
      setUserSectors(newSectors)
      
      if (userSectors.length === 0) {
        setPrimarySector(sector)
        cachedPrimary = sector
      }
      
      cachedSectors = newSectors
      cacheTimestamp = Date.now()
      
      return true
    } catch (error) {
      console.error('Error adding sector:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, userSectors, supabase])

  /**
   * Remove a single sector
   */
  const removeSector = useCallback(async (sector: string): Promise<boolean> => {
    if (!userId || !userSectors.includes(sector) || userSectors.length <= 1) return false
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_sectors')
        .delete()
        .eq('user_id', userId)
        .eq('sector_id', sector)
      
      if (error) {
        console.error('Error removing sector:', error)
        return false
      }
      
      const newSectors = userSectors.filter(s => s !== sector)
      setUserSectors(newSectors)
      
      // If we removed the primary, set a new primary
      if (primarySector === sector) {
        const newPrimary = newSectors[0]
        await supabase
          .from('user_sectors')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('sector_id', newPrimary)
        
        setPrimarySector(newPrimary)
        cachedPrimary = newPrimary
      }
      
      cachedSectors = newSectors
      cacheTimestamp = Date.now()
      
      return true
    } catch (error) {
      console.error('Error removing sector:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, userSectors, primarySector, supabase])

  const hasAccess = (sector: string) => userSectors.includes(sector)

  const getUserSectorObjects = () => ALL_SECTORS.filter(s => userSectors.includes(s.id))

  return (
    <SectorContext.Provider value={{
      userSectors,
      primarySector,
      isLoading,
      isSaving,
      hasAccess,
      getUserSectorObjects,
      refreshSectors,
      setSectors,
      setPrimarySectorOnly,
      addSector,
      removeSector,
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