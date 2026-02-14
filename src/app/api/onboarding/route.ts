import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  ONBOARDING_QUESTIONS, 
  analyzeBusinessProfile, 
  generateWelcomeMessage,
  BusinessProfile 
} from '@/lib/ai/onboarding-agent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Return onboarding questions
export async function GET() {
  return NextResponse.json({
    questions: ONBOARDING_QUESTIONS,
    totalSteps: ONBOARDING_QUESTIONS.length
  })
}

// POST - Process onboarding answers and create profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { answers, userId } = body

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      )
    }

    // Analyze with AI
    console.log('Analyzing business profile...')
    const profile = await analyzeBusinessProfile(answers)
    
    // Generate welcome message
    const welcomeMessage = generateWelcomeMessage(profile)

    // Save to database if userId provided
    if (userId) {
      try {
        // Update user profile
        await supabase
          .from('profiles')
          .update({
            business_name: profile.businessName,
            sectors: profile.sectors,
            onboarding_completed: true,
            onboarding_data: {
              answers,
              profile,
              completedAt: new Date().toISOString()
            }
          })
          .eq('id', userId)

        // Create initial compliance setup
        await createInitialSetup(userId, profile)
        
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue without saving - don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      profile,
      welcomeMessage,
      nextSteps: profile.suggestedActions.slice(0, 3),
      dashboard: generateDashboardConfig(profile)
    })

  } catch (error: any) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: error.message || 'Onboarding failed' },
      { status: 500 }
    )
  }
}

// Create initial compliance setup based on profile
async function createInitialSetup(userId: string, profile: BusinessProfile) {
  // Create compliance checklist items
  const checklistItems = profile.suggestedActions.map((action, index) => ({
    user_id: userId,
    title: action,
    category: profile.priorityOrder[index] || 'general',
    priority: index + 1,
    status: 'pending',
    sector: profile.sectors[0] || 'workplace',
    due_date: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString() // Stagger by weeks
  }))

  await supabase.from('compliance_tasks').insert(checklistItems).select()

  // Create sector settings
  for (const sector of profile.sectors) {
    await supabase.from('user_sectors').upsert({
      user_id: userId,
      sector_id: sector,
      is_primary: sector === profile.sectors[0],
      enabled: true
    })
  }
}

// Generate dashboard configuration based on profile
function generateDashboardConfig(profile: BusinessProfile) {
  const widgets = []
  
  // Always add overall score
  widgets.push({
    id: 'overall-score',
    type: 'score',
    title: 'Compliance Score',
    position: 0
  })

  // Add sector-specific widgets
  if (profile.sectors.includes('ndis')) {
    widgets.push(
      { id: 'ndis-standards', type: 'checklist', title: 'NDIS Practice Standards', position: 1 },
      { id: 'worker-screening', type: 'status', title: 'Worker Screening', position: 2 }
    )
  }

  if (profile.sectors.includes('workplace') || profile.sectors.includes('construction')) {
    widgets.push(
      { id: 'whs-status', type: 'checklist', title: 'WHS Compliance', position: 3 }
    )
  }

  if (profile.sectors.includes('transport')) {
    widgets.push(
      { id: 'cor-status', type: 'checklist', title: 'Chain of Responsibility', position: 4 }
    )
  }

  // Always add tasks and calendar
  widgets.push(
    { id: 'upcoming-tasks', type: 'tasks', title: 'Priority Actions', position: 10 },
    { id: 'compliance-calendar', type: 'calendar', title: 'Compliance Calendar', position: 11 }
  )

  return {
    widgets,
    primarySector: profile.sectors[0],
    theme: 'default'
  }
}
