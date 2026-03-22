'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// DEV MODE: bypass auth for development/testing
const DEV_BYPASS_AUTH = true

const MOCK_USER = {
  id: 'dev-user-001',
  email: 'dev@kwooka.com',
  user_metadata: { full_name: 'Dev User' },
  app_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
}

export function useAuth(requireAuth: boolean = true) {
  const [user, setUser] = useState<any>(DEV_BYPASS_AUTH ? MOCK_USER : null)
  const [loading, setLoading] = useState(DEV_BYPASS_AUTH ? false : true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (requireAuth && !user) {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (requireAuth) {
          router.push('/auth/login')
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_OUT' && requireAuth) {
        router.push('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [requireAuth, router])

  const resetPassword = async (email: string) => {
    if (DEV_BYPASS_AUTH) return { error: null }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (DEV_BYPASS_AUTH) return { error: null }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error }
  }

  return { user, loading, resetPassword, signUp }
}
