'use client'

import React from 'react'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SectorsSettingsPage() {
  const { userSectors, primarySector, isLoading, isSaving, setSectors, setPrimarySectorOnly } = useSector()

  const toggleSector = async (sectorId: string) => {
    if (userSectors.includes(sectorId)) {
      if (userSectors.length > 1) {
        const newSectors = userSectors.filter(s => s !== sectorId)
        const newPrimary = primarySector === sectorId ? newSectors[0] : primarySector
        await setSectors(newSectors, newPrimary)
      }
    } else {
      await setSectors([...userSectors, sectorId], primarySector)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold">Sector Settings</h1>
        <p className="text-muted-foreground">Choose which compliance sectors apply to your organisation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sectors</CardTitle>
          <CardDescription>Select the sectors relevant to your compliance requirements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {ALL_SECTORS.map((sector) => {
            const isActive = userSectors.includes(sector.id)
            const isPrimary = primarySector === sector.id
            
            return (
              <div
                key={sector.id}
                onClick={() => !isSaving && toggleSector(sector.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  isActive ? 'border-kwooka-ochre bg-kwooka-ochre/5' : 'border-gray-200 hover:border-gray-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${sector.color}`} />
                    <div>
                      <p className="font-medium">{sector.name}</p>
                      <p className="text-sm text-muted-foreground">{sector.description}</p>
                    </div>
                  </div>
                  {isActive && <Check className="h-5 w-5 text-kwooka-ochre" />}
                </div>
                {isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isPrimary && !isSaving) setPrimarySectorOnly(sector.id)
                    }}
                    className={`mt-2 text-xs ${isPrimary ? 'text-kwooka-ochre font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {isPrimary ? '★ Primary Sector' : 'Set as primary'}
                  </button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}