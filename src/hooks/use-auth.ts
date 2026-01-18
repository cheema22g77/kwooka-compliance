'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useAuth(requireAuth: boolean = true) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
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

  return { user, loading }
}
