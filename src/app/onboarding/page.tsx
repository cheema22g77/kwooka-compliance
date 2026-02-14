'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Send, Loader2, CheckCircle2, ArrowRight, Sparkles,
  Building2, Users, MapPin, Shield, Target, Rocket, ChevronRight,
  FileText, AlertTriangle, Heart, Truck, HardHat, Home, Briefcase,
  Check, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Kwooka Mascot Component
const KwookaMascot = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  }
  const imgSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12'
  }
  
  return (
    <div className={cn(
      "rounded-full bg-gradient-to-br from-kwooka-sand to-amber-100 flex items-center justify-center shadow-lg overflow-hidden border-2 border-kwooka-ochre/20",
      sizeClasses[size]
    )}>
      <img 
        src="/images/kwooka_mascot_clean.png" 
        alt="Kwooka" 
        className={cn("object-contain", imgSizes[size])} 
      />
    </div>
  )
}

// Onboarding steps configuration
const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'business', title: 'Your Business', icon: Building2 },
  { id: 'services', title: 'Services', icon: Heart },
  { id: 'team', title: 'Team Size', icon: Users },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'experience', title: 'Experience', icon: Shield },
  { id: 'goals', title: 'Goals', icon: Target },
  { id: 'complete', title: 'All Set!', icon: Rocket },
]

const SERVICE_OPTIONS = [
  { id: 'ndis', label: 'NDIS Disability Support', icon: Shield, color: 'bg-orange-500' },
  { id: 'aged_care', label: 'Aged Care / Home Care', icon: Home, color: 'bg-purple-500' },
  { id: 'healthcare', label: 'Healthcare / Medical', icon: Heart, color: 'bg-red-500' },
  { id: 'transport', label: 'Transport / Logistics', icon: Truck, color: 'bg-blue-500' },
  { id: 'construction', label: 'Construction / Building', icon: HardHat, color: 'bg-amber-500' },
  { id: 'workplace', label: 'General Business / Office', icon: Briefcase, color: 'bg-green-500' },
]

const TEAM_SIZE_OPTIONS = [
  { id: 'solo', label: 'Just me (sole trader)', range: '1' },
  { id: 'small', label: '2-5 employees', range: '2-5' },
  { id: 'medium', label: '6-20 employees', range: '6-20' },
  { id: 'large', label: '21-50 employees', range: '21-50' },
  { id: 'enterprise', label: '51+ employees', range: '51+' },
]

const LOCATION_OPTIONS = [
  'Western Australia', 'New South Wales', 'Victoria', 'Queensland',
  'South Australia', 'Tasmania', 'Northern Territory', 'ACT'
]

const EXPERIENCE_OPTIONS = [
  { id: 'starting', label: "Just starting - I need help understanding what's required", emoji: '🌱' },
  { id: 'developing', label: 'Developing - I have some policies but need improvement', emoji: '📈' },
  { id: 'established', label: 'Established - I have systems but want to improve', emoji: '✅' },
  { id: 'advanced', label: 'Advanced - I want to optimise and automate', emoji: '🚀' },
]

const GOAL_OPTIONS = [
  { id: 'registration', label: 'Get NDIS/industry registered', icon: Shield },
  { id: 'audit', label: 'Prepare for an upcoming audit', icon: FileText },
  { id: 'policies', label: 'Create or update policies', icon: FileText },
  { id: 'incidents', label: 'Set up incident reporting', icon: AlertTriangle },
  { id: 'improve', label: 'Improve compliance score', icon: Target },
  { id: 'understand', label: 'Understand my obligations', icon: MessageCircle },
]

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  options?: any[]
  inputType?: 'text' | 'select' | 'multiselect' | 'location'
  timestamp: Date
}

interface OnboardingData {
  businessName: string
  abn: string
  services: string[]
  teamSize: string
  locations: string[]
  experience: string
  goals: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasStarted = useRef(false)

