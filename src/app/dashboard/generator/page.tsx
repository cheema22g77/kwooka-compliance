'use client'

import React, { useState, useEffect } from 'react'
import { Wand2, FileText, Download, Copy, CheckCircle2, Loader2, Building, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const POLICY_TEMPLATES = [
  { id: 'rights', name: 'Rights and Responsibilities Policy', standard: 1, description: 'Outlines participant rights and provider responsibilities' },
  { id: 'governance', name: 'Governance Policy', standard: 2, description: 'Defines organizational governance structure and accountability' },
  { id: 'service-delivery', name: 'Service Delivery Policy', standard: 3, description: 'Details how supports are planned and delivered' },
  { id: 'privacy', name: 'Privacy and Information Management Policy', standard: 5, description: 'Protects participant personal information' },
  { id: 'complaints', name: 'Feedback and Complaints Policy', standard: 6, description: 'Manages feedback and resolves complaints' },
  { id: 'incident', name: 'Incident Management Policy', standard: 7, description: 'Identifies, reports and manages incidents' },
  { id: 'hr', name: 'Human Resources Policy', standard: 8, description: 'Covers recruitment, training and supervision' },
]

export default function GeneratorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('Kwooka Health Services')
  const [companyType, setCompanyType] = useState<string>('disability support provider')
  const [generating, setGenerating] = useState(false)
  const [generatedPolicy, setGeneratedPolicy] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!selectedTemplate || !companyName) {
      setError('Please select a policy type and enter your company name')
      return
    }

    console.log('Starting generation...')
    setGenerating(true)
    setError(null)
    setGeneratedPolicy('')

    try {
      const template = POLICY_TEMPLATES.find(t => t.id === selectedTemplate)
      
      const requestBody = {
        policyType: template?.name || '',
        companyName,
        companyType,
        standardNumber: template?.standard || 1,
      }
      
      console.log('Request body:', requestBody)

      const response = await fetch('/api/generate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      
      const text = await response.text()
      console.log('Response text:', text)
      
      if (!text) {
        throw new Error('Empty response from server')
      }

      const result = JSON.parse(text)
      
      if (!response.ok) {
        throw new Error(result.error || 'Generation failed')
      }
      
      if (!result.policy) {
        throw new Error('No policy in response')
      }
      
      setGeneratedPolicy(result.policy)
    } catch (err: any) {
      console.error('Generation error:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPolicy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedPolicy], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate}-policy.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-8 w-8 text-kwooka-ochre" />
          AI Policy Generator
        </h1>
        <p className="text-muted-foreground mt-1">Generate NDIS-compliant policies tailored to your organization</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configure Policy</CardTitle>
            <CardDescription>Select policy type and customize for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building className="h-4 w-4" />Organization Name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Kwooka Health Services" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Users className="h-4 w-4" />Organization Type</Label>
              <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="disability support provider">Disability Support Provider</option>
                <option value="support coordination provider">Support Coordination Provider</option>
                <option value="allied health provider">Allied Health Provider</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Select Policy Type *</Label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Choose a policy...</option>
                {POLICY_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="bg-accent/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">{POLICY_TEMPLATES.find(t => t.id === selectedTemplate)?.description}</p>
                <Badge className="mt-2" variant="outline">Standard #{POLICY_TEMPLATES.find(t => t.id === selectedTemplate)?.standard}</Badge>
              </div>
            )}

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

            <Button onClick={handleGenerate} disabled={generating || !selectedTemplate || !companyName} className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90">
              {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating (30-60s)...</> : <><Wand2 className="mr-2 h-4 w-4" />Generate Policy</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {POLICY_TEMPLATES.map((template) => (
                <button key={template.id} onClick={() => setSelectedTemplate(template.id)} className={cn('flex items-center justify-between p-3 rounded-lg border text-left', selectedTemplate === template.id ? 'border-kwooka-ochre bg-kwooka-ochre/10' : 'hover:bg-accent')}>
                  <div>
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground">Standard #{template.standard}</p>
                  </div>
                  {selectedTemplate === template.id && <CheckCircle2 className="h-5 w-5 text-kwooka-ochre" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {generatedPolicy && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Policy</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea value={generatedPolicy} onChange={(e) => setGeneratedPolicy(e.target.value)} rows={20} className="w-full rounded-lg border p-3 text-sm font-mono" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
