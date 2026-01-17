import { redirect } from 'next/navigation'

export default function Home() {
  // In production, you'd check auth state here
  // For now, redirect to login
  redirect('/auth/login')
}
