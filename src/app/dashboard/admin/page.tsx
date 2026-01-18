'use client'

import React, { useState } from 'react'
import {
  Database, Upload, Loader2, CheckCircle2, AlertTriangle,
  FileText, Trash2, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NDIS_PRACTICE_STANDARDS } from '@/lib/rag/sample-data/ndis-practice-standards'

interface IngestResult {
  success: boolean
  sourceId?: string
  chunksCreated?: number
  message?: string
  error?: string
}

export default function AdminPage() {
  const [ingesting, setIngesting] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)

  const handleIngestNDIS = async () => {
    setIngesting(true)
    setResult(null)

    try {
      const response = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(NDIS_PRACTICE_STANDARDS),
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult({
          success: true,
          sourceId: data.sourceId,
          chunksCreated: data.chunksCreated,
          message: data.message,
        })
      } else {
        setResult({
          success: false,
          error: data.error || 'Ingestion failed',
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Network error',
      })
    } finally {
      setIngesting(false)
    }
  }

  const legislationSources = [
    {
      id: 'ndis',
      name: 'NDIS Practice Standards',
      sector: 'ndis',
      description: 'Core module covering all 6 practice standards',
      status: 'ready',
      onIngest: handleIngestNDIS,
    },
    {
      id: 'whs',
      name: 'WHS Act 2011',
      sector: 'workplace',
      description: 'Work Health and Safety Act',
      status: 'coming_soon',
    },
    {
      id: 'hvnl',
      name: 'Heavy Vehicle National Law',
      sector: 'transport',
      description: 'HVNL and Chain of Responsibility',
      status: 'coming_soon',
    },
    {
      id: 'aged_care',
      name: 'Aged Care Quality Standards',
      sector: 'aged_care',
      description: '8 Quality Standards for aged care',
      status: 'coming_soon',
    },
    {
      id: 'nsqhs',
      name: 'NSQHS Standards',
      sector: 'healthcare',
      description: 'National Safety and Quality Health Service Standards',
      status: 'coming_soon',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-kwooka-ochre" />
          RAG Admin
        </h1>
        <p className="text-muted-foreground">
          Manage legislation sources for the AI-powered search
        </p>
      </div>

      {/* Result Alert */}
      {result && (
        <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.success ? result.message : result.error}
                </p>
                {result.chunksCreated && (
                  <p className="text-sm text-green-600 mt-1">
                    Created {result.chunksCreated} searchable chunks
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legislation Sources */}
      <div className="grid gap-4">
        {legislationSources.map((source) => (
          <Card key={source.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {source.sector.replace('_', ' ')}
                  </Badge>
                  {source.status === 'ready' ? (
                    <Button
                      onClick={source.onIngest}
                      disabled={ingesting}
                      className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                    >
                      {ingesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Ingesting...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Ingest
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge variant="secondary">Coming Soon</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