  const [currentStep, setCurrentStep] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    businessName: '',
    abn: '',
    services: [],
    teamSize: '',
    locations: [],
    experience: '',
    goals: [],
  })
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start onboarding conversation - only once
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      startConversation()
    }
  }, [])

  const addBotMessage = useCallback((content: string, delay: number = 1000, extra: Partial<Message> = {}) => {
    return new Promise<void>((resolve) => {
      setIsTyping(true)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content,
          timestamp: new Date(),
          ...extra
        }])
        setIsTyping(false)
        resolve()
      }, delay)
    })
  }, [])

  const startConversation = async () => {
    await addBotMessage(
      "G'day! 👋 I'm Kwooka, your AI compliance assistant.\n\nI'll help you set up your personalised compliance dashboard in just a few minutes. Let's start with a quick chat about your business.",
      1500
    )
    await addBotMessage(
      "First up - what's your business or organisation name?",
      1000,
      { inputType: 'text' }
    )
    setCurrentStep(1)
  }

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }])
  }

  const handleTextSubmit = async () => {
    if (!inputValue.trim()) return

    const value = inputValue.trim()
    addUserMessage(value)
    setInputValue('')

    // Process based on current step
    if (currentStep === 1) {
      setOnboardingData(prev => ({ ...prev, businessName: value }))
      await addBotMessage(
        `Great to meet you, ${value}! 🎉\n\nNow, what services does your business provide? Select all that apply:`,
        1200,
        { inputType: 'multiselect', options: SERVICE_OPTIONS }
      )
      setCurrentStep(2)
    }
  }

  const handleServiceSelect = (serviceId: string) => {
    setSelectedOptions(prev => 
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleServicesConfirm = async () => {
    if (selectedOptions.length === 0) return

    const selectedLabels = SERVICE_OPTIONS
      .filter(s => selectedOptions.includes(s.id))
      .map(s => s.label)
      .join(', ')

    addUserMessage(selectedLabels)
    setOnboardingData(prev => ({ ...prev, services: [...selectedOptions] }))
    setSelectedOptions([])

    await addBotMessage(
      `Excellent choices! I'll make sure to include all the relevant compliance frameworks.\n\nHow many people work in your organisation?`,
      1200,
      { inputType: 'select', options: TEAM_SIZE_OPTIONS }
    )
    setCurrentStep(3)
  }

  const handleTeamSizeSelect = async (sizeId: string) => {
    const selected = TEAM_SIZE_OPTIONS.find(t => t.id === sizeId)
    if (!selected) return

    addUserMessage(selected.label)
    setOnboardingData(prev => ({ ...prev, teamSize: selected.range }))

    await addBotMessage(
      `Got it! Team size helps me tailor compliance requirements appropriately.\n\nWhere does your business operate? Select all locations:`,
      1200,
      { inputType: 'location', options: LOCATION_OPTIONS }
    )
    setCurrentStep(4)
  }

  const handleLocationSelect = (location: string) => {
    setSelectedOptions(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    )
  }

  const handleLocationsConfirm = async () => {
    if (selectedOptions.length === 0) return

    addUserMessage(selectedOptions.join(', '))
    setOnboardingData(prev => ({ ...prev, locations: [...selectedOptions] }))
    setSelectedOptions([])

    await addBotMessage(
      `Perfect! Some compliance requirements vary by state, so this helps me give you accurate information.\n\nHow would you describe your current compliance experience?`,
      1200,
      { inputType: 'select', options: EXPERIENCE_OPTIONS }
    )
    setCurrentStep(5)
  }

  const handleExperienceSelect = async (expId: string) => {
    const selected = EXPERIENCE_OPTIONS.find(e => e.id === expId)
    if (!selected) return

    addUserMessage(`${selected.emoji} ${selected.label}`)
    setOnboardingData(prev => ({ ...prev, experience: expId }))

    await addBotMessage(
      `Thanks for being honest about where you're at - that helps me provide the right level of guidance!\n\nLast question: What's your most important compliance goal right now?`,
      1200,
      { inputType: 'multiselect', options: GOAL_OPTIONS }
    )
    setCurrentStep(6)
  }

  const handleGoalsConfirm = async () => {
    if (selectedOptions.length === 0) return

    const selectedLabels = GOAL_OPTIONS
      .filter(g => selectedOptions.includes(g.id))
      .map(g => g.label)
      .join(', ')

    addUserMessage(selectedLabels)
    setOnboardingData(prev => ({ ...prev, goals: [...selectedOptions] }))
    setSelectedOptions([])

    setCurrentStep(7)
    await addBotMessage(
      `Brilliant! I've got everything I need. 🎯\n\nNow let me analyse your business profile and set up your personalised compliance dashboard...`,
      1200
    )

    setIsAnalyzing(true)
    await analyzeAndComplete()
  }

  const analyzeAndComplete = async () => {
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: {
            business_name: onboardingData.businessName,
            business_type: onboardingData.services.map(s => 
              SERVICE_OPTIONS.find(o => o.id === s)?.label || s
            ),
            employee_count: onboardingData.teamSize,
            locations: onboardingData.locations,
            compliance_experience: EXPERIENCE_OPTIONS.find(e => e.id === onboardingData.experience)?.label,
            immediate_goal: onboardingData.goals.map(g =>
              GOAL_OPTIONS.find(o => o.id === g)?.label || g
            ).join(', '),
            pain_points: onboardingData.goals
          },
          userId: user?.id
        })
      })

      const result = await response.json()
      setAnalysisResult(result)
      setIsAnalyzing(false)

      await addBotMessage(
        `✅ Analysis complete!\n\n**Here's what I found for ${onboardingData.businessName}:**`,
        800
      )

      const legislationCount = result.profile?.requiredLegislation?.length || 3
      const riskCount = result.profile?.riskAreas?.length || 3
      const actionCount = result.profile?.suggestedActions?.length || 5

      await addBotMessage(
        `📋 **${legislationCount} key regulations** apply to your business\n🎯 **${riskCount} priority risk areas** identified\n✅ **${actionCount} recommended actions** to get compliant\n\nI've created a personalised action plan and configured your dashboard. Ready to dive in?`,
        1500
      )

      setCurrentStep(8)

    } catch (error) {
      console.error('Analysis error:', error)
      setIsAnalyzing(false)
      await addBotMessage(
        "I've set up your basic dashboard. You can always update your profile later in Settings.",
        1200
      )
      setCurrentStep(8)
    }
  }

  const handleGoToDashboard = async () => {
    // Mark onboarding as completed
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
    }
    router.push('/dashboard')
  }

  const handleSkipOnboarding = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_data: { skipped: true, skippedAt: new Date().toISOString() }
        })
        .eq('id', user.id)
    }
    router.push('/dashboard')
  }

  const progress = (currentStep / (ONBOARDING_STEPS.length - 1)) * 100

  // Get the last message to check what options to show
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-10 w-10" />
              <div>
                <h1 className="font-bold text-slate-900">Kwooka Compliance</h1>
                <p className="text-xs text-slate-500">AI-Powered Setup</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-500">Step {Math.min(currentStep, 7)} of 7</p>
                <p className="text-sm font-medium text-slate-700">
                  {ONBOARDING_STEPS[Math.min(currentStep, 7)]?.title || 'Getting Started'}
                </p>
              </div>
              <div className="w-32">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicators - Desktop */}
      <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
        <div className="space-y-4">
          {ONBOARDING_STEPS.slice(1, -1).map((step, index) => {
            const StepIcon = step.icon
            const stepNumber = index + 1
            const isActive = currentStep === stepNumber
            const isComplete = currentStep > stepNumber

            return (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isComplete ? 'bg-green-500 text-white' :
                    isActive ? 'bg-kwooka-ochre text-white shadow-lg shadow-kwooka-ochre/30' :
                    'bg-slate-100 text-slate-400'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  'text-sm font-medium transition-colors',
                  isActive ? 'text-kwooka-ochre' : isComplete ? 'text-green-600' : 'text-slate-400'
                )}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      <main className="pt-24 pb-32 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex gap-3 mb-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <KwookaMascot size="md" />
                  </div>
                )}

                <div className={cn('max-w-[80%]', message.role === 'user' ? 'order-1' : '')}>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-kwooka-ochre text-white rounded-br-md'
                        : 'bg-white border border-slate-200 shadow-sm rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 order-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-600" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mb-4"
              >
                <KwookaMascot size="md" />
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Service Options - Step 2 */}
            {currentStep === 2 && lastAssistantMessage?.inputType === 'multiselect' && !isTyping && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ml-13 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {SERVICE_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = selectedOptions.includes(option.id)
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleServiceSelect(option.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                          isSelected
                            ? 'border-kwooka-ochre bg-kwooka-ochre/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        )}
                      >
                        <div className={cn('p-2 rounded-lg', option.color)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium flex-1">{option.label}</span>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-kwooka-ochre" />}
                      </button>
                    )
                  })}
                </div>
                {selectedOptions.length > 0 && (
                  <Button onClick={handleServicesConfirm} className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                    Continue with {selectedOptions.length} selected
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}

            {/* Team Size Options - Step 3 */}
            {currentStep === 3 && lastAssistantMessage?.inputType === 'select' && !isTyping && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ml-13 mb-4 space-y-2">
                {TEAM_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleTeamSizeSelect(option.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 hover:border-kwooka-ochre bg-white transition-all text-left"
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Location Options - Step 4 */}
            {currentStep === 4 && lastAssistantMessage?.inputType === 'location' && !isTyping && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ml-13 mb-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {LOCATION_OPTIONS.map((location) => {
                    const isSelected = selectedOptions.includes(location)
                    return (
                      <button
                        key={location}
                        onClick={() => handleLocationSelect(location)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left text-sm',
                          isSelected
                            ? 'border-kwooka-ochre bg-kwooka-ochre/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        )}
                      >
                        <span className="font-medium">{location}</span>
                        {isSelected && <Check className="h-4 w-4 text-kwooka-ochre" />}
                      </button>
                    )
                  })}
                </div>
                {selectedOptions.length > 0 && (
                  <Button onClick={handleLocationsConfirm} className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}

            {/* Experience Options - Step 5 */}
            {currentStep === 5 && lastAssistantMessage?.inputType === 'select' && !isTyping && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ml-13 mb-4 space-y-2">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleExperienceSelect(option.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-kwooka-ochre bg-white transition-all text-left"
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-sm font-medium flex-1">{option.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </motion.div>
            )}

            {/* Goals Options - Step 6 */}
            {currentStep === 6 && lastAssistantMessage?.inputType === 'multiselect' && !isTyping && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ml-13 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {GOAL_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = selectedOptions.includes(option.id)
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOptions(prev => 
                          prev.includes(option.id) ? prev.filter(s => s !== option.id) : [...prev, option.id]
                        )}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                          isSelected
                            ? 'border-kwooka-ochre bg-kwooka-ochre/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        )}
                      >
                        <Icon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium flex-1">{option.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-kwooka-ochre" />}
                      </button>
                    )
                  })}
                </div>
                {selectedOptions.length > 0 && (
                  <Button onClick={handleGoalsConfirm} className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                    Analyze my business
                    <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}

            {/* Analyzing indicator */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center my-8"
              >
                <Card className="p-6 text-center max-w-sm">
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-kwooka-ochre/20 rounded-full animate-ping" />
                    <div className="relative w-full h-full bg-gradient-to-br from-kwooka-sand to-amber-100 rounded-full flex items-center justify-center border-2 border-kwooka-ochre/30">
                      <img 
                        src="/images/kwooka_mascot_clean.png" 
                        alt="Kwooka" 
                        className="h-16 w-16 object-contain animate-pulse" 
                      />
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Analyzing your business...</h3>
                  <p className="text-sm text-slate-500">
                    Reviewing Australian compliance requirements
                  </p>
                  <div className="mt-4 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-kwooka-ochre" />
                      <span>Identifying applicable legislation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin text-kwooka-ochre" />
                      <span>Creating your compliance roadmap</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Completion Card */}
            {currentStep === 8 && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-8"
              >
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-kwooka-ochre to-amber-500 p-6 text-white text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                      <img 
                        src="/images/kwooka_mascot_clean.png" 
                        alt="Kwooka" 
                        className="h-14 w-14 object-contain" 
                      />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">You're all set! 🎉</h2>
                    <p className="text-white/90">Your personalised compliance dashboard is ready</p>
                  </div>
                  <CardContent className="p-6">
                    {analysisResult?.profile && (
                      <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <FileText className="h-5 w-5 text-kwooka-ochre mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Legislation identified</p>
                            <p className="text-xs text-slate-500">
                              {analysisResult.profile.requiredLegislation?.slice(0, 3).join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <Target className="h-5 w-5 text-kwooka-ochre mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Your first priority</p>
                            <p className="text-xs text-slate-500">
                              {analysisResult.profile.suggestedActions?.[0]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={handleGoToDashboard}
                      className="w-full bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                      size="lg"
                    >
                      Go to Dashboard
                      <Rocket className="h-5 w-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Text Input - Step 1 */}
      {currentStep === 1 && !isTyping && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleTextSubmit(); }} className="flex gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your business name..."
                className="flex-1"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!inputValue.trim()}
                className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="text-center mt-3">
              <button
                onClick={handleSkipOnboarding}
                className="text-sm text-slate-400 hover:text-slate-600 underline"
              >
                Skip for now - I'll set up later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip option for other steps */}
      {currentStep > 1 && currentStep < 7 && !isTyping && !isAnalyzing && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={handleSkipOnboarding}
            className="text-sm text-slate-400 hover:text-slate-600 bg-white px-3 py-1.5 rounded-full shadow border"
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  )
}