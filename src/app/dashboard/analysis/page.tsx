'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronRight, Zap, Target, TrendingUp, FileWarning } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function AnalysisPage() {
  const [standards, setStandards] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  const [selectedStandard, setSelectedStandard] = useState<string>('')
  const [documentText, setDocumentText] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedReq, setExpandedReq] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [standardsRes, docsRes, reqsRes] = await Promise.all([
        supabase.from('ndis_standards').select('*').order('standard_number'),
        supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ndis_requirements').select('*'),
      ])
      setStandards(standardsRes.data || [])
      setDocuments(docsRes.data || [])
      setRequirements(reqsRes.data || [])
    } catch (err) { console.error('Error:', err) }
    finally { setLoading(false) }
  }

  const handleAnalyze = async () => {
    if (!selectedStandard || !documentText) {
      setError('Please select a standard and paste document text')
      return
    }
    setAnalyzing(true)
    setError(null)
    setAnalysis(null)
    try {
      const standard = standards.find(s => s.id === selectedStandard)
      const stdRequirements = requirements.filter(r => r.standard_id === selectedStandard)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          standardId: selectedStandard,
          standardName: standard?.name,
          requirements: stdRequirements,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Analysis failed')
      setAnalysis(result)
    } catch (err: any) { setError(err.message) }
    finally { setAnalyzing(false) }
  }

  const getStatusColor = (status: string) => {
    if (status === 'MET' || status === 'COMPLIANT') return 'bg-green-100 text-green-700'
    if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'MET' || status === 'COMPLIANT') return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (status === 'PARTIAL') return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-kwooka-ochre" />
          AI Document Analysis
        </h1>
        <p className="text-muted-foreground mt-1">Automatically analyze your policies against NDIS Practice Standards</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Document</CardTitle>
          <CardDescription>Select a standard and paste your policy text to check compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Document (optional)</Label>
              <select value={selectedDocument} onChange={(e) => setSelectedDocument(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Choose a document...</option>
                {documents.map((doc) => (<option key={doc.id} value={doc.id}>{doc.title}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Select NDIS Standard *</Label>
              <select value={selectedStandard} onChange={(e) => setSelectedStandard(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Choose a standard...</option>
                {standards.map((std) => (<option key={std.id} value={std.id}>#{std.standard_number} - {std.name}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Document Text *</Label>
            <textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} placeholder="Paste your policy document text here for analysis..." rows={8} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" />
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
          <Button onClick={handleAnalyze} disabled={analyzing || !selectedStandard || !documentText} className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90">
            {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</> : <><Zap className="mr-2 h-4 w-4" />Analyze Document</>}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold', analysis.overallScore >= 80 ? 'bg-green-100 text-green-700' : analysis.overallScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                    {analysis.overallScore}%
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Compliance Score</h2>
                    <Badge className={cn(getStatusColor(analysis.overallStatus))}>{analysis.overallStatus}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Requirements Met</p>
                  <p className="text-2xl font-bold">{analysis.requirements?.filter((r: any) => r.status === 'MET').length || 0}/{analysis.requirements?.length || 0}</p>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground">{analysis.summary}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" />Strengths</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">{analysis.strengths?.map((s: string, i: number) => (<li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />{s}</li>))}</ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><FileWarning className="h-5 w-5 text-red-500" />Gaps Identified</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">{analysis.gaps?.map((g: string, i: number) => (<li key={i} className="flex items-start gap-2 text-sm"><XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />{g}</li>))}</ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Detailed Analysis</CardTitle><CardDescription>Click each requirement to see details</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {analysis.requirements?.map((req: any, i: number) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <div className="p-4 cursor-pointer hover:bg-accent/50 flex items-center gap-3" onClick={() => setExpandedReq(expandedReq === i ? null : i)}>
                    {getStatusIcon(req.status)}
                    <div className="flex-1"><span className="font-medium">{req.title}</span></div>
                    <Badge className={cn(getStatusColor(req.status))}>{req.status}</Badge>
                    {expandedReq === i ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                  {expandedReq === i && (
                    <div className="border-t bg-accent/30 p-4 space-y-3">
                      <div><Label className="text-xs text-muted-foreground">Explanation</Label><p className="text-sm">{req.explanation}</p></div>
                      {req.relevantQuote && <div><Label className="text-xs text-muted-foreground">Found in Document</Label><p className="text-sm italic bg-green-50 p-2 rounded">&quot;{req.relevantQuote}&quot;</p></div>}
                      {req.recommendation && <div><Label className="text-xs text-muted-foreground">Recommendation</Label><p className="text-sm text-orange-600">{req.recommendation}</p></div>}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-kwooka-ochre" />Action Plan</CardTitle><CardDescription>Prioritized recommendations to improve compliance</CardDescription></CardHeader>
            <CardContent>
              <ol className="space-y-3">{analysis.recommendations?.map((rec: string, i: number) => (<li key={i} className="flex items-start gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-kwooka-ochre text-white text-sm font-medium shrink-0">{i + 1}</span><span className="text-sm">{rec}</span></li>))}</ol>
            </CardContent>
          </Card>
        </div>
      )}

      {documents.length === 0 && !analysis && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">How to Use</h3>
            <p className="text-muted-foreground text-sm mb-4">1. Select an NDIS Standard to check against<br/>2. Paste your policy document text<br/>3. Click Analyze to get AI-powered compliance report</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
