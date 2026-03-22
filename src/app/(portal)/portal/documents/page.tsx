'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText, Download, Search, Loader2, File,
  ShieldCheck, ShieldAlert, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  title: string
  category: string
  fileType: string
  fileSize: string
  status: 'approved' | 'reviewing' | 'pending'
  createdAt: string
  sector: string | null
}

export default function PortalDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      // Demo data — in production, fetch via portal-specific API
      setDocuments([
        { id: '1', title: 'Incident Management Policy v3.2', category: 'Policy', fileType: 'PDF', fileSize: '245 KB', status: 'approved', createdAt: '2025-12-15', sector: 'ndis' },
        { id: '2', title: 'Worker Screening Register 2025', category: 'Evidence', fileType: 'XLSX', fileSize: '182 KB', status: 'approved', createdAt: '2025-11-20', sector: 'ndis' },
        { id: '3', title: 'WHS Risk Assessment — Office', category: 'Risk Assessment', fileType: 'PDF', fileSize: '1.2 MB', status: 'approved', createdAt: '2025-10-08', sector: 'workplace' },
        { id: '4', title: 'Emergency Evacuation Procedures', category: 'Procedure', fileType: 'DOCX', fileSize: '380 KB', status: 'reviewing', createdAt: '2025-09-14', sector: 'workplace' },
        { id: '5', title: 'NDIS Practice Standards Self-Assessment', category: 'Audit Report', fileType: 'PDF', fileSize: '890 KB', status: 'approved', createdAt: '2025-08-22', sector: 'ndis' },
        { id: '6', title: 'Staff Training Competency Matrix', category: 'Training Record', fileType: 'XLSX', fileSize: '156 KB', status: 'approved', createdAt: '2025-07-30', sector: null },
        { id: '7', title: 'Complaints Management Framework', category: 'Policy', fileType: 'PDF', fileSize: '210 KB', status: 'pending', createdAt: '2025-07-10', sector: 'ndis' },
        { id: '8', title: 'Fatigue Management Plan', category: 'Policy', fileType: 'PDF', fileSize: '175 KB', status: 'approved', createdAt: '2025-06-18', sector: 'transport' },
      ])
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  )

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <ShieldCheck className="h-4 w-4 text-green-500" />
      case 'reviewing': return <Clock className="h-4 w-4 text-amber-500" />
      default: return <ShieldAlert className="h-4 w-4 text-slate-400" />
    }
  }

  const fileIcon = (type: string) => {
    const colors: Record<string, string> = { PDF: 'text-red-500', DOCX: 'text-blue-500', XLSX: 'text-green-600' }
    return <File className={cn('h-5 w-5', colors[type] || 'text-slate-400')} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compliance documents and evidence — view and download
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-kwooka-ochre" />
              {filtered.length} Documents
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No documents found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    {fileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{doc.category}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{doc.fileType} · {doc.fileSize}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString('en-AU')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(doc.status)}
                      <span className="text-xs text-slate-500 capitalize">{doc.status}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-kwooka-ochre">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
