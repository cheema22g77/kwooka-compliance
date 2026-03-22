'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Sparkles, Upload, Loader2, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight,
  RotateCcw, Download, MessageCircle, Wand2,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { exportAnalysisReport } from '@/lib/pdf/export-report'
import { extractPDFText, isPDF, formatExtractionResult } from '@/lib/pdf/extractor'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import { useChatStore } from '@/hooks/use-chat-store'
import { ChatMessage, TypingIndicator } from '@/components/chat/chat-message'
import { QuickActions } from '@/components/chat/quick-actions'
import Link from 'next/link'

const DOCUMENT_TYPES = [
  'Policy Document', 'Procedure Manual', 'Contract/Agreement', 'Training Record',
  'Incident Report', 'Audit Report', 'Risk Assessment', 'Other'
]

type TabId = 'analyse' | 'ask' | 'generate'

const TABS: { id: TabId; label: string; icon: any; description: string }[] = [
  { id: 'analyse', label: 'Analyse', icon: Sparkles, description: 'Upload & score a document' },
  { id: 'ask', label: 'Ask', icon: MessageCircle, description: 'Chat with compliance AI' },
  { id: 'generate', label: 'Generate', icon: Wand2, description: 'Create a policy document' },
]

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabId>('analyse')

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-10 w-10 rounded-xl object-cover" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyse</h1>
          <p className="text-slate-500 mt-0.5">Upload documents, ask questions, or generate policies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'analyse' && <AnalyseTab />}
      {activeTab === 'ask' && <AskTab />}
      {activeTab === 'generate' && <GenerateTab />}
    </div>
  )
}

/* ============================================================
   TAB 1: ANALYSE — Document upload and AI analysis
   ============================================================ */
