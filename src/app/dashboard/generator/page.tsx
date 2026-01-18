'use client'

import React, { useState, useEffect } from 'react'
import {
  Wand2, FileText, Search, Loader2, Download, Copy, CheckCircle2,
  Shield, Truck, Heart, Home, Briefcase, HardHat, Star, StarOff,
  ChevronRight, Sparkles, Eye, X, ArrowLeft, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSector, ALL_SECTORS } from '@/contexts/sector-context'
import { useSearchParams } from 'next/navigation'

const SECTOR_ICONS: Record<string, any> = {
  ndis: Shield,
  transport: Truck,
  healthcare: Heart,
  aged_care: Home,
  workplace: Briefcase,
  construction: HardHat,
}

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'policy', name: 'Policies' },
  { id: 'procedure', name: 'Procedures' },
  { id: 'form', name: 'Forms' },
  { id: 'plan', name: 'Plans' },
  { id: 'register', name: 'Registers' },
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

// Template content for generation
const TEMPLATE_CONTENT: Record<string, string> = {
  'ndis-1': `PARTICIPANT RIGHTS POLICY

1. PURPOSE
This policy ensures all participants understand their rights and how to exercise them when receiving supports from [Organization Name].

2. SCOPE
This policy applies to all staff, contractors, and volunteers who deliver supports to NDIS participants.

3. POLICY STATEMENT
[Organization Name] is committed to upholding the rights of all participants as outlined in the NDIS Practice Standards and the UN Convention on the Rights of Persons with Disabilities.

4. PARTICIPANT RIGHTS
All participants have the right to:
- Be treated with dignity and respect
- Make their own decisions and exercise choice and control
- Access information in a format they can understand
- Privacy and confidentiality
- Be free from abuse, neglect, violence, and exploitation
- Raise concerns and make complaints without fear of retribution
- Access an advocate of their choice

5. RESPONSIBILITIES
5.1 Management will:
- Ensure all staff are trained in participant rights
- Maintain systems to protect participant rights
- Respond appropriately to rights violations

5.2 Staff will:
- Treat all participants with dignity and respect
- Support participants to exercise their rights
- Report any concerns about rights violations

6. RELATED DOCUMENTS
- Complaints Handling Policy
- Privacy Policy
- Code of Conduct

7. REVIEW
This policy will be reviewed annually or when there are changes to legislation or standards.

Document Control:
Version: 1.0
Effective Date: [Date]
Review Date: [Date + 1 year]
Approved By: [Name/Position]`,

  'ndis-2': `INCIDENT MANAGEMENT PROCEDURE

1. PURPOSE
To provide a systematic approach to identifying, reporting, managing, and learning from incidents and near-misses.

2. SCOPE
This procedure applies to all incidents involving participants, staff, visitors, or property.

3. DEFINITIONS
Incident: Any event that causes or has the potential to cause harm.
Near-miss: An event that could have resulted in harm but did not.
Reportable Incident: Incidents that must be reported to the NDIS Commission.

4. PROCEDURE

4.1 Immediate Response
- Ensure safety of all persons involved
- Provide first aid or emergency assistance as required
- Secure the area if necessary
- Contact emergency services if required (000)

4.2 Reporting
- Complete Incident Report Form within 24 hours
- Notify supervisor immediately for serious incidents
- Report to NDIS Commission within 24 hours for reportable incidents

4.3 Investigation
- Manager to commence investigation within 48 hours
- Gather statements from witnesses
- Review relevant documentation
- Identify root causes and contributing factors

4.4 Review and Close-out
- Implement corrective actions
- Monitor effectiveness of actions
- Close incident when all actions completed
- Share learnings with relevant staff

5. REPORTABLE INCIDENTS (NDIS Commission)
- Death of a participant
- Serious injury requiring hospital treatment
- Abuse or neglect
- Unlawful sexual or physical contact
- Unauthorized use of restrictive practices

6. RECORDS
All incident records will be maintained for 7 years.

Document Control:
Version: 1.0
Effective Date: [Date]
Review Date: [Date + 1 year]`,
}

