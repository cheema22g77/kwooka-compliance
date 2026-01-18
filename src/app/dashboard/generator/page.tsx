'use client'

import React, { useState, useEffect } from 'react'
import {
  Wand2, FileText, Search, Loader2, Download, Copy, CheckCircle2,
  Shield, Truck, Heart, Home, Briefcase, HardHat, Star,
  ChevronRight, ChevronLeft, Sparkles, Eye, X, FileDown,
  Clock, Zap, Building2, Check, ArrowRight, Package, FolderDown,
  FileCheck, AlertCircle, RotateCcw, Pause, Play
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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

// Compliance Packs - Full document sets for each sector
const COMPLIANCE_PACKS: Record<string, {
  name: string
  description: string
  documents: Array<{
    id: string
    name: string
    category: string
    standard: string
    essential: boolean
  }>
}> = {
  ndis: {
    name: 'NDIS Provider Starter Pack',
    description: 'Complete compliance document set for NDIS registration and ongoing compliance',
    documents: [
      // Core Policies
      { id: 'ndis-pack-1', name: 'Participant Rights & Responsibilities Policy', category: 'policy', standard: 'Practice Standard 1', essential: true },
      { id: 'ndis-pack-2', name: 'Privacy & Confidentiality Policy', category: 'policy', standard: 'Practice Standard 1', essential: true },
      { id: 'ndis-pack-3', name: 'Complaints & Feedback Policy', category: 'policy', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-4', name: 'Incident Management Policy', category: 'policy', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-5', name: 'Risk Management Policy', category: 'policy', standard: 'Practice Standard 4', essential: true },
      { id: 'ndis-pack-6', name: 'Governance & Operational Management Policy', category: 'policy', standard: 'Practice Standard 2', essential: true },
      { id: 'ndis-pack-7', name: 'Work Health & Safety Policy', category: 'policy', standard: 'Practice Standard 3', essential: true },
      { id: 'ndis-pack-8', name: 'Code of Conduct', category: 'policy', standard: 'Practice Standard 2', essential: true },
      { id: 'ndis-pack-9', name: 'Conflict of Interest Policy', category: 'policy', standard: 'Practice Standard 2', essential: false },
      { id: 'ndis-pack-10', name: 'Human Resources Policy', category: 'policy', standard: 'Practice Standard 2', essential: false },
      // Procedures
      { id: 'ndis-pack-11', name: 'Incident Reporting Procedure', category: 'procedure', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-12', name: 'Complaints Handling Procedure', category: 'procedure', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-13', name: 'Medication Management Procedure', category: 'procedure', standard: 'Practice Standard 3', essential: true },
      { id: 'ndis-pack-14', name: 'Manual Handling Procedure', category: 'procedure', standard: 'Practice Standard 3', essential: false },
      { id: 'ndis-pack-15', name: 'Emergency Response Procedure', category: 'procedure', standard: 'Practice Standard 4', essential: true },
      { id: 'ndis-pack-16', name: 'Worker Screening Procedure', category: 'procedure', standard: 'Practice Standard 2', essential: true },
      { id: 'ndis-pack-17', name: 'Abuse & Neglect Response Procedure', category: 'procedure', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-18', name: 'Continuity of Supports Procedure', category: 'procedure', standard: 'Practice Standard 2', essential: false },
      // Forms
      { id: 'ndis-pack-19', name: 'Service Agreement Template', category: 'form', standard: 'Practice Standard 1', essential: true },
      { id: 'ndis-pack-20', name: 'Participant Risk Assessment Form', category: 'form', standard: 'Practice Standard 4', essential: true },
      { id: 'ndis-pack-21', name: 'Incident Report Form', category: 'form', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-22', name: 'Consent Form', category: 'form', standard: 'Practice Standard 1', essential: true },
      { id: 'ndis-pack-23', name: 'Feedback & Complaints Form', category: 'form', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-24', name: 'Support Plan Template', category: 'form', standard: 'Practice Standard 1', essential: true },
      { id: 'ndis-pack-25', name: 'Progress Notes Template', category: 'form', standard: 'Practice Standard 1', essential: false },
      // Registers
      { id: 'ndis-pack-26', name: 'Worker Screening Register', category: 'register', standard: 'Practice Standard 2', essential: true },
      { id: 'ndis-pack-27', name: 'Incident Register', category: 'register', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-28', name: 'Complaints Register', category: 'register', standard: 'Practice Standard 6', essential: true },
      { id: 'ndis-pack-29', name: 'Training Register', category: 'register', standard: 'Practice Standard 2', essential: false },
      // Plans
      { id: 'ndis-pack-30', name: 'Business Continuity Plan', category: 'plan', standard: 'Practice Standard 2', essential: false },
      { id: 'ndis-pack-31', name: 'Quality Improvement Plan', category: 'plan', standard: 'Practice Standard 2', essential: false },
    ]
  },
  transport: {
    name: 'Transport & Logistics Compliance Pack',
    description: 'HVNL and Chain of Responsibility compliance documents',
    documents: [
      { id: 'transport-pack-1', name: 'Fatigue Management Policy', category: 'policy', standard: 'HVNL Section 228', essential: true },
      { id: 'transport-pack-2', name: 'Chain of Responsibility Policy', category: 'policy', standard: 'HVNL Part 2', essential: true },
      { id: 'transport-pack-3', name: 'Speed Compliance Policy', category: 'policy', standard: 'HVNL Section 228A', essential: true },
      { id: 'transport-pack-4', name: 'Mass & Dimension Compliance Policy', category: 'policy', standard: 'HVNL Part 4', essential: true },
      { id: 'transport-pack-5', name: 'Vehicle Maintenance Policy', category: 'policy', standard: 'HVNL Section 49', essential: true },
      { id: 'transport-pack-6', name: 'Load Restraint Policy', category: 'policy', standard: 'HVNL Part 4', essential: true },
      { id: 'transport-pack-7', name: 'Driver Fatigue Procedure', category: 'procedure', standard: 'HVNL Section 228', essential: true },
      { id: 'transport-pack-8', name: 'Pre-Trip Inspection Procedure', category: 'procedure', standard: 'HVNL Section 49', essential: true },
      { id: 'transport-pack-9', name: 'Incident Reporting Procedure', category: 'procedure', standard: 'HVNL', essential: true },
      { id: 'transport-pack-10', name: 'Driver Daily Checklist', category: 'form', standard: 'HVNL Section 49', essential: true },
      { id: 'transport-pack-11', name: 'Fatigue Declaration Form', category: 'form', standard: 'HVNL Section 228', essential: true },
      { id: 'transport-pack-12', name: 'Vehicle Defect Report', category: 'form', standard: 'HVNL Section 49', essential: true },
      { id: 'transport-pack-13', name: 'Mass Management Register', category: 'register', standard: 'HVNL Part 4', essential: true },
      { id: 'transport-pack-14', name: 'Driver Work Diary', category: 'register', standard: 'HVNL Section 228', essential: true },
    ]
  },
  healthcare: {
    name: 'Healthcare Compliance Pack',
    description: 'NSQHS Standards compliance documents for healthcare providers',
    documents: [
      { id: 'healthcare-pack-1', name: 'Clinical Governance Policy', category: 'policy', standard: 'NSQHS Standard 1', essential: true },
      { id: 'healthcare-pack-2', name: 'Partnering with Consumers Policy', category: 'policy', standard: 'NSQHS Standard 2', essential: true },
      { id: 'healthcare-pack-3', name: 'Infection Prevention & Control Policy', category: 'policy', standard: 'NSQHS Standard 3', essential: true },
      { id: 'healthcare-pack-4', name: 'Medication Safety Policy', category: 'policy', standard: 'NSQHS Standard 4', essential: true },
      { id: 'healthcare-pack-5', name: 'Patient Identification Policy', category: 'policy', standard: 'NSQHS Standard 5', essential: true },
      { id: 'healthcare-pack-6', name: 'Clinical Handover Policy', category: 'policy', standard: 'NSQHS Standard 6', essential: true },
      { id: 'healthcare-pack-7', name: 'Blood Management Policy', category: 'policy', standard: 'NSQHS Standard 7', essential: true },
      { id: 'healthcare-pack-8', name: 'Pressure Injury Prevention Policy', category: 'policy', standard: 'NSQHS Standard 8', essential: true },
      { id: 'healthcare-pack-9', name: 'Hand Hygiene Procedure', category: 'procedure', standard: 'NSQHS Standard 3', essential: true },
      { id: 'healthcare-pack-10', name: 'Medication Administration Procedure', category: 'procedure', standard: 'NSQHS Standard 4', essential: true },
      { id: 'healthcare-pack-11', name: 'Patient Identification Checklist', category: 'form', standard: 'NSQHS Standard 5', essential: true },
      { id: 'healthcare-pack-12', name: 'Clinical Handover Form', category: 'form', standard: 'NSQHS Standard 6', essential: true },
      { id: 'healthcare-pack-13', name: 'Medication Error Report', category: 'form', standard: 'NSQHS Standard 4', essential: true },
      { id: 'healthcare-pack-14', name: 'Incident Register', category: 'register', standard: 'NSQHS Standard 1', essential: true },
      { id: 'healthcare-pack-15', name: 'Quality Improvement Plan', category: 'plan', standard: 'NSQHS Standard 1', essential: true },
    ]
  },
  aged_care: {
    name: 'Aged Care Quality Standards Pack',
    description: 'Complete document set for Aged Care Quality Standards compliance',
    documents: [
      { id: 'aged-care-pack-1', name: 'Consumer Dignity & Choice Policy', category: 'policy', standard: 'Quality Standard 1', essential: true },
      { id: 'aged-care-pack-2', name: 'Ongoing Assessment & Planning Policy', category: 'policy', standard: 'Quality Standard 2', essential: true },
      { id: 'aged-care-pack-3', name: 'Personal & Clinical Care Policy', category: 'policy', standard: 'Quality Standard 3', essential: true },
      { id: 'aged-care-pack-4', name: 'Services & Supports Policy', category: 'policy', standard: 'Quality Standard 4', essential: true },
      { id: 'aged-care-pack-5', name: 'Service Environment Policy', category: 'policy', standard: 'Quality Standard 5', essential: true },
      { id: 'aged-care-pack-6', name: 'Feedback & Complaints Policy', category: 'policy', standard: 'Quality Standard 6', essential: true },
      { id: 'aged-care-pack-7', name: 'Human Resources Policy', category: 'policy', standard: 'Quality Standard 7', essential: true },
      { id: 'aged-care-pack-8', name: 'Organisational Governance Policy', category: 'policy', standard: 'Quality Standard 8', essential: true },
      { id: 'aged-care-pack-9', name: 'Falls Prevention Procedure', category: 'procedure', standard: 'Quality Standard 3', essential: true },
      { id: 'aged-care-pack-10', name: 'Restraint Minimisation Procedure', category: 'procedure', standard: 'Quality Standard 3', essential: true },
      { id: 'aged-care-pack-11', name: 'Medication Management Procedure', category: 'procedure', standard: 'Quality Standard 3', essential: true },
      { id: 'aged-care-pack-12', name: 'Care Plan Template', category: 'form', standard: 'Quality Standard 2', essential: true },
      { id: 'aged-care-pack-13', name: 'Risk Assessment Form', category: 'form', standard: 'Quality Standard 3', essential: true },
      { id: 'aged-care-pack-14', name: 'Incident Report Form', category: 'form', standard: 'Quality Standard 8', essential: true },
    ]
  },
  workplace: {
    name: 'Workplace WHS Compliance Pack',
    description: 'Work Health & Safety compliance documents for all industries',
    documents: [
      { id: 'workplace-pack-1', name: 'WHS Policy', category: 'policy', standard: 'WHS Act Section 19', essential: true },
      { id: 'workplace-pack-2', name: 'Return to Work Policy', category: 'policy', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-3', name: 'Drug & Alcohol Policy', category: 'policy', standard: 'WHS Act', essential: false },
      { id: 'workplace-pack-4', name: 'Bullying & Harassment Policy', category: 'policy', standard: 'WHS Act', essential: true },
      { id: 'workplace-pack-5', name: 'Emergency Management Policy', category: 'policy', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-6', name: 'Hazard Identification Procedure', category: 'procedure', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-7', name: 'Risk Assessment Procedure', category: 'procedure', standard: 'WHS Regulations Part 3', essential: true },
      { id: 'workplace-pack-8', name: 'Incident Investigation Procedure', category: 'procedure', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-9', name: 'Emergency Evacuation Procedure', category: 'procedure', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-10', name: 'Risk Assessment Form', category: 'form', standard: 'WHS Regulations Part 3', essential: true },
      { id: 'workplace-pack-11', name: 'Incident Report Form', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-12', name: 'Hazard Report Form', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-13', name: 'Safety Inspection Checklist', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-14', name: 'Incident Register', category: 'register', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-15', name: 'Hazard Register', category: 'register', standard: 'WHS Regulations', essential: true },
      { id: 'workplace-pack-16', name: 'Training Register', category: 'register', standard: 'WHS Regulations', essential: true },
    ]
  },
  construction: {
    name: 'Construction Safety Pack',
    description: 'High-risk construction work compliance documents',
    documents: [
      { id: 'construction-pack-1', name: 'Construction WHS Policy', category: 'policy', standard: 'WHS Regulations Part 6', essential: true },
      { id: 'construction-pack-2', name: 'Principal Contractor Policy', category: 'policy', standard: 'WHS Regulations Part 6.3', essential: true },
      { id: 'construction-pack-3', name: 'Subcontractor Management Policy', category: 'policy', standard: 'WHS Regulations Part 6', essential: true },
      { id: 'construction-pack-4', name: 'Working at Heights Procedure', category: 'procedure', standard: 'WHS Regulations Part 4.4', essential: true },
      { id: 'construction-pack-5', name: 'Excavation Safety Procedure', category: 'procedure', standard: 'WHS Regulations Part 4.5', essential: true },
      { id: 'construction-pack-6', name: 'Confined Space Entry Procedure', category: 'procedure', standard: 'WHS Regulations Part 4.3', essential: true },
      { id: 'construction-pack-7', name: 'Hot Works Procedure', category: 'procedure', standard: 'WHS Regulations', essential: true },
      { id: 'construction-pack-8', name: 'Demolition Procedure', category: 'procedure', standard: 'WHS Regulations Part 6.5', essential: false },
      { id: 'construction-pack-9', name: 'Safe Work Method Statement (SWMS)', category: 'form', standard: 'WHS Regulations Part 6.3', essential: true },
      { id: 'construction-pack-10', name: 'Site Induction Checklist', category: 'form', standard: 'WHS Regulations Part 6', essential: true },
      { id: 'construction-pack-11', name: 'Toolbox Talk Record', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'construction-pack-12', name: 'Daily Pre-Start Checklist', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'construction-pack-13', name: 'Permit to Work Form', category: 'form', standard: 'WHS Regulations', essential: true },
      { id: 'construction-pack-14', name: 'WHS Management Plan', category: 'plan', standard: 'WHS Regulations Part 6.4', essential: true },
      { id: 'construction-pack-15', name: 'Site Safety Plan', category: 'plan', standard: 'WHS Regulations Part 6', essential: true },
    ]
  }
}

// Pre-built templates for single document generation
const TEMPLATES = [
  // NDIS Templates
  { id: 'ndis-1', name: 'Participant Rights Policy', description: 'Policy ensuring participants understand their rights under the NDIS.', sector: 'ndis', category: 'policy', standard: 'Practice Standard 1', downloads: 1250, rating: 4.8, featured: true },
  { id: 'ndis-2', name: 'Incident Management Procedure', description: 'Procedure for reporting and managing incidents and near-misses.', sector: 'ndis', category: 'procedure', standard: 'Practice Standard 6', downloads: 980, rating: 4.7, featured: true },
  { id: 'ndis-3', name: 'Complaints Handling Policy', description: 'Policy for receiving and resolving participant complaints.', sector: 'ndis', category: 'policy', standard: 'Practice Standard 6', downloads: 850, rating: 4.6, featured: false },
  { id: 'ndis-4', name: 'Risk Assessment Form', description: 'Form for conducting participant risk assessments.', sector: 'ndis', category: 'form', standard: 'Practice Standard 4', downloads: 1100, rating: 4.9, featured: true },
  { id: 'ndis-5', name: 'Service Agreement Template', description: 'Service agreement covering all NDIS requirements.', sector: 'ndis', category: 'form', standard: 'Practice Standard 1', downloads: 2100, rating: 4.8, featured: true },
  
  // Transport Templates
  { id: 'transport-1', name: 'Fatigue Management Policy', description: 'Fatigue management policy compliant with HVNL.', sector: 'transport', category: 'policy', standard: 'HVNL Section 228', downloads: 890, rating: 4.7, featured: true },
  { id: 'transport-2', name: 'Chain of Responsibility Procedure', description: 'CoR compliance procedure for transport chain.', sector: 'transport', category: 'procedure', standard: 'HVNL Part 2', downloads: 760, rating: 4.6, featured: true },
  { id: 'transport-3', name: 'Driver Daily Checklist', description: 'Pre-trip inspection checklist for drivers.', sector: 'transport', category: 'form', standard: 'HVNL Section 49', downloads: 1450, rating: 4.9, featured: true },
  
  // Healthcare Templates
  { id: 'healthcare-1', name: 'Clinical Governance Policy', description: 'Clinical governance and quality improvement framework.', sector: 'healthcare', category: 'policy', standard: 'NSQHS Standard 1', downloads: 920, rating: 4.8, featured: true },
  { id: 'healthcare-2', name: 'Hand Hygiene Procedure', description: 'Hand hygiene procedure aligned with WHO guidelines.', sector: 'healthcare', category: 'procedure', standard: 'NSQHS Standard 3', downloads: 1680, rating: 4.9, featured: true },
  
  // Aged Care Templates
  { id: 'aged-care-1', name: 'Dignity of Risk Policy', description: 'Policy supporting resident choice and risk management.', sector: 'aged_care', category: 'policy', standard: 'Quality Standard 1', downloads: 720, rating: 4.7, featured: true },
  { id: 'aged-care-2', name: 'Falls Prevention Procedure', description: 'Falls prevention and post-fall management.', sector: 'aged_care', category: 'procedure', standard: 'Quality Standard 3', downloads: 980, rating: 4.8, featured: true },
  
  // Workplace Templates
  { id: 'workplace-1', name: 'WHS Policy', description: 'Workplace health and safety policy.', sector: 'workplace', category: 'policy', standard: 'WHS Act Section 19', downloads: 2450, rating: 4.8, featured: true },
  { id: 'workplace-2', name: 'Hazard Reporting Procedure', description: 'Procedure for reporting workplace hazards.', sector: 'workplace', category: 'procedure', standard: 'WHS Regulations', downloads: 1890, rating: 4.7, featured: true },
  
  // Construction Templates
  { id: 'construction-1', name: 'Safe Work Method Statement', description: 'SWMS for high-risk construction work.', sector: 'construction', category: 'form', standard: 'WHS Regulations Part 6', downloads: 3200, rating: 4.9, featured: true },
  { id: 'construction-2', name: 'Site Induction Checklist', description: 'Site induction checklist for WHS.', sector: 'construction', category: 'form', standard: 'WHS Regulations', downloads: 2800, rating: 4.8, featured: true },
]

const STEPS = [
  { id: 1, name: 'Choose', description: 'Template or Pack' },
  { id: 2, name: 'Customize', description: 'Add details' },
  { id: 3, name: 'Generate', description: 'AI creates docs' },
  { id: 4, name: 'Download', description: 'Export files' },
]

type ViewMode = 'single' | 'pack' | 'custom'
type GenerationStatus = 'pending' | 'generating' | 'completed' | 'error'

interface GeneratedDocument {
  id: string
  name: string
  category: string
  standard: string
  status: GenerationStatus
  content?: string
  sections?: Array<{ title: string; content: string }>
}

interface OrganizationDetails {
  name: string
  abn: string
  authorisedBy: string
  authorisedPosition: string
}

export default function PolicyGeneratorPage() {
  const { userSectors, primarySector, isLoading: sectorsLoading } = useSector()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  
  // Organization details
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails>({
    name: '',
    abn: '',
    authorisedBy: '',
    authorisedPosition: ''
  })
  const [customPrompt, setCustomPrompt] = useState('')
  
  // Single doc generation state
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedSections, setGeneratedSections] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  
  // Bulk generation state
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkPaused, setBulkPaused] = useState(false)
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(0)
  const [downloadingZip, setDownloadingZip] = useState(false)
  
  // Custom document state
  const [customDocName, setCustomDocName] = useState('')
  const [customDocSector, setCustomDocSector] = useState('')
  const [customDocCategory, setCustomDocCategory] = useState('policy')

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

  // Get available packs based on user's sectors
  const availablePacks = Object.entries(COMPLIANCE_PACKS).filter(([sectorId]) => 
    userSectors.length === 0 || userSectors.includes(sectorId)
  )

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
    setViewMode('single')
    setCurrentStep(2)
  }

  const handleSelectPack = (sectorId: string) => {
    setSelectedPack(sectorId)
    setViewMode('pack')
    // Select all essential documents by default
    const pack = COMPLIANCE_PACKS[sectorId]
    const essentialIds = pack.documents.filter(d => d.essential).map(d => d.id)
    setSelectedDocuments(essentialIds)
    setCurrentStep(2)
  }

  const handleSelectCustom = () => {
    setViewMode('custom')
    setCustomDocSector(primarySector || '')
    setCustomDocCategory('policy')
    setCustomDocName('')
    setCurrentStep(2)
  }

  const handleGenerateCustom = () => {
    if (!customDocName || !customDocSector || !customDocCategory) return
    
    const sectorInfo = getSectorInfo(customDocSector)
    setSelectedTemplate({
      id: 'custom',
      name: customDocName,
      description: `Custom ${customDocCategory} for ${sectorInfo?.name}`,
      sector: customDocSector,
      category: customDocCategory,
      standard: `${sectorInfo?.name} Compliance`
    })
    setViewMode('single')
    handleGenerateSingle()
  }

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const selectAllDocuments = () => {
    if (selectedPack) {
      const allIds = COMPLIANCE_PACKS[selectedPack].documents.map(d => d.id)
      setSelectedDocuments(allIds)
    }
  }

  const selectEssentialOnly = () => {
    if (selectedPack) {
      const essentialIds = COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.essential).map(d => d.id)
      setSelectedDocuments(essentialIds)
    }
  }

  const isFormValid = () => {
    return orgDetails.name.trim() !== '' && orgDetails.authorisedBy.trim() !== ''
  }

  // Generate single document
  const handleGenerateSingle = async () => {
    if (!selectedTemplate || !isFormValid()) return
    
    setCurrentStep(3)
    setGenerating(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const today = new Date().toLocaleDateString('en-AU')
      const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')
      
      const sections = generateDocumentSections(selectedTemplate, orgDetails, today, reviewDate, customPrompt)
      
      setGeneratedSections(sections)
      setGeneratedContent(sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n'))
      setCurrentStep(4)
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  // Generate bulk documents
  const handleGenerateBulk = async () => {
    if (!selectedPack || selectedDocuments.length === 0 || !isFormValid()) return
    
    setCurrentStep(3)
    setBulkGenerating(true)
    setBulkPaused(false)
    
    const pack = COMPLIANCE_PACKS[selectedPack]
    const docsToGenerate = pack.documents.filter(d => selectedDocuments.includes(d.id))
    
    // Initialize all documents as pending
    setGeneratedDocuments(docsToGenerate.map(doc => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      standard: doc.standard,
      status: 'pending' as GenerationStatus
    })))
    
    const today = new Date().toLocaleDateString('en-AU')
    const reviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')
    
    // Generate documents one by one
    for (let i = 0; i < docsToGenerate.length; i++) {
      // Check if paused
      if (bulkPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!bulkPaused) {
              clearInterval(checkPause)
              resolve(true)
            }
          }, 100)
        })
      }
      
      setCurrentGeneratingIndex(i)
      
      // Update status to generating
      setGeneratedDocuments(prev => prev.map((doc, idx) => 
        idx === i ? { ...doc, status: 'generating' } : doc
      ))
      
      try {
        // Simulate generation time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
        
        const template = {
          name: docsToGenerate[i].name,
          category: docsToGenerate[i].category,
          standard: docsToGenerate[i].standard,
          sector: selectedPack
        }
        
        const sections = generateDocumentSections(template, orgDetails, today, reviewDate, '')
        
        // Update status to completed
        setGeneratedDocuments(prev => prev.map((doc, idx) => 
          idx === i ? { ...doc, status: 'completed', sections } : doc
        ))
      } catch (error) {
        // Update status to error
        setGeneratedDocuments(prev => prev.map((doc, idx) => 
          idx === i ? { ...doc, status: 'error' } : doc
        ))
      }
    }
    
    setBulkGenerating(false)
    setCurrentStep(4)
  }

  const handlePauseBulk = () => {
    setBulkPaused(!bulkPaused)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSinglePdf = async () => {
    setDownloadingPdf(true)
    try {
      const textContent = generateTextFile(selectedTemplate.name, orgDetails, generatedSections)
      downloadFile(textContent, `${selectedTemplate.name.replace(/\s+/g, '_')}.txt`, 'text/plain')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadAllZip = async () => {
    setDownloadingZip(true)
    try {
      // Generate all files and create a combined download
      const completedDocs = generatedDocuments.filter(d => d.status === 'completed')
      
      // For now, download as a combined text file
      // In production, use JSZip library for actual ZIP creation
      let combinedContent = `COMPLIANCE DOCUMENT PACK
${'═'.repeat(60)}
Organization: ${orgDetails.name}
ABN: ${orgDetails.abn || 'Not provided'}
Authorised By: ${orgDetails.authorisedBy}${orgDetails.authorisedPosition ? `, ${orgDetails.authorisedPosition}` : ''}
Sector: ${getSectorInfo(selectedPack!)?.name}
Generated: ${new Date().toLocaleDateString('en-AU')}
Total Documents: ${completedDocs.length}

${'═'.repeat(60)}

`
      
      completedDocs.forEach((doc, index) => {
        combinedContent += `
${'═'.repeat(60)}
DOCUMENT ${index + 1}: ${doc.name.toUpperCase()}
${'═'.repeat(60)}
Category: ${doc.category}
Standard: ${doc.standard}
${'─'.repeat(60)}

`
        if (doc.sections) {
          doc.sections.forEach(section => {
            combinedContent += `${section.title}\n${'─'.repeat(40)}\n${section.content}\n\n`
          })
        }
        combinedContent += '\n'
      })
      
      downloadFile(combinedContent, `${getSectorInfo(selectedPack!)?.name}_Compliance_Pack.txt`, 'text/plain')
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadSingleDoc = (doc: GeneratedDocument) => {
    if (doc.sections) {
      const content = generateTextFile(doc.name, orgDetails, doc.sections)
      downloadFile(content, `${doc.name.replace(/\s+/g, '_')}.txt`, 'text/plain')
    }
  }

  const handleStartOver = () => {
    setSelectedTemplate(null)
    setSelectedPack(null)
    setSelectedDocuments([])
    setGeneratedContent('')
    setGeneratedSections([])
    setGeneratedDocuments([])
    setCustomPrompt('')
    setOrgDetails({ name: '', abn: '', authorisedBy: '', authorisedPosition: '' })
    setCustomDocName('')
    setCustomDocSector('')
    setCustomDocCategory('policy')
    setCurrentStep(1)
    setViewMode('single')
  }

  if (sectorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-kwooka-ochre" />
      </div>
    )
  }

  const completedCount = generatedDocuments.filter(d => d.status === 'completed').length
  const totalCount = generatedDocuments.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-kwooka-ochre to-amber-600 rounded-2xl mb-4">
          <Wand2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">AI Policy Generator</h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
          Create professional compliance documents in minutes. Generate single documents or complete compliance packs.
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
                    'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-medium transition-all',
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-kwooka-ochre text-white ring-4 ring-kwooka-ochre/20'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : step.id}
                </div>
                <span className={cn(
                  'text-[10px] md:text-xs mt-2 font-medium hidden sm:block text-center',
                  currentStep >= step.id ? 'text-slate-900' : 'text-slate-400'
                )}>
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 md:w-16 lg:w-24 h-1 mx-1 md:mx-2 rounded-full transition-all',
                    currentStep > step.id ? 'bg-green-500' : 'bg-slate-100'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Choose Template or Pack */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Compliance Packs Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-kwooka-ochre" />
              <h2 className="text-lg font-semibold">Compliance Packs</h2>
              <Badge variant="secondary" className="ml-2">Recommended</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate all essential compliance documents for your sector at once
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availablePacks.map(([sectorId, pack]) => {
                const sectorInfo = getSectorInfo(sectorId)
                const SectorIcon = SECTOR_ICONS[sectorId] || Shield
                const essentialCount = pack.documents.filter(d => d.essential).length
                
                return (
                  <Card 
                    key={sectorId}
                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-kwooka-ochre group overflow-hidden"
                    onClick={() => handleSelectPack(sectorId)}
                  >
                    <div className={cn('h-2', sectorInfo?.color || 'bg-slate-500')} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={cn('p-3 rounded-xl', sectorInfo?.color || 'bg-slate-500')}>
                          <SectorIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold group-hover:text-kwooka-ochre transition-colors">
                            {pack.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pack.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            {pack.documents.length} docs
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <FileCheck className="h-4 w-4" />
                            {essentialCount} essential
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-kwooka-ochre transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-50 text-muted-foreground">or choose a single template</span>
            </div>
          </div>

          {/* Single Templates Section */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-kwooka-ochre group"
              onClick={handleSelectCustom}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-kwooka-ochre to-amber-600 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Create Custom Document</h3>
                    <p className="text-sm text-muted-foreground">
                      Use AI to generate a completely custom policy, procedure, or form
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-kwooka-ochre transition-colors hidden sm:block" />
                </div>
              </CardContent>
            </Card>

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                  
                  {/* Sector Pills */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSector('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        selectedSector === 'all'
                          ? 'bg-kwooka-ochre text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      )}
                    >
                      All
                    </button>
                    {availableSectors.map(sector => {
                      const SectorIcon = SECTOR_ICONS[sector.id]
                      return (
                        <button
                          key={sector.id}
                          onClick={() => setSelectedSector(sector.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                            selectedSector === sector.id
                              ? 'bg-kwooka-ochre text-white shadow-md'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          )}
                        >
                          <SectorIcon className="h-3.5 w-3.5" />
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
                          'px-3 py-1 rounded-full text-xs transition-all',
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

      {/* Step 2: Customize - Custom Document */}
      {currentStep === 2 && viewMode === 'custom' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-kwooka-ochre to-amber-600">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">Create Custom Document</CardTitle>
                    <CardDescription className="mt-1">
                      Generate a custom compliance document tailored to your needs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Details</CardTitle>
                <CardDescription>Select the type and sector for your document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Sector Selection - Dropdown */}
                <div>
                  <Label htmlFor="custom-sector" className="text-base">Sector *</Label>
                  <select
                    id="custom-sector"
                    value={customDocSector}
                    onChange={(e) => setCustomDocSector(e.target.value)}
                    className="w-full mt-2 h-12 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-kwooka-ochre cursor-pointer"
                  >
                    <option value="">Select a sector...</option>
                    {availableSectors.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the compliance sector this document applies to
                  </p>
                </div>

                {/* Document Type Selection - Dropdown */}
                <div>
                  <Label htmlFor="custom-doc-type" className="text-base">Document Type *</Label>
                  <select
                    id="custom-doc-type"
                    value={customDocCategory}
                    onChange={(e) => setCustomDocCategory(e.target.value)}
                    className="w-full mt-2 h-12 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-kwooka-ochre cursor-pointer"
                  >
                    <option value="policy">Policy - High-level guidelines and principles</option>
                    <option value="procedure">Procedure - Step-by-step instructions</option>
                    <option value="form">Form - Templates for data collection</option>
                    <option value="plan">Plan - Strategic or operational plans</option>
                    <option value="register">Register - Tracking and record keeping</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the type of document you want to create
                  </p>
                </div>

                {/* Document Name */}
                <div>
                  <Label htmlFor="custom-doc-name" className="text-base">Document Name *</Label>
                  <Input
                    id="custom-doc-name"
                    placeholder="e.g., Cultural Safety Policy, Infection Control Procedure"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    className="mt-2 h-12"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a descriptive name for your document
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Details</CardTitle>
                <CardDescription>These details will appear on all generated documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="org-name-custom" className="text-base">Organization Name *</Label>
                    <Input
                      id="org-name-custom"
                      placeholder="e.g., Kwooka Health Services Pty Ltd"
                      value={orgDetails.name}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="abn-custom" className="text-base">ABN / ACN</Label>
                    <Input
                      id="abn-custom"
                      placeholder="e.g., 12 345 678 901"
                      value={orgDetails.abn}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, abn: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="authorised-by-custom" className="text-base">Authorised By *</Label>
                    <Input
                      id="authorised-by-custom"
                      placeholder="e.g., John Smith"
                      value={orgDetails.authorisedBy}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedBy: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="authorised-position-custom" className="text-base">Position / Title</Label>
                    <Input
                      id="authorised-position-custom"
                      placeholder="e.g., CEO, Director"
                      value={orgDetails.authorisedPosition}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedPosition: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Label htmlFor="custom-prompt-custom" className="text-base">Additional Requirements</Label>
                  <textarea
                    id="custom-prompt-custom"
                    placeholder="Add any specific requirements, content to include, or customizations..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full mt-2 rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kwooka-ochre"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe any specific content, regulations, or requirements you want included
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6">
                  {customDocName ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Document Name</p>
                      <p className="font-semibold">{customDocName}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Enter document name above</div>
                  )}
                  
                  {customDocSector && (
                    <div>
                      <p className="text-xs text-muted-foreground">Sector</p>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(getSectorInfo(customDocSector)?.color, 'text-white')}>
                          {getSectorInfo(customDocSector)?.name}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Document Type</p>
                    <Badge variant="secondary" className="capitalize">{customDocCategory}</Badge>
                  </div>
                  
                  {orgDetails.name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Organization</p>
                      <p className="font-medium text-sm">{orgDetails.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>AI-generated content</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Professional structure</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Includes document control</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Download as PDF</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      if (!customDocName || !customDocSector || !customDocCategory || !isFormValid()) return
                      
                      const sectorInfo = getSectorInfo(customDocSector)
                      setSelectedTemplate({
                        id: 'custom',
                        name: customDocName,
                        description: `Custom ${customDocCategory} for ${sectorInfo?.name}`,
                        sector: customDocSector,
                        category: customDocCategory,
                        standard: `${sectorInfo?.name} Compliance`
                      })
                      setViewMode('single')
                      // Trigger generation after a tick
                      setTimeout(() => {
                        handleGenerateSingle()
                      }, 100)
                    }}
                    disabled={!customDocName || !customDocSector || !customDocCategory || !isFormValid()}
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
                    Back
                  </Button>
                </div>

                {(!customDocName || !customDocSector || !isFormValid()) && (
                  <div className="mt-3 space-y-1">
                    {!customDocName && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Enter a document name
                      </p>
                    )}
                    {!customDocSector && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Select a sector
                      </p>
                    )}
                    {!isFormValid() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Enter Organization Name and Authorised By
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Customize - Single Document */}
      {currentStep === 2 && viewMode === 'single' && selectedTemplate && (
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
                <CardDescription>These details will appear on all generated documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="org-name" className="text-base">Organization Name *</Label>
                    <Input
                      id="org-name"
                      placeholder="e.g., Kwooka Health Services Pty Ltd"
                      value={orgDetails.name}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="abn" className="text-base">ABN / ACN</Label>
                    <Input
                      id="abn"
                      placeholder="e.g., 12 345 678 901"
                      value={orgDetails.abn}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, abn: e.target.value }))}
                      className="mt-2 h-12"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Australian Business Number or Company Number
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="authorised-by" className="text-base">Authorised By *</Label>
                    <Input
                      id="authorised-by"
                      placeholder="e.g., John Smith"
                      value={orgDetails.authorisedBy}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedBy: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="authorised-position" className="text-base">Position / Title</Label>
                    <Input
                      id="authorised-position"
                      placeholder="e.g., CEO, Director"
                      value={orgDetails.authorisedPosition}
                      onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedPosition: e.target.value }))}
                      className="mt-2 h-12"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Label htmlFor="custom-prompt" className="text-base">Additional Requirements</Label>
                  <textarea
                    id="custom-prompt"
                    placeholder="Add any specific requirements or customizations..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full mt-2 rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kwooka-ochre"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Ready to Generate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm mb-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Compliant with {selectedTemplate.standard}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Professional structure</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Includes document control</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Download as PDF</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleGenerateSingle}
                    disabled={!isFormValid()}
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
                    Back
                  </Button>
                </div>

                {!isFormValid() && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-3">
                    <AlertCircle className="h-3 w-3" />
                    Please fill in Organization Name and Authorised By
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Customize - Compliance Pack */}
      {currentStep === 2 && viewMode === 'pack' && selectedPack && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn('p-3 rounded-xl', getSectorInfo(selectedPack)?.color || 'bg-slate-500')}>
                    {React.createElement(SECTOR_ICONS[selectedPack] || Shield, { className: 'h-6 w-6 text-white' })}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{COMPLIANCE_PACKS[selectedPack].name}</CardTitle>
                    <CardDescription className="mt-1">{COMPLIANCE_PACKS[selectedPack].description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectEssentialOnly}>
                    Essential Only ({COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.essential).length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectAllDocuments}>
                    Select All ({COMPLIANCE_PACKS[selectedPack].documents.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Organization Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organization Details
                  </CardTitle>
                  <CardDescription>These details will appear on all generated documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="org-name-pack" className="text-sm font-medium">Organization Name *</Label>
                      <Input
                        id="org-name-pack"
                        placeholder="e.g., Kwooka Health Services Pty Ltd"
                        value={orgDetails.name}
                        onChange={(e) => setOrgDetails(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <Label htmlFor="abn-pack" className="text-sm font-medium">ABN / ACN</Label>
                      <Input
                        id="abn-pack"
                        placeholder="e.g., 12 345 678 901"
                        value={orgDetails.abn}
                        onChange={(e) => setOrgDetails(prev => ({ ...prev, abn: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="authorised-by-pack" className="text-sm font-medium">Authorised By *</Label>
                      <Input
                        id="authorised-by-pack"
                        placeholder="e.g., John Smith"
                        value={orgDetails.authorisedBy}
                        onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedBy: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="authorised-position-pack" className="text-sm font-medium">Position / Title</Label>
                      <Input
                        id="authorised-position-pack"
                        placeholder="e.g., CEO, Director"
                        value={orgDetails.authorisedPosition}
                        onChange={(e) => setOrgDetails(prev => ({ ...prev, authorisedPosition: e.target.value }))}
                        className="mt-1.5 h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Selection by Category */}
              {['policy', 'procedure', 'form', 'register', 'plan'].map(category => {
                const categoryDocs = COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === category)
                if (categoryDocs.length === 0) return null
                
                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {category === 'policy' ? 'Policies' : 
                         category === 'procedure' ? 'Procedures' :
                         category === 'form' ? 'Forms' :
                         category === 'register' ? 'Registers' : 'Plans'}
                        <Badge variant="secondary" className="ml-2">{categoryDocs.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {categoryDocs.map(doc => (
                          <label 
                            key={doc.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                              selectedDocuments.includes(doc.id) 
                                ? 'bg-kwooka-ochre/10 border border-kwooka-ochre/30' 
                                : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(doc.id)}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="w-5 h-5 rounded border-slate-300 text-kwooka-ochre focus:ring-kwooka-ochre"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{doc.name}</span>
                                {doc.essential && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                                    Essential
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{doc.standard}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Generation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-kwooka-ochre mb-1">
                        {selectedDocuments.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        documents selected
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Policies</span>
                        <span className="font-medium">
                          {COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === 'policy' && selectedDocuments.includes(d.id)).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Procedures</span>
                        <span className="font-medium">
                          {COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === 'procedure' && selectedDocuments.includes(d.id)).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Forms</span>
                        <span className="font-medium">
                          {COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === 'form' && selectedDocuments.includes(d.id)).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registers</span>
                        <span className="font-medium">
                          {COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === 'register' && selectedDocuments.includes(d.id)).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plans</span>
                        <span className="font-medium">
                          {COMPLIANCE_PACKS[selectedPack].documents.filter(d => d.category === 'plan' && selectedDocuments.includes(d.id)).length}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <Button
                        onClick={handleGenerateBulk}
                        disabled={selectedDocuments.length === 0 || !isFormValid()}
                        className="w-full h-12 bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                      >
                        <Package className="h-5 w-5 mr-2" />
                        Generate {selectedDocuments.length} Documents
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="w-full"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    </div>

                    {!isFormValid() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Enter Organization Name and Authorised By
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Generating - Single */}
      {currentStep === 3 && viewMode === 'single' && generating && (
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
              Creating a professional {selectedTemplate?.category} for {orgDetails.name || 'your organization'}...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generating - Bulk */}
      {currentStep === 3 && viewMode === 'pack' && bulkGenerating && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generating Documents</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePauseBulk}>
                {bulkPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                {bulkPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{completedCount} of {totalCount} documents</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {generatedDocuments.map((doc, index) => (
                <div 
                  key={doc.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    doc.status === 'completed' ? 'bg-green-50' :
                    doc.status === 'generating' ? 'bg-kwooka-ochre/10' :
                    doc.status === 'error' ? 'bg-red-50' :
                    'bg-slate-50'
                  )}
                >
                  {doc.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                  {doc.status === 'generating' && <Loader2 className="h-5 w-5 text-kwooka-ochre animate-spin flex-shrink-0" />}
                  {doc.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                  {doc.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.category} • {doc.standard}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result - Single */}
      {currentStep === 4 && viewMode === 'single' && (
        <div className="space-y-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Document Generated!</p>
                    <p className="text-sm text-green-700">{selectedTemplate?.name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleDownloadSinglePdf}
                    disabled={downloadingPdf}
                    className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                  >
                    {downloadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>{selectedTemplate?.name}</CardTitle>
              <CardDescription>
                {orgDetails.name}{orgDetails.abn ? ` • ABN: ${orgDetails.abn}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
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

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleStartOver}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Another
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result - Bulk */}
      {currentStep === 4 && viewMode === 'pack' && (
        <div className="space-y-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">
                      {completedCount} Documents Generated!
                    </p>
                    <p className="text-sm text-green-700">
                      {orgDetails.name}{orgDetails.abn ? ` • ABN: ${orgDetails.abn}` : ''}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleDownloadAllZip}
                  disabled={downloadingZip}
                  className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                >
                  {downloadingZip ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderDown className="h-4 w-4 mr-2" />}
                  Download All Documents
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generatedDocuments.filter(d => d.status === 'completed').map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <FileCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{doc.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{doc.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{doc.standard}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleDownloadSingleDoc(doc)}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleStartOver}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button 
              onClick={handleDownloadAllZip}
              disabled={downloadingZip}
              className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
            >
              <FolderDown className="h-4 w-4 mr-2" />
              Download All as Pack
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to generate document sections
function generateDocumentSections(
  template: any, 
  orgDetails: OrganizationDetails,
  today: string, 
  reviewDate: string,
  customPrompt: string
): Array<{ title: string; content: string }> {
  const orgName = orgDetails.name || '[Organization Name]'
  const abn = orgDetails.abn ? `\nABN: ${orgDetails.abn}` : ''
  const authorised = orgDetails.authorisedBy 
    ? `${orgDetails.authorisedBy}${orgDetails.authorisedPosition ? `, ${orgDetails.authorisedPosition}` : ''}`
    : '[Authorised Person]'

  const sections = [
    {
      title: 'Document Control',
      content: `Document Title: ${template.name}
Version: 1.0
Effective Date: ${today}
Review Date: ${reviewDate}
Approved By: ${authorised}

Organization: ${orgName}${abn}`
    },
    {
      title: '1. Purpose',
      content: `This ${template.category} establishes the framework for ${template.name.toLowerCase()} at ${orgName}. It ensures compliance with ${template.standard} and provides clear guidance for all staff members.`
    },
    {
      title: '2. Scope',
      content: `This document applies to:
• All employees, contractors, and volunteers of ${orgName}
• All service delivery locations and activities
• All participants/clients receiving services
• Third-party providers working on behalf of ${orgName}`
    },
    {
      title: '3. Policy Statement',
      content: `${orgName} is committed to maintaining the highest standards of compliance and quality in all operations. We recognize our obligations under ${template.standard} and are dedicated to:

• Upholding the rights and dignity of all participants
• Providing safe and quality services
• Continuous improvement of our practices
• Transparent and accountable governance`
    },
    {
      title: '4. Responsibilities',
      content: `Management:
• Ensure adequate resources for implementation
• Monitor compliance and effectiveness
• Review and update this document annually

Staff:
• Understand and follow this ${template.category}
• Report any concerns or breaches
• Participate in relevant training

Compliance Officer:
• Oversee implementation
• Conduct regular audits
• Manage incident reporting`
    },
    {
      title: '5. Procedure',
      content: `5.1 Implementation
This ${template.category} will be implemented through:
1. Staff training and orientation
2. Regular communication and updates
3. Monitoring and reporting mechanisms

5.2 Compliance Monitoring
• Monthly internal reviews
• Quarterly compliance audits
• Annual external assessments

5.3 Incident Management
Any breaches must be reported within 24 hours to the Compliance Officer.`
    },
    {
      title: '6. Related Documents',
      content: `• Code of Conduct
• Risk Management Framework
• Incident Reporting Procedure
• Staff Training Policy
• ${template.standard} Guidelines`
    },
    {
      title: '7. Review',
      content: `This document will be reviewed:
• Annually from the effective date
• Following any significant incident
• When legislation or standards change
• At the request of management or regulatory bodies

Review History:
Version | Date | Author | Changes
1.0 | ${today} | ${authorised} | Initial release`
    },
    {
      title: '8. Authorisation',
      content: `This document has been reviewed and approved by:

Name: ${authorised}
Date: ${today}

Signature: _________________________

${orgName}${abn}`
    }
  ]

  if (customPrompt) {
    sections.splice(8, 0, {
      title: '9. Additional Requirements',
      content: customPrompt
    })
  }

  return sections
}

// Helper function to generate text file content
function generateTextFile(
  title: string,
  orgDetails: OrganizationDetails,
  sections: Array<{ title: string; content: string }>
): string {
  const divider = '═'.repeat(60)
  const thinDivider = '─'.repeat(60)
  const orgName = orgDetails.name || '[Organization Name]'
  const abn = orgDetails.abn ? `\nABN: ${orgDetails.abn}` : ''
  const authorised = orgDetails.authorisedBy 
    ? `${orgDetails.authorisedBy}${orgDetails.authorisedPosition ? `, ${orgDetails.authorisedPosition}` : ''}`
    : '[Authorised Person]'
  
  let content = `${divider}
${title.toUpperCase()}
${divider}

Organization: ${orgName}${abn}
Authorised By: ${authorised}
Generated: ${new Date().toLocaleDateString('en-AU')}

${divider}

`

  sections.forEach((section) => {
    content += `${section.title.toUpperCase()}
${thinDivider}

${section.content}

`
  })

  content += `${divider}
END OF DOCUMENT
${divider}

Generated by Kwooka Compliance System
© ${new Date().getFullYear()} ${orgName}. All rights reserved.
`

  return content
}

// Helper function to download file
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Template Card Component
function TemplateCard({ template, sectorInfo, onSelect }: any) {
  const SectorIcon = SECTOR_ICONS[template.sector] || FileText

  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-kwooka-ochre/50"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-lg', sectorInfo?.color || 'bg-slate-500')}>
            <SectorIcon className="h-4 w-4 text-white" />
          </div>
          {template.featured && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Popular
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-sm mb-1 group-hover:text-kwooka-ochre transition-colors line-clamp-1">
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className="text-[10px]">{sectorInfo?.name}</Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">{template.category}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {template.downloads?.toLocaleString()}
          </span>
          <span className="text-kwooka-ochre font-medium">
            Use →
          </span>
        </div>
      </CardContent>
    </Card>
  )
}