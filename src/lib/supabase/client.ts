import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pcfolovvrmcmpdwdvidv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZm9sb3Z2cm1jbXBkd2R2aWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mzg1NjAsImV4cCI6MjA4NDIxNDU2MH0.4MudqcMeDy4WjoJqzFH9wvNvMbFiu9Zyq1rt2NizRdA'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