export default function PolicyGeneratorPage() {
  const { userSectors, primarySector, isLoading: sectorsLoading } = useSector()
  const searchParams = useSearchParams()
  
  const [view, setView] = useState<'templates' | 'generate' | 'result'>('templates')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)
  
  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [copied, setCopied] = useState(false)

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem('template-favorites')
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  // Check URL for template parameter
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      const template = TEMPLATES.find(t => t.id === templateId)
      if (template) {
        setSelectedTemplate(template)
        setView('generate')
      }
    }
  }, [searchParams])

  // Filter templates - show ALL templates when "All Sectors" selected, otherwise filter by user's sectors
  const filteredTemplates = TEMPLATES.filter(template => {
    // If specific sector selected, filter by that sector
    if (selectedSector !== 'all') {
      if (template.sector !== selectedSector) return false
    }
    // If "all" selected, show templates from user's sectors OR all if user has access to multiple
    else if (selectedSector === 'all' && userSectors.length > 0) {
      if (!userSectors.includes(template.sector)) return false
    }
    
    // Filter by category
    if (selectedCategory !== 'all' && template.category !== selectedCategory) return false
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return template.name.toLowerCase().includes(query) || template.description.toLowerCase().includes(query)
    }
    
    return true
  })

  const featuredTemplates = filteredTemplates.filter(t => t.featured).slice(0, 6)

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]
    setFavorites(newFavorites)
    localStorage.setItem('template-favorites', JSON.stringify(newFavorites))
  }

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
    setView('generate')
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    
    setGenerating(true)
    
    try {
      let content = TEMPLATE_CONTENT[selectedTemplate.id]
      
      if (content) {
        content = content.replace(/\[Organization Name\]/g, organizationName || '[Organization Name]')
        content = content.replace(/\[Date\]/g, new Date().toLocaleDateString())
        content = content.replace(/\[Date \+ 1 year\]/g, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString())
        setGeneratedContent(content)
      } else {
        // Generate with AI
        const response = await fetch('/api/generate-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: selectedTemplate.name,
            sector: selectedTemplate.sector,
            category: selectedTemplate.category,
            standard: selectedTemplate.standard,
            organizationName: organizationName || '[Organization Name]',
            customInstructions: customPrompt,
          })
        })

        if (response.ok) {
          const result = await response.json()
          setGeneratedContent(result.content)
        } else {
          setGeneratedContent(`# ${selectedTemplate.name}\n\n## 1. Purpose\n[AI generation unavailable - please add your content]\n\n## 2. Scope\n[Define the scope]\n\n## 3. Policy Statement\n[Add policy details]\n\n## 4. Responsibilities\n[Define responsibilities]\n\n## 5. Review\nThis document will be reviewed annually.`)
        }
      }
      
      setView('result')
    } catch (error) {
      console.error('Generation error:', error)
      setGeneratedContent(`# ${selectedTemplate.name}\n\n[Error generating content. Please try again.]`)
      setView('result')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate?.name.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    if (view === 'result') {
      setView('generate')
    } else if (view === 'generate') {
      setSelectedTemplate(null)
      setView('templates')
    }
  }

  const handleStartOver = () => {
    setSelectedTemplate(null)
    setGeneratedContent('')
    setCustomPrompt('')
    setView('templates')
  }

  const getSectorInfo = (sectorId: string) => ALL_SECTORS.find(s => s.id === sectorId)

  // Get available sectors for filter dropdown - show user's sectors
  const availableSectorsForFilter = userSectors.length > 0 
    ? ALL_SECTORS.filter(s => userSectors.includes(s.id))
    : ALL_SECTORS

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
          {view !== 'templates' && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-kwooka-ochre" />
              AI Policy Generator
            </h1>
            <p className="text-muted-foreground">
              {view === 'templates' && 'Choose a template or create from scratch'}
              {view === 'generate' && `Customize: ${selectedTemplate?.name}`}
              {view === 'result' && 'Your generated document'}
            </p>
          </div>
        </div>
        {view === 'result' && (
          <Button variant="outline" onClick={handleStartOver}>
            Start Over
          </Button>
        )}
      </div>

      {/* Templates View */}
      {view === 'templates' && (
        <>
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
                >
                  <option value="all">All Sectors ({filteredTemplates.length})</option>
                  {availableSectorsForFilter.map(sector => {
                    const count = TEMPLATES.filter(t => t.sector === sector.id && userSectors.includes(t.sector)).length
                    return (
                      <option key={sector.id} value={sector.id}>
                        {sector.name} ({count})
                      </option>
                    )
                  })}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Sector Pills - Show all user sectors */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setSelectedSector('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-2',
                    selectedSector === 'all'
                      ? 'bg-kwooka-ochre text-white'
                      : 'bg-slate-100 hover:bg-slate-200'
                  )}
                >
                  All Sectors
                </button>
                {availableSectorsForFilter.map(sector => {
                  const SectorIcon = SECTOR_ICONS[sector.id]
                  return (
                    <button
                      key={sector.id}
                      onClick={() => setSelectedSector(sector.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-2',
                        selectedSector === sector.id
                          ? 'bg-kwooka-ochre text-white'
                          : 'bg-slate-100 hover:bg-slate-200'
                      )}
                    >
                      <SectorIcon className="h-3.5 w-3.5" />
                      {sector.name}
                    </button>
                  )
                })}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm transition-all',
                      selectedCategory === cat.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 hover:bg-slate-200'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Policy Card */}
          <Card className="bg-gradient-to-r from-kwooka-ochre/10 to-amber-500/10 border-kwooka-ochre/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-kwooka-ochre">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create Custom Policy</h3>
                    <p className="text-sm text-muted-foreground">Generate a custom policy using AI</p>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setSelectedTemplate({ id: 'custom', name: 'Custom Policy', sector: primarySector, category: 'policy' })
                    setView('generate')
                  }}
                  className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Templates */}
          {featuredTemplates.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Popular Templates
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isFavorite={favorites.includes(template.id)}
                    onToggleFavorite={() => toggleFavorite(template.id)}
                    onPreview={() => setPreviewTemplate(template)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {searchQuery || selectedCategory !== 'all' || selectedSector !== 'all' ? 'Results' : 'All Templates'}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredTemplates.length})
              </span>
            </h2>
            {filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isFavorite={favorites.includes(template.id)}
                    onToggleFavorite={() => toggleFavorite(template.id)}
                    onPreview={() => setPreviewTemplate(template)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium">No templates found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Manage Sectors Link */}
          {userSectors.length < 6 && (
            <Card className="bg-slate-50">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Want to see templates from other sectors?{' '}
                  <a href="/dashboard/settings/sectors" className="text-kwooka-ochre hover:underline font-medium">
                    Manage your sectors →
                  </a>
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Generate View */}
      {view === 'generate' && selectedTemplate && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={cn('p-3 rounded-xl', getSectorInfo(selectedTemplate.sector)?.color || 'bg-slate-500')}>
                    {React.createElement(SECTOR_ICONS[selectedTemplate.sector] || FileText, { className: 'h-6 w-6 text-white' })}
                  </div>
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getSectorInfo(selectedTemplate.sector)?.name}</Badge>
                  <Badge variant="secondary" className="capitalize">{selectedTemplate.category}</Badge>
                  {selectedTemplate.standard && <Badge variant="outline">{selectedTemplate.standard}</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customize</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter your organization name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-prompt">Additional Instructions (Optional)</Label>
                  <textarea
                    id="custom-prompt"
                    placeholder="Any specific requirements or customizations..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">What You'll Get</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Compliant with {selectedTemplate.standard || 'relevant standards'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Ready-to-use document structure</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Customized with your organization details</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Professional formatting</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Download as text or copy to clipboard</span>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full mt-6 bg-kwooka-ochre hover:bg-kwooka-ochre/90 h-12"
                >
                  {generating ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="h-5 w-5 mr-2" />Generate Document</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Result View */}
      {view === 'result' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Document Generated Successfully!</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedTemplate?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {generatedContent}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-kwooka-ochre/10 to-amber-500/10 border-kwooka-ochre/20">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">Next Steps</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review and customize the content for your organization</li>
                <li>• Add specific procedures and contact details</li>
                <li>• Have the document reviewed by relevant stakeholders</li>
                <li>• Upload to Documents for AI compliance analysis</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('p-3 rounded-xl', getSectorInfo(previewTemplate.sector)?.color)}>
                    {React.createElement(SECTOR_ICONS[previewTemplate.sector] || FileText, { className: 'h-5 w-5 text-white' })}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{previewTemplate.name}</CardTitle>
                    <CardDescription>{previewTemplate.description}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{getSectorInfo(previewTemplate.sector)?.name}</Badge>
                <Badge variant="secondary" className="capitalize">{previewTemplate.category}</Badge>
                <Badge variant="outline">{previewTemplate.standard}</Badge>
              </div>
              
              <div className="flex items-center gap-6 py-4 border-y">
                <div className="text-center">
                  <div className="text-xl font-bold">{previewTemplate.downloads.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Downloads</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-current" />
                    {previewTemplate.rating}
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setPreviewTemplate(null)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-kwooka-ochre hover:bg-kwooka-ochre/90" 
                  onClick={() => { setPreviewTemplate(null); handleSelectTemplate(previewTemplate) }}
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Template Card Component
function TemplateCard({ template, isFavorite, onToggleFavorite, onPreview, onSelect }: any) {
  const sectorInfo = ALL_SECTORS.find(s => s.id === template.sector)
  const SectorIcon = SECTOR_ICONS[template.sector] || FileText

  return (
    <Card className="group hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-lg', sectorInfo?.color || 'bg-slate-500')}>
            <SectorIcon className="h-4 w-4 text-white" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite() }} className="p-1 hover:bg-slate-100 rounded">
            {isFavorite ? (
              <Star className="h-4 w-4 text-amber-500 fill-current" />
            ) : (
              <StarOff className="h-4 w-4 text-slate-300 group-hover:text-slate-400" />
            )}
          </button>
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{template.name}</h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className="text-xs">{sectorInfo?.name}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{template.category}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />{template.downloads.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" />{template.rating}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onPreview}>
            <Eye className="h-3 w-3 mr-1" />Preview
          </Button>
          <Button size="sm" className="flex-1 bg-kwooka-ochre hover:bg-kwooka-ochre/90" onClick={onSelect}>
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
