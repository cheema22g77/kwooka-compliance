'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText, Upload, Search, MoreVertical, Download, Trash2,
  Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
  ShieldCheck, ShieldAlert, ShieldX, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UploadDialog } from '@/components/documents'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import { useSector } from '@/contexts/sector-context'
import { SECTORS, type SectorId } from '@/core/value-objects/sectors'
import Link from 'next/link'

const categories = ['All', 'Policy', 'HR', 'Legal', 'Security', 'Safety', 'Training', 'Financial', 'Other']

interface EvidenceArea {
  area: string
  status: 'covered' | 'partial' | 'gap'
  score: number
  documents: string[]
  latestAnalysis?: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'documents' | 'evidence'>('documents')
  const { userSectors } = useSector()

  const supabase = createClient()

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [docResult, analysisResult] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('compliance_analyses')
          .select('id, sector, document_name, overall_score, compliance_by_area, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      setDocuments(docResult.data || [])
      setAnalyses(analysisResult.data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocuments() }, [])

  // Build evidence map from analyses
  const evidenceMap = useMemo(() => {
    const map: Record<string, EvidenceArea[]> = {}

    for (const sector of userSectors) {
      const sectorConfig = SECTORS[sector as SectorId]
      if (!sectorConfig) continue

      const sectorAnalyses = analyses.filter(a => a.sector === sector)

      map[sector] = sectorConfig.keyAreas.map(area => {
        // Find analyses that have compliance data for this area
        const matchingAnalyses: { docName: string; score: number; date: string }[] = []

        for (const analysis of sectorAnalyses) {
          const byArea = analysis.compliance_by_area || []
          const areaData = byArea.find((a: any) =>
            a.area?.toLowerCase().includes(area.toLowerCase()) ||
            area.toLowerCase().includes(a.area?.toLowerCase() || '')
          )
          if (areaData) {
            matchingAnalyses.push({
              docName: analysis.document_name || 'Untitled',
              score: areaData.score || 0,
              date: analysis.created_at,
            })
          }
        }

        const avgScore = matchingAnalyses.length > 0
          ? Math.round(matchingAnalyses.reduce((s, m) => s + m.score, 0) / matchingAnalyses.length)
          : 0

        return {
          area,
          status: matchingAnalyses.length === 0 ? 'gap' as const
            : avgScore >= 70 ? 'covered' as const : 'partial' as const,
          score: avgScore,
          documents: matchingAnalyses.map(m => m.docName),
          latestAnalysis: matchingAnalyses[0]?.date,
        }
      })
    }

    return map
  }, [analyses, userSectors])

  // Evidence summary stats
  const evidenceStats = useMemo(() => {
    let total = 0, covered = 0, partial = 0, gaps = 0
    for (const areas of Object.values(evidenceMap)) {
      for (const area of areas) {
        total++
        if (area.status === 'covered') covered++
        else if (area.status === 'partial') partial++
        else gaps++
      }
    }
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 0
    return { total, covered, partial, gaps, percentage }
  }, [evidenceMap])

