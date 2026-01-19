'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  Sparkles, Upload, FileText, Loader2, CheckCircle2, XCircle, 
  AlertTriangle, ChevronDown, ChevronRight, Target, TrendingUp, 
  FileWarning, Shield, Truck, Heart, Home, Briefcase, HardHat,
  RotateCcw, Clock, User, AlertCircle, Info, X, Download, Files
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { exportAnalysisReport } from '@/lib/pdf/export-report'
import { extractPDFText, isPDF, formatExtractionResult } from '@/lib/pdf/extractor'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import Link from 'next/link'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield, transport: Truck, healthcare: Heart,
  aged_care: Home, workplace: Briefcase, construction: HardHat,
}

const DOCUMENT_TYPES = [
  'Policy Document', 'Procedure Manual', 'Contract/Agreement', 'Training Record',
  'Incident Report', 'Audit Report', 'Risk Assessment', 'Other'
]

export default function AnalysisPage() {
  const { userSectors, primarySector, getUserSectorObjects, isLoading: sectorsLoading } = useSector()
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState('Policy Document')
  const [documentText, setDocumentText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfMessage, setPdfMessage] = useState<string | null>(null)
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [extractingPdf, setExtractingPdf] = useState(false)

  const supabase = createClient()
  const availableSectors = getUserSectorObjects()
  const hasSingleSector = availableSectors.length === 1

  useEffect(() => {
    if (!sectorsLoading && !selectedSector) {
      if (hasSingleSector) {
        setSelectedSector(availableSectors[0].id)
      } else if (primarySector && userSectors.includes(primarySector)) {
        setSelectedSector(primarySector)
      }
    }
  }, [sectorsLoading, primarySector, userSectors, hasSingleSector, availableSectors])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  const handleExportPDF = () => {
    if (!analysis) return
    setExporting(true)
    try {
      exportAnalysisReport(analysis, fileName || undefined)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const processFile = async (file: File) => {
    setFileName(file.name)
    setError(null)
    setPdfMessage(null)
    
    // Check if it's a PDF
    if (isPDF(file)) {
      setExtractingPdf(true)
      setPdfMessage('Extracting text from PDF...')
      
      try {
        const result = await extractPDFText(file)
        
        if (result.method === 'failed' || result.text.length < 100) {
          setPdfMessage('Could not extract text automatically. Please copy and paste the text from your PDF below.')
          setExtractingPdf(false)
          return
        }
        
        setDocumentText(result.text)
        setPdfMessage(formatExtractionResult(result))
        setExtractingPdf(false)
      } catch (err) {
        console.error('PDF extraction error:', err)
        setPdfMessage('Could not extract text automatically. Please copy and paste the text from your PDF below.')
        setExtractingPdf(false)
      }
      return
    }
    
    // Handle text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      setDocumentText(text)
      return
    }
    
    // Try to read as text for other file types
    try {
      const text = await file.text()
      setDocumentText(text)
    } catch {
      setError('Could not read this file. Please paste text directly.')
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }

  const clearFile = () => {
    setFileName(null)
    setDocumentText('')
    setError(null)
    setPdfMessage(null)
  }

  const handleAnalyze = async () => {
    if (!selectedSector || !documentText.trim()) return

    setAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          sector: selectedSector,
          documentType,
          documentName: fileName || 'Untitled',
          userId,
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setAnalysis(null)
    setDocumentText('')
    setFileName(null)
    setError(null)
    setPdfMessage(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'LOW': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-green-100 text-green-700'
      case 'PARTIAL': return 'bg-amber-100 text-amber-700'
      case 'GAP': case 'NON_COMPLIANT': case 'CRITICAL': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const currentSector = ALL_SECTORS.find(s => s.id === selectedSector)
  const CurrentSectorIcon = currentSector ? SECTOR_ICONS[currentSector.id] : Shield

  if (sectorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-kwooka-ochre" />
            Smart Document Analysis
          </h1>
          <p className="text-muted-foreground">
            {hasSingleSector && currentSector 
              ? `AI-powered ${currentSector.name} compliance analysis`
              : 'AI-powered compliance analysis for your sectors'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analysis/history">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </Button>
          </Link>
          {analysis ? (
            <>
              <Button variant="outline" onClick={handleExportPDF} disabled={exporting} className="gap-2">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </Button>
              <Button variant="outline" onClick={resetAnalysis}>
                <RotateCcw className="h-4 w-4 mr-2" />New Analysis
              </Button>
            </>
          ) : (
            <Link href="/dashboard/analysis/bulk">
              <Button variant="outline" className="gap-2">
                <Files className="h-4 w-4" />
                Bulk Analysis
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!analysis ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            {hasSingleSector && currentSector ? (
              <Card className="bg-gradient-to-br from-kwooka-ochre/5 to-amber-500/5 border-kwooka-ochre/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={cn('p-3 rounded-xl', currentSector.color)}>
                      <CurrentSectorIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{currentSector.name}</p>
                      <p className="text-sm text-muted-foreground">{currentSector.description}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    <a href="/dashboard/settings/sectors" className="text-kwooka-ochre hover:underline">Manage sectors →</a>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">1. Select Sector</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {availableSectors.map((sector) => {
                    const Icon = SECTOR_ICONS[sector.id]
                    const isSelected = selectedSector === sector.id
                    return (
                      <button
                        key={sector.id}
                        onClick={() => setSelectedSector(sector.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                          isSelected ? 'border-kwooka-ochre bg-kwooka-ochre/10' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                        )}
                      >
                        <div className={cn('p-2 rounded-lg text-white', sector.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium">{sector.name}</span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{hasSingleSector ? '1' : '2'}. Document Type</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Bulk Analysis CTA */}
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="pt-6 text-center">
                <Files className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium text-sm">Have multiple documents?</p>
                <Link href="/dashboard/analysis/bulk">
                  <Button variant="link" className="text-kwooka-ochre p-0 h-auto mt-1">
                    Try Bulk Analysis →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{hasSingleSector ? '2' : '3'}. Paste Document Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fileName && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {extractingPdf ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm text-blue-800">{fileName}</p>
                      {pdfMessage && (
                        <p className={cn(
                          "text-xs mt-1",
                          extractingPdf ? "text-blue-500" : 
                          documentText ? "text-green-600" : "text-amber-600"
                        )}>
                          {extractingPdf && <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />}
                          {pdfMessage}
                        </p>
                      )}
                    </div>
                    <button onClick={clearFile} className="p-1 hover:bg-blue-100 rounded" disabled={extractingPdf}>
                      <X className="h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                )}

                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                    isDragging ? 'border-kwooka-ochre bg-kwooka-ochre/5' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <input id="file-upload" type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileSelect} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">Drop a file here for reference</p>
                  <p className="text-xs text-muted-foreground mt-1">Then paste the text content below</p>
                </div>

                <div>
                  <textarea
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    placeholder={`Paste your ${currentSector?.name || ''} document text here for analysis...`}
                    rows={12}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-kwooka-ochre/20 focus:border-kwooka-ochre"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{documentText.length.toLocaleString()} characters</span>
                    <span>Max 20,000 characters</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || !selectedSector || !documentText.trim()}
                  className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90 h-12 text-base"
                >
                  {analyzing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing {currentSector?.name} Document...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" />Analyze {currentSector?.name} Document</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Analysis Results */
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-kwooka-ochre/10 to-amber-500/10 border-kwooka-ochre/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-kwooka-ochre/20"><FileText className="h-5 w-5 text-kwooka-ochre" /></div>
                  <div>
                    <p className="font-medium text-slate-800">Analysis Complete!</p>
                    <p className="text-sm text-muted-foreground">Download a professional PDF report.</p>
                  </div>
                </div>
                <Button onClick={handleExportPDF} disabled={exporting} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90 gap-2">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className={cn('border-2', getScoreColor(analysis.overallScore))}>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold">{analysis.overallScore}%</div>
                <p className="text-sm font-medium mt-1">Compliance Score</p>
                <Badge className={cn('mt-2', getStatusColor(analysis.overallStatus))}>{analysis.overallStatus}</Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-red-100"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                  <div>
                    <div className="text-2xl font-bold">{analysis.findings?.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Critical/High</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-100"><FileWarning className="h-6 w-6 text-amber-600" /></div>
                  <div>
                    <div className="text-2xl font-bold">{analysis.findings?.filter((f: any) => f.status === 'GAP').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Gaps Found</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100"><CheckCircle2 className="h-6 w-6 text-green-600" /></div>
                  <div>
                    <div className="text-2xl font-bold">{analysis.findings?.filter((f: any) => f.status === 'COMPLIANT').length || 0}</div>
                    <p className="text-sm text-muted-foreground">Compliant</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl', ALL_SECTORS.find(s => s.id === analysis.sector)?.color || 'bg-slate-500')}>
                  {(() => {
                    const Icon = SECTOR_ICONS[analysis.sector] || FileText
                    return <Icon className="h-6 w-6 text-white" />
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{analysis.sectorName} Compliance Analysis</h2>
                  <p className="text-muted-foreground mt-1">{analysis.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {analysis.criticalGaps?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />Critical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.criticalGaps.map((gap: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{gap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.complianceByArea && (
            <Card>
              <CardHeader><CardTitle className="text-base">Compliance by Area</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analysis.complianceByArea.map((area: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium truncate">{area.area}</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', area.score >= 80 ? 'bg-green-500' : area.score >= 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${area.score}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-medium">{area.score}%</div>
                    <Badge className={cn('w-20 justify-center', getStatusColor(area.status))}>{area.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Detailed Findings ({analysis.findings?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {analysis.findings?.map((finding: any, i: number) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <div className="p-4 cursor-pointer hover:bg-slate-50 flex items-center gap-3" onClick={() => setExpandedFinding(expandedFinding === i ? null : i)}>
                    {finding.status === 'COMPLIANT' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{finding.title}</p>
                      <p className="text-xs text-muted-foreground">{finding.area}</p>
                    </div>
                    <Badge className={getSeverityColor(finding.severity)}>{finding.severity}</Badge>
                    <Badge className={getStatusColor(finding.status)}>{finding.status}</Badge>
                    {expandedFinding === i ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                  {expandedFinding === i && (
                    <div className="border-t bg-slate-50 p-4 space-y-3">
                      <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm">{finding.description}</p></div>
                      {finding.recommendation && <div><Label className="text-xs text-muted-foreground">Recommendation</Label><p className="text-sm text-orange-600">{finding.recommendation}</p></div>}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {analysis.actionPlan && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-kwooka-ochre" />Action Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analysis.actionPlan.map((action: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-kwooka-ochre text-white text-sm font-bold">{action.priority}</div>
                    <div>
                      <p className="font-medium">{action.action}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{action.timeframe}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{action.responsibility}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analysis.strengths?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" />Strengths</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {analysis.strengths.map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div><p className="font-medium text-green-800">{s.area}</p><p className="text-sm text-green-700">{s.description}</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}