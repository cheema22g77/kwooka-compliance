'use client'

import React, { useState } from 'react'
import {
  Database, Upload, Loader2, CheckCircle2, AlertTriangle,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NDIS_PRACTICE_STANDARDS } from '@/lib/rag/sample-data/ndis-practice-standards'
import { NDIS_CODE_OF_CONDUCT } from '@/lib/rag/sample-data/ndis-code-of-conduct'
import { WHS_STANDARDS } from '@/lib/rag/sample-data/whs-standards'
import { WHS_CONSTRUCTION } from '@/lib/rag/sample-data/whs-construction'
import { HVNL_STANDARDS } from '@/lib/rag/sample-data/hvnl-standards'
import { AGED_CARE_STANDARDS } from '@/lib/rag/sample-data/aged-care-standards'
import { NSQHS_STANDARDS } from '@/lib/rag/sample-data/nsqhs-standards'
import { FAIR_WORK_ACT } from '@/lib/rag/sample-data/fair-work-act'

interface IngestResult {
  success: boolean
  sourceId?: string
  chunksCreated?: number
  message?: string
  error?: string
}

interface LegislationSource {
  id: string
  name: string
  sector: string
  description: string
  data: any
}

export default function AdminPage() {
  const [ingestingId, setIngestingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, IngestResult>>({})

  const handleIngest = async (source: LegislationSource) => {
    setIngestingId(source.id)

    try {
      const response = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source.data),
      })

      const data = await response.json()
      
      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [source.id]: {
            success: true,
            sourceId: data.sourceId,
            chunksCreated: data.chunksCreated,
            message: data.message,
          }
        }))
      } else {
        setResults(prev => ({
          ...prev,
          [source.id]: {
            success: false,
            error: data.error || 'Ingestion failed',
          }
        }))
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [source.id]: {
          success: false,
          error: error.message || 'Network error',
        }
      }))
    } finally {
      setIngestingId(null)
    }
  }

  const handleIngestAll = async () => {
    for (const source of legislationSources) {
      await handleIngest(source)
    }
  }

  const legislationSources: LegislationSource[] = [
    {
      id: 'ndis-practice',
      name: 'NDIS Practice Standards',
      sector: 'NDIS',
      description: 'Core module covering all 6 practice standards',
      data: NDIS_PRACTICE_STANDARDS,
    },
    {
      id: 'ndis-conduct',
      name: 'NDIS Code of Conduct',
      sector: 'NDIS',
      description: 'Code of conduct requirements for NDIS providers',
      data: NDIS_CODE_OF_CONDUCT,
    },
    {
      id: 'whs',
      name: 'WHS Act 2011',
      sector: 'Workplace',
      description: 'Work Health and Safety Act',
      data: WHS_STANDARDS,
    },
    {
      id: 'whs-construction',
      name: 'WHS Construction',
      sector: 'Construction',
      description: 'WHS regulations for construction work',
      data: WHS_CONSTRUCTION,
    },
    {
      id: 'hvnl',
      name: 'Heavy Vehicle National Law',
      sector: 'Transport',
      description: 'HVNL and Chain of Responsibility',
      data: HVNL_STANDARDS,
    },
    {
      id: 'aged-care',
      name: 'Aged Care Quality Standards',
      sector: 'Aged Care',
      description: '8 Quality Standards for aged care',
      data: AGED_CARE_STANDARDS,
    },
    {
      id: 'nsqhs',
      name: 'NSQHS Standards',
      sector: 'Healthcare',
      description: 'National Safety and Quality Health Service Standards',
      data: NSQHS_STANDARDS,
    },
    {
      id: 'fair-work',
      name: 'Fair Work Act',
      sector: 'Workplace',
      description: 'Fair Work Act 2009 employment standards',
      data: FAIR_WORK_ACT,
    },
  ]

  const successCount = Object.values(results).filter(r => r.success).length
  const totalChunks = Object.values(results)
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.chunksCreated || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-kwooka-ochre" />
            RAG Admin
          </h1>
          <p className="text-muted-foreground">
            Manage legislation sources for the AI-powered search
          </p>
        </div>
        <Button
          onClick={handleIngestAll}
          disabled={ingestingId !== null}
          className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
        >
          <Upload className="h-4 w-4 mr-2" />
          Ingest All Sources
        </Button>
      </div>

      {/* Summary */}
      {successCount > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">
                  {successCount} of {legislationSources.length} sources ingested
                </p>
                <p className="text-sm text-green-600">
                  Total: {totalChunks} searchable chunks created
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legislation Sources */}
      <div className="grid gap-4">
        {legislationSources.map((source) => {
          const result = results[source.id]
          const isIngesting = ingestingId === source.id
          
          return (
            <Card key={source.id} className={result?.success ? 'border-green-200' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${result?.success ? 'bg-green-100' : 'bg-slate-100'}`}>
                      {result?.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                      {result?.success && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {result.chunksCreated} chunks created
                        </p>
                      )}
                      {result && !result.success && (
                        <p className="text-xs text-red-600 mt-1">
                          ✗ {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{source.sector}</Badge>
                    <Button
                      onClick={() => handleIngest(source)}
                      disabled={ingestingId !== null}
                      variant={result?.success ? "outline" : "default"}
                      className={!result?.success ? "bg-kwooka-ochre hover:bg-kwooka-ochre/90" : ""}
                    >
                      {isIngesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Ingesting...
                        </>
                      ) : result?.success ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Re-ingest
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Ingest
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Instructions */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click <strong>Ingest</strong> to process a legislation source</li>
            <li>The document is split into searchable chunks</li>
            <li>Each chunk is converted to a vector embedding using OpenAI</li>
            <li>Embeddings are stored in Supabase with pgvector</li>
            <li>Users can search with natural language in the Legislation Assistant</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}