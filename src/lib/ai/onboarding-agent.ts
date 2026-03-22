import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface BusinessProfile {
  businessName: string
  abn?: string
  sectors: string[]
  employeeCount: string
  services: string[]
  locations: string[]
  currentCertifications: string[]
  complianceMaturity: 'starting' | 'developing' | 'established' | 'advanced'
  riskAreas: string[]
  requiredLegislation: string[]
  suggestedActions: string[]
  priorityOrder: string[]
}

export interface OnboardingQuestion {
  id: string
  question: string
  type: 'text' | 'select' | 'multiselect'
  options?: string[]
  placeholder?: string
  required: boolean
  helpText?: string
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'business_name',
    question: "What's your business or organisation name?",
    type: 'text',
    placeholder: 'e.g., ABC Care Services Pty Ltd',
    required: true,
    helpText: "We'll use this to personalise your compliance dashboard"
  },
  {
    id: 'abn',
    question: "What's your ABN? (optional)",
    type: 'text',
    placeholder: 'e.g., 12 345 678 901',
    required: false,
    helpText: "Helps us verify your business details"
  },
  {
    id: 'business_type',
    question: "What type of services does your business provide?",
    type: 'multiselect',
    options: [
      'NDIS disability support services',
      'Aged care / home care services',
      'Healthcare / medical services',
      'Transport / logistics / heavy vehicles',
      'Construction / building / trades',
      'General business / office work'
    ],
    required: true,
    helpText: "Select all that apply - this determines which regulations you need to follow"
  },
  {
    id: 'employee_count',
    question: "How many workers does your business have?",
    type: 'select',
    options: [
      'Just me (sole trader)',
      '2-5 employees',
      '6-20 employees',
      '21-50 employees',
      '51-200 employees',
      '200+ employees'
    ],
    required: true,
    helpText: "This helps us tailor compliance requirements to your size"
  },
  {
    id: 'locations',
    question: "Where does your business operate?",
    type: 'multiselect',
    options: [
      'Western Australia',
      'New South Wales',
      'Victoria',
      'Queensland',
      'South Australia',
      'Tasmania',
      'Northern Territory',
      'ACT',
      'Multiple states'
    ],
    required: true,
    helpText: "Some regulations vary by state"
  },
  {
    id: 'current_certifications',
    question: "What compliance certifications do you currently have?",
    type: 'multiselect',
    options: [
      'NDIS Registered Provider',
      'ISO 9001 Quality Management',
      'ISO 45001 Safety Management',
      'NHVAS Accreditation',
      'TruckSafe Accreditation',
      'Aged Care Approved Provider',
      'None yet',
      'Other'
    ],
    required: true,
    helpText: "We'll build on what you already have"
  },
  {
    id: 'compliance_experience',
    question: "How would you describe your current compliance maturity?",
    type: 'select',
    options: [
      "Just starting - I need help understanding what's required",
      "Developing - I have some policies but they need improvement",
      "Established - I have systems in place but want to improve",
      "Advanced - I want to optimise and automate my compliance"
    ],
    required: true,
    helpText: "This helps us provide the right level of guidance"
  },
  {
    id: 'pain_points',
    question: "What compliance challenges are you facing?",
    type: 'multiselect',
    options: [
      "Understanding what regulations apply to me",
      "Keeping policies and procedures up to date",
      "Training staff on compliance requirements",
      "Managing incidents and reporting",
      "Preparing for audits",
      "Tracking worker certifications and screening",
      "Managing documentation",
      "Staying updated on regulation changes"
    ],
    required: true,
    helpText: "We'll prioritise solutions for your biggest challenges"
  },
  {
    id: 'immediate_goal',
    question: "What's your most immediate compliance goal?",
    type: 'select',
    options: [
      "Get NDIS registered",
      "Prepare for an upcoming audit",
      "Improve our compliance score",
      "Set up proper incident reporting",
      "Create or update policies",
      "Train our team",
      "Understand our obligations",
      "Other"
    ],
    required: true,
    helpText: "We'll help you achieve this first"
  }
]

