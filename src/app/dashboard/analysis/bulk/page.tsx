'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  Sparkles, Upload, FileText, Loader2, CheckCircle2, XCircle, 
  AlertTriangle, Trash2, Play, Pause, RotateCcw, Download,
  Shield, Truck, Heart, Home, Briefcase, HardHat, 
  ChevronDown, ChevronRight, ArrowLeft, Files, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import Link from 'next/link'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield,
  transport: Truck,
  healthcare: Heart,
  aged_care: Home,
  workplace: Briefcase,
  construction: HardHat,
}

const DOCUMENT_TYPES = [
  'Policy Document', 'Procedure Manual', 'Contract/Agreement', 'Training Record',
  'Incident Report', 'Audit Report', 'Risk Assessment', 'Other'
]

interface QueuedDocument {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: 'pending' | 'extracting' | 'analyzing' | 'complete' | 'error'
  text?: string
  analysis?: any
  error?: string
  progress: number
}

export default function BulkAnalysisPage() {
  const { userSectors, primarySector, getUserSectorObjects, isLoading: sectorsLoading } = useSector()
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [documentType, setDocumentType] = useState('Policy Document')
  const [queue, setQueue] = useState<QueuedDocument[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()
  const availableSectors = getUserSectorObjects()

  useEffect(() => {
    if (primarySector && !selectedSector) {
      setSelectedSector(primarySector)
    }
  }, [primarySector])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    addFilesToQueue(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFilesToQueue(files)
    e.target.value = ''
  }

  const addFilesToQueue = (files: File[]) => {
    const newDocs: QueuedDocument[] = files.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.includes('pdf') ? 'pdf' : 'text',
      status: 'pending',
      progress: 0,
    }))
    setQueue(prev => [...prev, ...newDocs])
  }

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(doc => doc.id !== id))
  }

  const clearQueue = () => {
    if (!isProcessing) {
      setQueue([])
      setCurrentIndex(0)
    }
  }

  const clearCompleted = () => {
    setQueue(prev => prev.filter(doc => doc.status !== 'complete' && doc.status !== 'error'))
  }

  const extractText = async (doc: QueuedDocument): Promise<string> => {
    if (doc.type === 'text' || doc.file.type === 'text/plain') {
      return await doc.file.text()
    }
    return `[Content from ${doc.name}] - Please paste actual text for accurate analysis`
  }

  const analyzeDocument = async (text: string, docName: string): Promise<any> => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: text,
        sector: selectedSector,
        documentType,
        documentName: docName,
        userId,
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Analysis failed')
    }

    return await response.json()
  }

  const processQueue = async () => {
    if (!selectedSector) {
      alert('Please select a sector first')
      return
    }

    setIsProcessing(true)
    setIsPaused(false)

    for (let i = 0; i < queue.length; i++) {
      if (isPaused) break

      const doc = queue[i]
      if (doc.status === 'complete' || doc.status === 'error') continue

      try {
        setQueue(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'extracting' as const, progress: 25 } : d
        ))

        const text = await extractText(doc)

        setQueue(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'analyzing' as const, text, progress: 50 } : d
        ))

        const analysis = await analyzeDocument(text, doc.name)

        setQueue(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'complete' as const, analysis, progress: 100 } : d
        ))

      } catch (error: any) {
        setQueue(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'error' as const, error: error.message, progress: 0 } : d
        ))
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setIsProcessing(false)
  }

  const pauseProcessing = () => {
    setIsPaused(true)
    setIsProcessing(false)
  }

  const retryFailed = () => {
    setQueue(prev => prev.map(d => 
      d.status === 'error' ? { ...d, status: 'pending' as const, error: undefined, progress: 0 } : d
    ))
  }

  const getStatusIcon = (status: QueuedDocument['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-slate-400" />
      case 'extracting': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'analyzing': return <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = (status: QueuedDocument['status']) => {
    switch (status) {
      case 'pending': return 'Waiting'
      case 'extracting': return 'Extracting...'
      case 'analyzing': return 'Analyzing...'
      case 'complete': return 'Complete'
      case 'error': return 'Failed'
    }
  }

  const completedCount = queue.filter(d => d.status === 'complete').length
  const failedCount = queue.filter(d => d.status === 'error').length
  const pendingCount = queue.filter(d => d.status === 'pending').length

  const overallProgress = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0

  const avgScore = completedCount > 0
    ? Math.round(queue.filter(d => d.analysis?.overallScore).reduce((sum, d) => sum + d.analysis.overallScore, 0) / completedCount)
    : 0

  if (sectorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analysis">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Files className="h-6 w-6 text-kwooka-ochre" />
              Bulk Document Analysis
            </h1>
            <p className="text-muted-foreground">Analyze multiple documents at once</p>
          </div>
        </div>
        <Link href="/dashboard/analysis">
          <Button variant="outline">Single Analysis</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Select Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {availableSectors.map((sector) => {
                  const Icon = SECTOR_ICONS[sector.id]
                  const isSelected = selectedSector === sector.id
                  return (
                    <button
                      key={sector.id}
                      onClick={() => !isProcessing && setSelectedSector(sector.id)}
                      disabled={isProcessing}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                        isSelected ? 'border-kwooka-ochre bg-kwooka-ochre/10' : 'border-transparent bg-slate-50 hover:bg-slate-100',
                        isProcessing && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg text-white', sector.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium">{sector.name}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Document Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3. Add Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                onClick={() => !isProcessing && document.getElementById('bulk-upload')?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragging ? 'border-kwooka-ochre bg-kwooka-ochre/5' : 'border-slate-200 hover:border-slate-300',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  id="bulk-upload"
                  type="file"
                  accept=".pdf,.txt"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium">Drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, TXT (multiple)</p>
              </div>
            </CardContent>
          </Card>

          {queue.length > 0 && (
            <Card className="bg-gradient-to-br from-kwooka-ochre/5 to-amber-500/5 border-kwooka-ochre/20">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{queue.length}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                    <div className="text-xs text-muted-foreground">Done</div>
                  </div>
                  {avgScore > 0 && (
                    <div className="col-span-2">
                      <div className={cn(
                        "text-2xl font-bold",
                        avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      )}>{avgScore}%</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Queue */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Document Queue</CardTitle>
                  <CardDescription>
                    {queue.length === 0 ? 'Add documents to begin' : `${completedCount}/${queue.length} processed`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {failedCount > 0 && !isProcessing && (
                    <Button variant="outline" size="sm" onClick={retryFailed}>
                      <RotateCcw className="h-4 w-4 mr-1" />Retry
                    </Button>
                  )}
                  {queue.length > 0 && !isProcessing && (
                    <Button variant="outline" size="sm" onClick={clearQueue}>Clear</Button>
                  )}
                </div>
              </div>
              
              {queue.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-kwooka-ochre transition-all rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Files className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No documents</p>
                  <p className="text-sm">Upload files to start</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {queue.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={cn(
                        "border rounded-lg overflow-hidden",
                        doc.status === 'complete' && 'border-green-200 bg-green-50/50',
                        doc.status === 'error' && 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <div 
                        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50"
                        onClick={() => doc.status === 'complete' && setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      >
                        {getStatusIcon(doc.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getStatusText(doc.status)}
                            {doc.analysis?.overallScore !== undefined && (
                              <span className={cn(
                                "ml-2 font-medium",
                                doc.analysis.overallScore >= 80 ? 'text-green-600' : 
                                doc.analysis.overallScore >= 60 ? 'text-amber-600' : 'text-red-600'
                              )}>
                                {doc.analysis.overallScore}%
                              </span>
                            )}
                          </p>
                        </div>
                        {doc.status === 'pending' && !isProcessing && (
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFromQueue(doc.id) }}>
                            <Trash2 className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {doc.status === 'complete' && (
                          expandedDoc === doc.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      
                      {expandedDoc === doc.id && doc.analysis && (
                        <div className="border-t bg-white p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-2 bg-slate-50 rounded">
                              <div className={cn(
                                "text-lg font-bold",
                                doc.analysis.overallScore >= 80 ? 'text-green-600' : 
                                doc.analysis.overallScore >= 60 ? 'text-amber-600' : 'text-red-600'
                              )}>{doc.analysis.overallScore}%</div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded">
                              <div className="text-lg font-bold">{doc.analysis.findings?.length || 0}</div>
                              <div className="text-xs text-muted-foreground">Findings</div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded">
                              <Badge className={cn(
                                "text-xs",
                                doc.analysis.overallStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                                doc.analysis.overallStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              )}>{doc.analysis.overallStatus}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{doc.analysis.summary}</p>
                        </div>
                      )}
                      
                      {doc.status === 'error' && (
                        <div className="border-t bg-red-50 p-3">
                          <p className="text-xs text-red-600">{doc.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {queue.length > 0 && (
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  {!isProcessing ? (
                    <Button 
                      onClick={processQueue}
                      disabled={pendingCount === 0 || !selectedSector}
                      className="flex-1 bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Analyze {pendingCount} Files
                    </Button>
                  ) : (
                    <Button onClick={pauseProcessing} variant="outline" className="flex-1">
                      <Pause className="h-4 w-4 mr-2" />Pause
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