function AnalyseTab() {
  const { userSectors, primarySector } = useSector()
  const [documentText, setDocumentText] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [documentType, setDocumentType] = useState('Policy Document')
  const [selectedSector, setSelectedSector] = useState(primarySector || '')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null)
  const [pdfMessage, setPdfMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const availableSectors = ALL_SECTORS.filter(s => userSectors.includes(s.id))
  const currentSector = ALL_SECTORS.find(s => s.id === (selectedSector || primarySector))

  useEffect(() => {
    if (primarySector && !selectedSector) setSelectedSector(primarySector)
  }, [primarySector])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocumentName(file.name)
    setPdfMessage('')

    if (isPDF(file)) {
      setPdfMessage('Extracting text from PDF...')
      try {
        const result = await extractPDFText(file)
        setDocumentText(result.text)
        setPdfMessage(formatExtractionResult(result))
      } catch (err) {
        console.error('PDF extraction error:', err)
        setPdfMessage('Failed to extract PDF text. Please paste content manually.')
      }
    } else {
      const text = await file.text()
      setDocumentText(text)
    }
  }

  const handleAnalyze = async () => {
    if (!documentText.trim() || !selectedSector) return
    setAnalyzing(true)
    setAnalysis(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          sector: selectedSector,
          documentType,
          documentName: documentName || 'Untitled',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result)
    } catch (error: any) {
      console.error('Analysis error:', error)
      alert(error.message || 'Analysis failed. Please try again.')
    }
    setAnalyzing(false)
  }

  const resetAnalysis = () => {
    setAnalysis(null)
    setDocumentText('')
    setDocumentName('')
    setPdfMessage('')
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700', LOW: 'bg-blue-100 text-blue-700',
      INFO: 'bg-slate-100 text-slate-700',
    }
    return colors[severity] || 'bg-slate-100 text-slate-700'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLIANT: 'bg-green-100 text-green-700', GAP: 'bg-red-100 text-red-700',
      PARTIAL: 'bg-amber-100 text-amber-700', NOT_ADDRESSED: 'bg-slate-100 text-slate-700',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  // Show results if analysis complete
  if (analysis) {
    return (
      <div className="space-y-4">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{documentName || 'Analysis Results'}</h2>
            <p className="text-sm text-slate-500">{currentSector?.name} Compliance Analysis</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAnalysisReport(analysis)} className="gap-1">
              <Download className="h-3 w-3" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={resetAnalysis} className="gap-1">
              <RotateCcw className="h-3 w-3" /> New Analysis
            </Button>
          </div>
        </div>

        {/* Score + Summary */}
        <Card className={cn('border-2', getScoreColor(analysis.overallScore))}>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{analysis.overallScore}%</div>
                <Badge className={cn('mt-2', getStatusColor(analysis.overallStatus))}>{analysis.overallStatus}</Badge>
              </div>
              <div className="flex-1">
                <p className="text-sm">{analysis.summary}</p>
                {analysis.findingsCreated > 0 && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {analysis.findingsCreated} findings created as trackable items →{' '}
                    <Link href="/dashboard/findings" className="text-kwooka-ochre underline">View Findings</Link>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{analysis.findings?.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length || 0}</div>
            <div className="text-xs text-slate-500">Critical / High</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{analysis.findings?.filter((f: any) => f.status === 'GAP').length || 0}</div>
            <div className="text-xs text-slate-500">Gaps Found</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{analysis.findings?.filter((f: any) => f.status === 'COMPLIANT').length || 0}</div>
            <div className="text-xs text-slate-500">Compliant</div>
          </CardContent></Card>
        </div>

        {/* Critical Gaps */}
        {analysis.criticalGaps?.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2"><CardTitle className="text-base text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Critical Gaps</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {analysis.criticalGaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span> {gap}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Compliance by Area */}
        {analysis.complianceByArea?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Compliance by Area</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {analysis.complianceByArea.map((area: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-40 truncate">{area.area}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={cn('h-full rounded-full', area.score >= 80 ? 'bg-green-500' : area.score >= 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${area.score}%` }} />
                  </div>
                  <span className="text-sm font-medium w-10 text-right">{area.score}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Detailed Findings */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Findings ({analysis.findings?.length || 0})</CardTitle></CardHeader>
          <CardContent className="pt-0 divide-y">
            {analysis.findings?.map((finding: any, i: number) => (
              <div key={i}>
                <div className="p-3 cursor-pointer hover:bg-slate-50 flex items-center gap-3" onClick={() => setExpandedFinding(expandedFinding === i ? null : i)}>
                  {finding.status === 'COMPLIANT' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{finding.title}</p>
                    <p className="text-xs text-slate-500">{finding.area}</p>
                  </div>
                  <Badge className={cn('text-xs', getSeverityColor(finding.severity))}>{finding.severity}</Badge>
                  {expandedFinding === i ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </div>
                {expandedFinding === i && (
                  <div className="px-10 pb-3 space-y-2 text-sm">
                    <div><Label className="text-xs text-slate-400">Description</Label><p>{finding.description}</p></div>
                    {finding.regulation && <div><Label className="text-xs text-slate-400">Regulation</Label><p>{finding.regulation}</p></div>}
                    {finding.recommendation && <div><Label className="text-xs text-slate-400">Recommendation</Label><p className="text-kwooka-ochre">{finding.recommendation}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Plan */}
        {analysis.actionPlan?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Action Plan</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {analysis.actionPlan.map((action: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-slate-50">
                  <div className="h-6 w-6 rounded-full bg-kwooka-ochre/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-kwooka-ochre">{action.priority}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.action}</p>
                    <p className="text-xs text-slate-500">{action.timeframe} · {action.responsibility}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Upload form
  return (
    <div className="space-y-4">
      {/* Sector + Document Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-sm mb-1.5 block">Sector</Label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Select sector...</option>
            {availableSectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">Document Type</Label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white"
          >
            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <Label className="text-sm mb-1.5 block">Upload Document</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-kwooka-ochre/40 hover:bg-kwooka-ochre/5 transition-all"
        >
          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            {documentName || 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, or paste text below</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          onChange={handleFileUpload}
        />
        {pdfMessage && <p className="text-xs text-slate-500 mt-1">{pdfMessage}</p>}
      </div>

      {/* Text Input */}
      <div>
        <Label className="text-sm mb-1.5 block">Or Paste Document Text</Label>
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder={`Paste your ${currentSector?.name || 'compliance'} document text here...`}
          rows={8}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-y"
        />
        {documentText && (
          <p className="text-xs text-slate-400 mt-1">{documentText.length.toLocaleString()} characters</p>
        )}
      </div>

      {/* Analyse Button */}
      <Button
        onClick={handleAnalyze}
        disabled={!documentText.trim() || !selectedSector || analyzing}
        className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90 text-white gap-2 py-5"
      >
        {analyzing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Analysing... this takes about 30 seconds</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Analyse Document</>
        )}
      </Button>
    </div>
  )
}

/* ============================================================
   TAB 2: ASK — Compliance Copilot Chat
   ============================================================ */
function AskTab() {
  const { messages, isLoading, currentSector, addMessage, updateMessage, setLoading, setSector, clearMessages } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return
    addMessage({ role: 'user', content })
    setInput('')
    setLoading(true)

    const conversationHistory = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sector: currentSector, conversationHistory }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let assistantMessageId: string | null = null
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta') {
              fullContent += data.content
              if (!assistantMessageId) {
                assistantMessageId = addMessage({ role: 'assistant', content: fullContent })
              } else {
                updateMessage(assistantMessageId, { content: fullContent })
              }
            } else if (data.type === 'done' && assistantMessageId && data.metadata) {
              updateMessage(assistantMessageId, { metadata: data.metadata })
            }
          } catch {}
        }
      }
    } catch (error) {
      addMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
    }
    setLoading(false)
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="space-y-4">
        <QuickActions sector={currentSector} onSelect={handleSend} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
          placeholder="Ask about compliance..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
        />
        <Button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isLoading}
          className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ============================================================
   TAB 3: GENERATE — Policy Generator (simplified)
   ============================================================ */
function GenerateTab() {
  const { userSectors, primarySector } = useSector()
  const [selectedSector, setSelectedSector] = useState(primarySector || '')
  const [policyName, setPolicyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const availableSectors = ALL_SECTORS.filter(s => userSectors.includes(s.id))

  const handleGenerate = async () => {
    if (!policyName.trim() || !selectedSector) return
    setGenerating(true)
    setGeneratedContent('')

    try {
      const response = await fetch('/api/generate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: selectedSector,
          policyType: policyName,
          format: 'detailed',
        }),
      })

      if (!response.ok) throw new Error('Generation failed')
      const result = await response.json()
      setGeneratedContent(result.content || result.policy || JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate policy. Please try again.')
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-sm mb-1.5 block">Sector</Label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Select sector...</option>
            {availableSectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">Policy Name</Label>
          <Input
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            placeholder="e.g. Incident Management Policy"
          />
        </div>
      </div>

      {/* Common policy suggestions */}
      {selectedSector && !policyName && (
        <div>
          <Label className="text-xs text-slate-400 mb-2 block">Common policies for this sector</Label>
          <div className="flex flex-wrap gap-2">
            {getCommonPolicies(selectedSector).map(p => (
              <button
                key={p}
                onClick={() => setPolicyName(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-kwooka-ochre/40 hover:bg-kwooka-ochre/5 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!policyName.trim() || !selectedSector || generating}
        className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90 text-white gap-2 py-5"
      >
        {generating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating policy...</>
        ) : (
          <><Wand2 className="h-4 w-4" /> Generate Policy</>
        )}
      </Button>

      {generatedContent && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{policyName}</CardTitle>
              <Button
                variant="outline" size="sm"
                onClick={() => navigator.clipboard.writeText(generatedContent)}
                className="gap-1 text-xs"
              >
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-slate-700 max-h-[50vh] overflow-y-auto">
              {generatedContent}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getCommonPolicies(sector: string): string[] {
  const policies: Record<string, string[]> = {
    ndis: ['Incident Management Policy', 'Complaints & Feedback Policy', 'Worker Screening Policy', 'Restrictive Practices Policy', 'Privacy Policy'],
    transport: ['Fatigue Management Policy', 'Chain of Responsibility Policy', 'Speed Compliance Policy', 'Load Restraint Policy'],
    healthcare: ['Clinical Governance Policy', 'Infection Control Policy', 'Medication Management Policy', 'Patient Safety Policy'],
    aged_care: ['Consumer Dignity Policy', 'Clinical Care Policy', 'Complaints Policy', 'Restraint Management Policy'],
    workplace: ['Risk Management Policy', 'Incident Reporting Policy', 'Consultation Policy', 'Emergency Procedures'],
    construction: ['SWMS Template', 'Asbestos Management Plan', 'Working at Heights Policy', 'Plant Safety Policy'],
  }
  return policies[sector] || ['Compliance Policy', 'Risk Management Policy', 'Incident Management Policy']
}
