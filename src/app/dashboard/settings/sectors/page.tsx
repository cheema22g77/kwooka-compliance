'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Truck, Heart, Home, Briefcase, HardHat, Check, Loader2, Save, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { clearSectorCache } from '@/contexts/sector-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ALL_SECTORS = [
  { id: 'ndis', name: 'NDIS', description: 'Practice Standards', color: 'bg-purple-500' },
  { id: 'transport', name: 'Transport', description: 'HVNL & CoR', color: 'bg-blue-500' },
  { id: 'healthcare', name: 'Healthcare', description: 'NSQHS Standards', color: 'bg-red-500' },
  { id: 'aged_care', name: 'Aged Care', description: 'Quality Standards', color: 'bg-green-500' },
  { id: 'workplace', name: 'Workplace', description: 'WHS Act', color: 'bg-amber-500' },
  { id: 'construction', name: 'Construction', description: 'WHS Construction', color: 'bg-orange-500' },
]

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield,
  transport: Truck,
  healthcare: Heart,
  aged_care: Home,
  workplace: Briefcase,
  construction: HardHat,
}

export default function SectorSettingsPage() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>(['ndis'])
  const [selectedPrimary, setSelectedPrimary] = useState<string>('ndis')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUserSectors()
  }, [])

  const fetchUserSectors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('sectors, primary_sector')
          .eq('id', user.id)
          .single()

        if (profile) {
          setSelectedSectors(profile.sectors || ['ndis'])
          setSelectedPrimary(profile.primary_sector || 'ndis')
        }
      }
    } catch (error) {
      console.error('Error fetching sectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSector = (sectorId: string) => {
    setError(null)
    setSaved(false)
    
    if (selectedSectors.includes(sectorId)) {
      if (selectedSectors.length === 1) {
        setError('You must have at least one sector selected')
        return
      }
      
      const newSectors = selectedSectors.filter(s => s !== sectorId)
      setSelectedSectors(newSectors)
      
      if (selectedPrimary === sectorId) {
        setSelectedPrimary(newSectors[0])
      }
    } else {
      setSelectedSectors([...selectedSectors, sectorId])
    }
  }

  const handleSave = async () => {
    if (!userId) {
      setError('You must be logged in to save settings')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          sectors: selectedSectors, 
          primary_sector: selectedPrimary 
        })
        .eq('id', userId)
      
      if (updateError) {
        setError(`Failed to save: ${updateError.message}`)
      } else {
        // Clear the cache so other pages get fresh data
        clearSectorCache()
        setSaved(true)
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    } catch (error: any) {
      setError(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Sector Settings</h1>
          <p className="text-muted-foreground">Choose which compliance sectors you work with</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Sectors</CardTitle>
          <CardDescription>Select all sectors relevant to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ALL_SECTORS.map((sector) => {
              const Icon = SECTOR_ICONS[sector.id]
              const isSelected = selectedSectors.includes(sector.id)
              const isPrimary = selectedPrimary === sector.id
              
              return (
                <div
                  key={sector.id}
                  onClick={() => toggleSector(sector.id)}
                  className={cn(
                    'relative p-4 rounded-xl border-2 cursor-pointer transition-all',
                    isSelected 
                      ? 'border-kwooka-ochre bg-kwooka-ochre/5' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-5 w-5 rounded-full bg-kwooka-ochre flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className={cn('p-3 rounded-lg w-fit', sector.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="font-semibold mt-3">{sector.name}</h3>
                  <p className="text-sm text-muted-foreground">{sector.description}</p>
                  
                  {isPrimary && isSelected && (
                    <Badge className="mt-2 bg-kwooka-ochre">Primary</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Primary Sector</CardTitle>
          <CardDescription>Your primary sector is shown by default.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedSectors.map((sectorId) => {
              const sector = ALL_SECTORS.find(s => s.id === sectorId)
              if (!sector) return null
              
              return (
                <button
                  key={sectorId}
                  onClick={() => { setSelectedPrimary(sectorId); setSaved(false) }}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2',
                    selectedPrimary === sectorId
                      ? 'border-kwooka-ochre bg-kwooka-ochre text-white'
                      : 'border-slate-200 hover:border-kwooka-ochre/50'
                  )}
                >
                  {sector.name}
                  {selectedPrimary === sectorId && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : saved ? (
            <><Check className="h-4 w-4 mr-2" />Saved! Redirecting...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Save Changes</>
          )}
        </Button>
      </div>
    </div>
  )
}