export async function analyzeBusinessProfile(
  answers: Record<string, string | string[]>
): Promise<BusinessProfile> {
  const prompt = `You are an expert Australian compliance consultant. Based on these business details, create a comprehensive compliance profile.

Business Details:
- Business Name: ${answers.business_name}
- ABN: ${answers.abn || 'Not provided'}
- Services: ${Array.isArray(answers.business_type) ? answers.business_type.join(', ') : answers.business_type}
- Employee Count: ${answers.employee_count}
- Locations: ${Array.isArray(answers.locations) ? answers.locations.join(', ') : answers.locations}
- Current Certifications: ${Array.isArray(answers.current_certifications) ? answers.current_certifications.join(', ') : answers.current_certifications}
- Compliance Experience: ${answers.compliance_experience}
- Pain Points: ${Array.isArray(answers.pain_points) ? answers.pain_points.join(', ') : answers.pain_points}
- Immediate Goal: ${answers.immediate_goal}

Determine:
1. Which compliance sectors apply (ndis, aged_care, healthcare, workplace, transport, construction)
2. The specific legislation they must comply with
3. Their compliance maturity level
4. Key risk areas they should focus on
5. Prioritised list of actions they should take
6. Services they likely provide

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "businessName": "${answers.business_name}",
  "abn": "${answers.abn || ''}",
  "sectors": ["ndis", "workplace"],
  "employeeCount": "${answers.employee_count}",
  "services": ["disability support", "community access"],
  "locations": ["Western Australia"],
  "currentCertifications": [],
  "complianceMaturity": "starting",
  "riskAreas": ["worker screening", "incident reporting", "policy documentation"],
  "requiredLegislation": [
    "NDIS Practice Standards",
    "NDIS Code of Conduct",
    "Work Health and Safety Act 2020 (WA)",
    "Fair Work Act 2009"
  ],
  "suggestedActions": [
    "Complete NDIS worker screening for all staff",
    "Develop incident management policy and procedures",
    "Create participant rights and responsibilities policy",
    "Implement complaints management system",
    "Set up staff training register"
  ],
  "priorityOrder": ["worker_screening", "incident_management", "policies", "training"]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    
    // Clean up response - remove any markdown formatting
    let cleanJson = text.trim()
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```/g, '')
    }
    
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error analyzing business profile:', error)
    
    // Return a default profile based on answers
    return createDefaultProfile(answers)
  }
}

function createDefaultProfile(answers: Record<string, string | string[]>): BusinessProfile {
  const sectors: string[] = []
  const legislation: string[] = ['Work Health and Safety Act 2020 (WA)', 'Fair Work Act 2009']
  
  const businessTypes = Array.isArray(answers.business_type) ? answers.business_type : [answers.business_type]
  
  if (businessTypes.some(t => t?.toLowerCase().includes('ndis'))) {
    sectors.push('ndis')
    legislation.push('NDIS Practice Standards', 'NDIS Code of Conduct')
  }
  if (businessTypes.some(t => t?.toLowerCase().includes('aged care'))) {
    sectors.push('aged_care')
    legislation.push('Aged Care Quality Standards')
  }
  if (businessTypes.some(t => t?.toLowerCase().includes('healthcare'))) {
    sectors.push('healthcare')
    legislation.push('National Safety and Quality Health Service Standards')
  }
  if (businessTypes.some(t => t?.toLowerCase().includes('transport'))) {
    sectors.push('transport')
    legislation.push('Heavy Vehicle National Law')
  }
  if (businessTypes.some(t => t?.toLowerCase().includes('construction'))) {
    sectors.push('construction')
    legislation.push('WHS Construction Regulations')
  }
  
  // Always include workplace
  if (!sectors.includes('workplace')) {
    sectors.push('workplace')
  }

  return {
    businessName: answers.business_name as string,
    abn: answers.abn as string,
    sectors,
    employeeCount: answers.employee_count as string,
    services: businessTypes,
    locations: Array.isArray(answers.locations) ? answers.locations : [answers.locations as string],
    currentCertifications: Array.isArray(answers.current_certifications) ? answers.current_certifications : [],
    complianceMaturity: 'starting',
    riskAreas: ['policy documentation', 'worker training', 'incident management'],
    requiredLegislation: legislation,
    suggestedActions: [
      'Review and understand applicable legislation',
      'Develop core compliance policies',
      'Set up incident reporting system',
      'Implement staff training program'
    ],
    priorityOrder: ['legislation_review', 'policies', 'incident_management', 'training']
  }
}

// Generate a welcome message based on the profile
export function generateWelcomeMessage(profile: BusinessProfile): string {
  const sectorNames: Record<string, string> = {
    ndis: 'NDIS disability services',
    aged_care: 'aged care',
    healthcare: 'healthcare',
    transport: 'transport and logistics',
    construction: 'construction',
    workplace: 'workplace safety'
  }

  const sectorList = profile.sectors
    .map(s => sectorNames[s] || s)
    .join(', ')

  return `Welcome to Kwooka Compliance, ${profile.businessName}! 

Based on your profile, you're operating in ${sectorList}. I've identified ${profile.requiredLegislation.length} key pieces of legislation you need to comply with.

Your compliance maturity level is "${profile.complianceMaturity}", and I've created a personalised action plan to help you improve.

Your top priority should be: ${profile.suggestedActions[0]}

Let's get started! 🚀`
}
