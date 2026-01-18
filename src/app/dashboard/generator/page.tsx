'use client'

import React, { useState, useEffect } from 'react'
import {
  Wand2, FileText, Search, Loader2, Download, Copy, CheckCircle2,
  Shield, Truck, Heart, Home, Briefcase, HardHat, Star,
  ChevronRight, ChevronLeft, Sparkles, Eye, X, FileDown,
  Clock, Zap, Building2, Check, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const CATEGORIES = [
  { id: 'all', name: 'All Types', icon: FileText },
  { id: 'policy', name: 'Policies', icon: FileText },
  { id: 'procedure', name: 'Procedures', icon: Zap },
  { id: 'form', name: 'Forms', icon: FileText },
  { id: 'plan', name: 'Plans', icon: FileText },
  { id: 'register', name: 'Registers', icon: FileText },
]

// Pre-built templates
const TEMPLATES = [
  // NDIS Templates
  { id: 'ndis-1', name: 'Participant Rights Policy', description: 'Policy ensuring participants understand their rights under the NDIS.', sector: 'ndis', category: 'policy', standard: 'Practice Standard 1', downloads: 1250, rating: 4.8, featured: true },
  { id: 'ndis-2', name: 'Incident Management Procedure', description: 'Procedure for reporting and managing incidents and near-misses.', sector: 'ndis', category: 'procedure', standard: 'Practice Standard 6', downloads: 980, rating: 4.7, featured: true },
  { id: 'ndis-3', name: 'Complaints Handling Policy', description: 'Policy for receiving and resolving participant complaints.', sector: 'ndis', category: 'policy', standard: 'Practice Standard 6', downloads: 850, rating: 4.6, featured: false },
  { id: 'ndis-4', name: 'Risk Assessment Form', description: 'Form for conducting participant risk assessments.', sector: 'ndis', category: 'form', standard: 'Practice Standard 4', downloads: 1100, rating: 4.9, featured: true },
  { id: 'ndis-5', name: 'Service Agreement Template', description: 'Service agreement covering all NDIS requirements.', sector: 'ndis', category: 'form', standard: 'Practice Standard 1', downloads: 2100, rating: 4.8, featured: true },
  { id: 'ndis-6', name: 'Medication Management Procedure', description: 'Safe medication administration procedures.', sector: 'ndis', category: 'procedure', standard: 'Practice Standard 3', downloads: 720, rating: 4.5, featured: false },
  { id: 'ndis-7', name: 'Worker Screening Register', description: 'Register for tracking worker clearances.', sector: 'ndis', category: 'register', standard: 'Practice Standard 2', downloads: 650, rating: 4.4, featured: false },
  { id: 'ndis-8', name: 'Continuity of Supports Plan', description: 'Business continuity plan for participant support.', sector: 'ndis', category: 'plan', standard: 'Practice Standard 2', downloads: 480, rating: 4.3, featured: false },
  
  // Transport Templates
  { id: 'transport-1', name: 'Fatigue Management Policy', description: 'Fatigue management policy compliant with HVNL.', sector: 'transport', category: 'policy', standard: 'HVNL Section 228', downloads: 890, rating: 4.7, featured: true },
  { id: 'transport-2', name: 'Chain of Responsibility Procedure', description: 'CoR compliance procedure for transport chain.', sector: 'transport', category: 'procedure', standard: 'HVNL Part 2', downloads: 760, rating: 4.6, featured: true },
  { id: 'transport-3', name: 'Driver Daily Checklist', description: 'Pre-trip inspection checklist for drivers.', sector: 'transport', category: 'form', standard: 'HVNL Section 49', downloads: 1450, rating: 4.9, featured: true },
  { id: 'transport-4', name: 'Mass Management Register', description: 'Register for vehicle mass compliance.', sector: 'transport', category: 'register', standard: 'HVNL Part 4', downloads: 520, rating: 4.4, featured: false },
  { id: 'transport-5', name: 'Speed Compliance Policy', description: 'Policy for vehicle speed compliance.', sector: 'transport', category: 'policy', standard: 'HVNL Section 228A', downloads: 680, rating: 4.5, featured: false },
  
  // Healthcare Templates
  { id: 'healthcare-1', name: 'Clinical Governance Policy', description: 'Clinical governance and quality improvement framework.', sector: 'healthcare', category: 'policy', standard: 'NSQHS Standard 1', downloads: 920, rating: 4.8, featured: true },
  { id: 'healthcare-2', name: 'Hand Hygiene Procedure', description: 'Hand hygiene procedure aligned with WHO guidelines.', sector: 'healthcare', category: 'procedure', standard: 'NSQHS Standard 3', downloads: 1680, rating: 4.9, featured: true },
  { id: 'healthcare-3', name: 'Patient Identification Checklist', description: 'Checklist for correct patient identification.', sector: 'healthcare', category: 'form', standard: 'NSQHS Standard 5', downloads: 1120, rating: 4.7, featured: true },
  { id: 'healthcare-4', name: 'Medication Safety Policy', description: 'Medication safety from prescribing to administration.', sector: 'healthcare', category: 'policy', standard: 'NSQHS Standard 4', downloads: 780, rating: 4.6, featured: false },
  
  // Aged Care Templates
  { id: 'aged-care-1', name: 'Dignity of Risk Policy', description: 'Policy supporting resident choice and risk management.', sector: 'aged_care', category: 'policy', standard: 'Quality Standard 1', downloads: 720, rating: 4.7, featured: true },
  { id: 'aged-care-2', name: 'Falls Prevention Procedure', description: 'Falls prevention and post-fall management.', sector: 'aged_care', category: 'procedure', standard: 'Quality Standard 3', downloads: 980, rating: 4.8, featured: true },
  { id: 'aged-care-3', name: 'Care Plan Template', description: 'Person-centered care plan template.', sector: 'aged_care', category: 'form', standard: 'Quality Standard 2', downloads: 1340, rating: 4.9, featured: true },
  
  // Workplace Templates
  { id: 'workplace-1', name: 'WHS Policy', description: 'Workplace health and safety policy.', sector: 'workplace', category: 'policy', standard: 'WHS Act Section 19', downloads: 2450, rating: 4.8, featured: true },
  { id: 'workplace-2', name: 'Hazard Reporting Procedure', description: 'Procedure for reporting workplace hazards.', sector: 'workplace', category: 'procedure', standard: 'WHS Regulations', downloads: 1890, rating: 4.7, featured: true },
  { id: 'workplace-3', name: 'Risk Assessment Form', description: 'Workplace risk assessment form.', sector: 'workplace', category: 'form', standard: 'WHS Regulations Part 3', downloads: 2100, rating: 4.9, featured: true },
  { id: 'workplace-4', name: 'Incident Register', description: 'Register for workplace incidents.', sector: 'workplace', category: 'register', standard: 'WHS Regulations', downloads: 1560, rating: 4.6, featured: false },
  
  // Construction Templates
  { id: 'construction-1', name: 'Safe Work Method Statement', description: 'SWMS for high-risk construction work.', sector: 'construction', category: 'form', standard: 'WHS Regulations Part 6', downloads: 3200, rating: 4.9, featured: true },
  { id: 'construction-2', name: 'Site Induction Checklist', description: 'Site induction checklist for WHS.', sector: 'construction', category: 'form', standard: 'WHS Regulations', downloads: 2800, rating: 4.8, featured: true },
  { id: 'construction-3', name: 'Working at Heights Procedure', description: 'Safe work procedure for heights.', sector: 'construction', category: 'procedure', standard: 'WHS Regulations Part 4.4', downloads: 1950, rating: 4.7, featured: true },
  { id: 'construction-4', name: 'Construction Safety Plan', description: 'WHS management plan template.', sector: 'construction', category: 'plan', standard: 'WHS Regulations Part 6.4', downloads: 1240, rating: 4.6, featured: false },
]

const STEPS = [
  { id: 1, name: 'Choose Template', description: 'Select a template or create custom' },
  { id: 2, name: 'Customize', description: 'Add your organization details' },
  { id: 3, name: 'Generate', description: 'AI creates your document' },
  { id: 4, name: 'Download', description: 'Export as PDF or copy' },
]

export default function PolicyGeneratorPage() {
  const { userSectors, primarySector, isLoading: sectorsLoading } = useSector()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  
  // Form state
  const [organizationName, setOrganizationName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [includeAppendix, setIncludeAppendix] = useState(true)
  const [includeReviewDate, setIncludeReviewDate] = useState(true)
  
  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedSections, setGeneratedSections] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Filter templates
  const filteredTemplates = TEMPLATES.filter(template => {
    if (selectedSector !== 'all' && template.sector !== selectedSector) return false
    if (selectedSector === 'all' && userSectors.length > 0 && !userSectors.includes(template.sector)) return false
    if (selectedCategory !== 'all' && template.category !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return template.name.toLowerCase().includes(query) || template.description.toLowerCase().includes(query)
    }
    return true
  })

  const getSectorInfo = (sectorId: string) => ALL_SECTORS.find(s => s.id === sectorId)
  
  const availableSectors = userSectors.length > 0 
    ? ALL_SECTORS.filter(s => userSectors.includes(s.id))
    : ALL_SECTORS

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
    setCurrentStep(2)
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    
    setCurrentStep(3)
    setGenerating(true)
    
    try {
      // Simulate AI generation with structured content
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const orgName = organizationName || '[Organization Name]'
      const today = new Date().toLocaleDateString('en-AU')
      const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')
      
      const sections = [
        {
          title: 'Document Control',
          content: `**Document Title:** ${selectedTemplate.name}\n**Version:** 1.0\n**Effective Date:** ${today}\n**Review Date:** ${reviewDate}\n**Approved By:** [Authorised Person]\n**Organization:** ${orgName}`
        },
        {
          title: '1. Purpose',
          content: `This ${selectedTemplate.category} establishes the framework for ${selectedTemplate.name.toLowerCase()} at ${orgName}. It ensures compliance with ${selectedTemplate.standard} and provides clear guidance for all staff members.`
        },
        {
          title: '2. Scope',
          content: `This document applies to:\n• All employees, contractors, and volunteers of ${orgName}\n• All service delivery locations and activities\n• All participants/clients receiving services\n• Third-party providers working on behalf of ${orgName}`
        },
        {
          title: '3. Policy Statement',
          content: `${orgName} is committed to maintaining the highest standards of compliance and quality in all operations. We recognize our obligations under ${selectedTemplate.standard} and are dedicated to:\n\n• Upholding the rights and dignity of all participants\n• Providing safe and quality services\n• Continuous improvement of our practices\n• Transparent and accountable governance`
        },
        {
          title: '4. Responsibilities',
          content: `**Management:**\n• Ensure adequate resources for implementation\n• Monitor compliance and effectiveness\n• Review and update this document annually\n\n**Staff:**\n• Understand and follow this ${selectedTemplate.category}\n• Report any concerns or breaches\n• Participate in relevant training\n\n**Compliance Officer:**\n• Oversee implementation\n• Conduct regular audits\n• Manage incident reporting`
        },
        {
          title: '5. Procedure',
          content: `**5.1 Implementation**\nThis ${selectedTemplate.category} will be implemented through:\n1. Staff training and orientation\n2. Regular communication and updates\n3. Monitoring and reporting mechanisms\n\n**5.2 Compliance Monitoring**\n• Monthly internal reviews\n• Quarterly compliance audits\n• Annual external assessments\n\n**5.3 Incident Management**\nAny breaches must be reported within 24 hours to the Compliance Officer.`
        },
        {
          title: '6. Related Documents',
          content: `• ${getSectorInfo(selectedTemplate.sector)?.name} Code of Conduct\n• Risk Management Framework\n• Incident Reporting Procedure\n• Staff Training Policy\n• ${selectedTemplate.standard} Guidelines`
        },
        {
          title: '7. Review',
          content: `This document will be reviewed:\n• Annually from the effective date\n• Following any significant incident\n• When legislation or standards change\n• At the request of management or regulatory bodies\n\n**Review History:**\n| Version | Date | Author | Changes |\n|---------|------|--------|----------|\n| 1.0 | ${today} | [Author] | Initial release |`
        }
      ]

      if (customPrompt) {
        sections.push({
          title: '8. Additional Requirements',
          content: customPrompt
        })
      }

      setGeneratedSections(sections)
      setGeneratedContent(sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n'))
      setCurrentStep(4)
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTemplate.name,
          organization: organizationName || '[Organization Name]',
          sections: generatedSections,
          metadata: {
            sector: getSectorInfo(selectedTemplate.sector)?.name,
            standard: selectedTemplate.standard,
            category: selectedTemplate.category,
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback to text download
        handleDownloadText()
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      handleDownloadText()
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadText = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate?.name.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStartOver = () => {
    setSelectedTemplate(null)
    setGeneratedContent('')
    setGeneratedSections([])
    setCustomPrompt('')
    setOrganizationName('')
    setCurrentStep(1)
  }

  if (sectorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-kwooka-ochre to-amber-600 rounded-2xl mb-4">
          <Wand2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">AI Policy Generator</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Create professional compliance documents in minutes. Choose a template, customize it, and download as PDF.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-kwooka-ochre text-white ring-4 ring-kwooka-ochre/20'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <span className={cn(
                  'text-xs mt-2 font-medium hidden sm:block',
                  currentStep >= step.id ? 'text-slate-900' : 'text-slate-400'
                )}>
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 md:w-24 h-1 mx-2 rounded-full transition-all',
                    currentStep > step.id ? 'bg-green-500' : 'bg-slate-100'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Choose Template */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-kwooka-ochre group"
              onClick={() => {
                setSelectedTemplate({ 
                  id: 'custom', 
                  name: 'Custom Policy', 
                  description: 'Create a custom policy from scratch',
                  sector: primarySector || 'ndis', 
                  category: 'policy',
                  standard: 'Custom'
                })
                setCurrentStep(2)
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-kwooka-ochre to-amber-600 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Create Custom Document</h3>
                    <p className="text-sm text-muted-foreground">
                      Use AI to generate a completely custom policy, procedure, or form
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-kwooka-ochre transition-colors" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-200">
                    <Clock className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Recent Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      No recent documents yet. Your generated policies will appear here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                
                {/* Sector Pills */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSector('all')}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      selectedSector === 'all'
                        ? 'bg-kwooka-ochre text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    All Sectors
                  </button>
                  {availableSectors.map(sector => {
                    const SectorIcon = SECTOR_ICONS[sector.id]
                    return (
                      <button
                        key={sector.id}
                        onClick={() => setSelectedSector(sector.id)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                          selectedSector === sector.id
                            ? 'bg-kwooka-ochre text-white shadow-md'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        )}
                      >
                        <SectorIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">{sector.name}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-all',
                        selectedCategory === cat.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {searchQuery ? 'Search Results' : 'Available Templates'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredTemplates.length} templates
              </span>
            </div>

            {filteredTemplates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    sectorInfo={getSectorInfo(template.sector)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium">No templates found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or create a custom document
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Customize */}
      {currentStep === 2 && selectedTemplate && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={cn('p-3 rounded-xl', getSectorInfo(selectedTemplate.sector)?.color || 'bg-slate-500')}>
                    {React.createElement(SECTOR_ICONS[selectedTemplate.sector] || FileText, { className: 'h-6 w-6 text-white' })}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                    <CardDescription className="mt-1">{selectedTemplate.description}</CardDescription>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline">{getSectorInfo(selectedTemplate.sector)?.name}</Badge>
                      <Badge variant="secondary" className="capitalize">{selectedTemplate.category}</Badge>
                      {selectedTemplate.standard && <Badge variant="outline">{selectedTemplate.standard}</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Details</CardTitle>
                <CardDescription>Customize the document for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="org-name" className="text-base">Organization Name *</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter your organization name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="mt-2 h-12"
                  />
                </div>
                
                <div>
                  <Label htmlFor="custom-prompt" className="text-base">Additional Requirements</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add any specific requirements or customizations
                  </p>
                  <textarea
                    id="custom-prompt"
                    placeholder="E.g., Include specific procedures for remote workers, add references to state-specific legislation..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kwooka-ochre"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base">Document Options</Label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAppendix}
                      onChange={(e) => setIncludeAppendix(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-kwooka-ochre focus:ring-kwooka-ochre"
                    />
                    <span className="text-sm">Include appendix with related forms</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeReviewDate}
                      onChange={(e) => setIncludeReviewDate(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-kwooka-ochre focus:ring-kwooka-ochre"
                    />
                    <span className="text-sm">Add automatic review date (12 months)</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Compliant with {selectedTemplate.standard}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Professional document structure</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Customized for {organizationName || 'your organization'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Download as PDF</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={handleGenerate}
                    className="w-full h-12 bg-kwooka-ochre hover:bg-kwooka-ochre/90 text-base"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="w-full"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {currentStep === 3 && generating && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12 text-center">
            <div className="relative inline-flex mb-6">
              <div className="w-20 h-20 rounded-full bg-kwooka-ochre/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-kwooka-ochre" />
              </div>
              <Sparkles className="h-6 w-6 text-kwooka-ochre absolute -right-1 -top-1 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generating Your Document</h3>
            <p className="text-muted-foreground">
              Our AI is creating a professional {selectedTemplate?.category} tailored to your requirements...
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-kwooka-ochre animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-kwooka-ochre animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-kwooka-ochre animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Success Banner */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Document Generated Successfully!</p>
                    <p className="text-sm text-green-700">Your {selectedTemplate?.name} is ready to download</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Preview */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTemplate?.name}</CardTitle>
                  <CardDescription>
                    {organizationName || '[Organization Name]'} • Generated {new Date().toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Compliant
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {generatedSections.map((section, index) => (
                  <div key={index} className={cn('p-6', index > 0 && 'border-t')}>
                    <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-gradient-to-r from-kwooka-ochre/5 to-amber-500/5 border-kwooka-ochre/20">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-4">Recommended Next Steps</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Eye className="h-4 w-4 text-kwooka-ochre" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Review & Customize</p>
                    <p className="text-xs text-muted-foreground">Add organization-specific details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Building2 className="h-4 w-4 text-kwooka-ochre" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Get Approval</p>
                    <p className="text-xs text-muted-foreground">Have stakeholders review the document</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FileText className="h-4 w-4 text-kwooka-ochre" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Upload to Documents</p>
                    <p className="text-xs text-muted-foreground">Track compliance with AI analysis</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Sparkles className="h-4 w-4 text-kwooka-ochre" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Generate More</p>
                    <p className="text-xs text-muted-foreground">Create related policies & procedures</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleStartOver}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Another Document
            </Button>
            <Button 
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Template Card Component
function TemplateCard({ template, sectorInfo, onSelect }: any) {
  const SectorIcon = SECTOR_ICONS[template.sector] || FileText

  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-kwooka-ochre/50"
      onClick={onSelect}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-2.5 rounded-xl', sectorInfo?.color || 'bg-slate-500')}>
            <SectorIcon className="h-5 w-5 text-white" />
          </div>
          {template.featured && (
            <Badge className="bg-amber-100 text-amber-700 border-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Popular
            </Badge>
          )}
        </div>

        <h3 className="font-semibold mb-2 group-hover:text-kwooka-ochre transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="text-xs">{sectorInfo?.name}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{template.category}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {template.downloads.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500 fill-current" />
            {template.rating}
          </span>
          <span className="text-kwooka-ochre font-medium group-hover:underline">
            Use Template →
          </span>
        </div>
      </CardContent>
    </Card>
  )
}