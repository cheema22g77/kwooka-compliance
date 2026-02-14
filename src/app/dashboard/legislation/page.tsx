'use client'

import React, { useState } from 'react'
import {
  Search, BookOpen, Scale, FileText, Loader2, ExternalLink,
  ChevronRight, Shield, Truck, Heart, Home, Briefcase, HardHat,
  Sparkles, AlertTriangle, CheckCircle2, Info, Quote
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield,
  transport: Truck,
  healthcare: Heart,
  aged_care: Home,
  workplace: Briefcase,
  construction: HardHat,
}

interface Citation {
  content: string
  source: string
  section?: string
  similarity: number
}

interface RAGResponse {
  answer: string
  citations: Citation[]
  confidence: 'high' | 'medium' | 'low'
}

export default function LegislationPage() {
  const { userSectors, primarySector } = useSector()
  const [query, setQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>(primarySector || 'ndis')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          sector: selectedSector,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Query failed')
      }

      const data = await res.json()
      setResponse(data)
    } catch (err: any) {
      setError(err.message || 'Failed to search legislation')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-amber-100 text-amber-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const exampleQueries = [
    { sector: 'ndis', query: 'What are the incident reporting requirements?' },
    { sector: 'ndis', query: 'What worker screening checks are required?' },
    { sector: 'ndis', query: 'What are the restrictive practices rules?' },
    { sector: 'ndis', query: 'How do I handle complaints from participants?' },
    { sector: 'transport', query: 'What are the fatigue management requirements?' },
    { sector: 'healthcare', query: 'What are the medication safety standards?' },
    { sector: 'workplace', query: 'What are PCBU duties under WHS?' },
  ]

  const filteredExamples = exampleQueries.filter(eq => 
    userSectors.includes(eq.sector) || eq.sector === selectedSector
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6 text-kwooka-ochre" />
          Legislation Assistant
        </h1>
        <p className="text-muted-foreground">
          Ask questions about Australian compliance legislation with AI-powered answers and citations
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Sector Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_SECTORS.filter(s => userSectors.includes(s.id)).map(sector => {
              const Icon = SECTOR_ICONS[sector.id]
              return (
                <button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                    selectedSector === sector.id
                      ? 'bg-kwooka-ochre text-white'
                      : 'bg-slate-100 hover:bg-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {sector.name}
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Ask about compliance requirements, standards, or legislation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-11 h-12 text-base"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="h-12 px-6 bg-kwooka-ochre hover:bg-kwooka-ochre/90"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Ask
                </>
              )}
            </Button>
          </div>

          {/* Example Queries */}
          {!response && !loading && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {filteredExamples.slice(0, 4).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(example.query)
                      setSelectedSector(example.sector)
                    }}
                    className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    {example.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
              <div className="text-center">
                <p className="font-medium">Searching legislation...</p>
                <p className="text-sm text-muted-foreground">Analyzing Australian compliance frameworks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-6">
          {/* Answer Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-kwooka-ochre" />
                  Answer
                </CardTitle>
                <Badge className={getConfidenceColor(response.confidence)}>
                  {response.confidence === 'high' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {response.confidence === 'medium' && <Info className="h-3 w-3 mr-1" />}
                  {response.confidence === 'low' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {response.confidence} confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {response.answer}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Citations Card */}
          {response.citations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Quote className="h-5 w-5 text-kwooka-ochre" />
                  Sources & Citations ({response.citations.length})
                </CardTitle>
                <CardDescription>
                  Relevant excerpts from Australian legislation and standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {response.citations.map((citation, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-kwooka-ochre" />
                          <span className="font-medium text-sm">{citation.source}</span>
                          {citation.section && (
                            <Badge variant="outline" className="text-xs">
                              {citation.section}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(citation.similarity * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {citation.content}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="bg-gradient-to-r from-kwooka-ochre/10 to-amber-500/10 border-kwooka-ochre/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Need more help?</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a compliance document or analyze your existing policies
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="/dashboard/generator">Generate Policy</a>
                  </Button>
                  <Button className="bg-kwooka-ochre hover:bg-kwooka-ochre/90" asChild>
                    <a href="/dashboard/analysis">Analyze Document</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card - Setup Required */}
      {!response && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <Scale className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="font-semibold mb-2">AI-Powered Legislation Search</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Ask questions in plain English about NDIS Practice Standards, WHS regulations,
                transport laws, and other Australian compliance frameworks. Get accurate answers
                with citations to specific sections.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