  const handleDelete = async (docId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await supabase.storage.from('documents').remove([fileUrl])
      await supabase.from('documents').delete().eq('id', docId)
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleDownload = async (fileUrl: string, title: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(fileUrl)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = title; a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'reviewing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getFileTypeIcon = (fileType: string | null) => {
    if (!fileType) return 'bg-gray-100 text-gray-600'
    if (fileType.includes('pdf')) return 'bg-red-100 text-red-600'
    if (fileType.includes('word') || fileType.includes('document')) return 'bg-blue-100 text-blue-600'
    return 'bg-gray-100 text-gray-600'
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents & Evidence</h1>
          <p className="text-slate-500 mt-1">Manage policies and track compliance coverage</p>
        </div>
        <Button className="gap-2 bg-kwooka-ochre hover:bg-kwooka-ochre/90" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('documents')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
            activeTab === 'documents' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <FileText className="h-4 w-4" /> Documents
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
            activeTab === 'evidence' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ShieldCheck className="h-4 w-4" /> Evidence Map
          {evidenceStats.gaps > 0 && (
            <span className="h-5 min-w-[20px] rounded-full bg-red-100 text-red-700 text-[10px] font-semibold flex items-center justify-center px-1">
              {evidenceStats.gaps}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
        </div>
      ) : activeTab === 'documents' ? (
        /* ========== DOCUMENTS TAB ========== */
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'shrink-0',
                        selectedCategory === category && 'bg-kwooka-ochre hover:bg-kwooka-ochre/90'
                      )}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">All Documents</CardTitle>
                  <CardDescription>
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchDocuments}>
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-16 w-16 rounded-xl object-cover mx-auto mb-4 opacity-60" />
                  <h3 className="font-medium text-lg mb-1">No documents found</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Upload your first compliance document to get started
                  </p>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all"
                    >
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg shrink-0', getFileTypeIcon(doc.file_type))}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          {getStatusIcon(doc.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{doc.category}</span>
                          <span>·</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>·</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <Badge className={cn('shrink-0 capitalize', getStatusColor(doc.status))}>
                        {doc.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(doc.file_url, doc.title)}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(doc.id, doc.file_url)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* ========== EVIDENCE MAP TAB ========== */
        <>
          {/* Coverage Summary */}
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Compliance Coverage</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Based on {analyses.length} document analyses across your sectors</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-3xl font-bold',
                    evidenceStats.percentage >= 70 ? 'text-green-600' :
                    evidenceStats.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {evidenceStats.percentage}%
                  </p>
                  <p className="text-xs text-slate-400">areas covered</p>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    evidenceStats.percentage >= 70 ? 'bg-green-500' :
                    evidenceStats.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${evidenceStats.percentage}%` }}
                />
              </div>
              <div className="flex gap-6 mt-3">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> {evidenceStats.covered} covered
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> {evidenceStats.partial} partial
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> {evidenceStats.gaps} gaps
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Per-Sector Evidence */}
          {userSectors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-700 mb-1">No sectors configured</p>
                <p className="text-sm text-slate-500 mb-4">Set up your sectors to see compliance coverage</p>
                <Link href="/dashboard/settings/sectors">
                  <Button className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">Configure Sectors</Button>
                </Link>
              </CardContent>
            </Card>
          ) : evidenceMap && Object.entries(evidenceMap).map(([sectorId, areas]) => {
            const sectorConfig = SECTORS[sectorId as SectorId]
            if (!sectorConfig) return null
            const sectorCovered = areas.filter(a => a.status === 'covered').length
            const sectorTotal = areas.length

            return (
              <Card key={sectorId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-kwooka-ochre" />
                      {sectorConfig.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {sectorCovered}/{sectorTotal} areas covered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {areas.map((area) => (
                      <div
                        key={area.area}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg',
                          area.status === 'covered' && 'bg-green-50/50',
                          area.status === 'partial' && 'bg-amber-50/50',
                          area.status === 'gap' && 'bg-red-50/30',
                        )}
                      >
                        {area.status === 'covered' && <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />}
                        {area.status === 'partial' && <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />}
                        {area.status === 'gap' && <ShieldX className="h-4 w-4 text-red-400 shrink-0" />}

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            area.status === 'gap' ? 'text-slate-500' : 'text-slate-800'
                          )}>
                            {area.area}
                          </p>
                          {area.documents.length > 0 ? (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {area.documents.slice(0, 2).join(', ')}
                              {area.documents.length > 2 && ` +${area.documents.length - 2}`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-red-400 mt-0.5">No evidence — analyse a document covering this area</p>
                          )}
                        </div>

                        {area.score > 0 && (
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            area.score >= 70 ? 'bg-green-100 text-green-700' :
                            area.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          )}>
                            {area.score}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CTA for gaps */}
                  {areas.some(a => a.status === 'gap') && (
                    <Link href="/dashboard/analysis">
                      <div className="mt-3 p-3 bg-kwooka-ochre/5 rounded-lg flex items-center justify-between hover:bg-kwooka-ochre/10 transition-colors cursor-pointer">
                        <p className="text-xs font-medium text-kwooka-ochre">
                          Analyse documents to fill {areas.filter(a => a.status === 'gap').length} evidence gaps
                        </p>
                        <ArrowRight className="h-3.5 w-3.5 text-kwooka-ochre" />
                      </div>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      <UploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={fetchDocuments}
      />
    </div>
  )
}
