'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Shield,
  Sparkles,
  Loader2,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getSeverityColor } from '@/lib/utils'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    openFindings: 0,
    criticalFindings: 0,
    pendingReviews: 0,
  })
  const [recentFindings, setRecentFindings] = useState<any[]>([])
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [userName, setUserName] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      setUserName(profile?.full_name || user.email?.split('@')[0] || 'there')

      // Get documents count
      const { count: docsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Get pending documents
      const { count: pendingCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')

      // Get open findings
      const { count: openCount } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress'])

      // Get critical findings
      const { count: criticalCount } = await supabase
        .from('findings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('severity', 'critical')
        .in('status', ['open', 'in_progress'])

      // Get recent findings
      const { data: findings } = await supabase
        .from('findings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent documents
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalDocuments: docsCount || 0,
        openFindings: openCount || 0,
        criticalFindings: criticalCount || 0,
        pendingReviews: pendingCount || 0,
      })
      setRecentFindings(findings || [])
      setRecentDocuments(documents || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      href: '/dashboard/documents',
    },
    {
      title: 'Open Findings',
      value: stats.openFindings,
      icon: AlertTriangle,
      href: '/dashboard/findings',
    },
    {
      title: 'Critical Issues',
      value: stats.criticalFindings,
      icon: Shield,
      color: stats.criticalFindings > 0 ? 'text-red-500' : undefined,
      href: '/dashboard/findings',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      href: '/dashboard/documents',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your compliance overview for today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/documents">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </Link>
          <Link href="/dashboard/findings">
            <Button className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              New Finding
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="card-hover cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kwooka-ochre/10">
                    <Icon className={cn("h-5 w-5 text-kwooka-ochre", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-3xl font-bold", stat.color)}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Findings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Findings</CardTitle>
                <CardDescription>Latest compliance issues</CardDescription>
              </div>
              <Link href="/dashboard/findings">
                <Button variant="ghost" size="sm" className="text-kwooka-ochre">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentFindings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No findings yet</p>
                <Link href="/dashboard/findings">
                  <Button variant="outline" size="sm" className="mt-3">
                    Create First Finding
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="flex items-start gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        finding.severity === 'critical' && 'bg-red-100 text-red-600',
                        finding.severity === 'high' && 'bg-orange-100 text-orange-600',
                        finding.severity === 'medium' && 'bg-yellow-100 text-yellow-600',
                        finding.severity === 'low' && 'bg-blue-100 text-blue-600',
                        finding.severity === 'info' && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{finding.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{finding.category}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(finding.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge className={cn(getSeverityColor(finding.severity), 'capitalize text-xs')}>
                      {finding.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Recently uploaded files</CardDescription>
              </div>
              <Link href="/dashboard/documents">
                <Button variant="ghost" size="sm" className="text-kwooka-ochre">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <Link href="/dashboard/documents">
                  <Button variant="outline" size="sm" className="mt-3">
                    Upload First Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                      doc.file_type?.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{doc.category}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Banner */}
      <Card className="bg-gradient-to-br from-kwooka-charcoal to-kwooka-rust text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-Powered Analysis Coming Soon</h3>
                <p className="text-white/70 text-sm">
                  Automatic document analysis and compliance recommendations
                </p>
              </div>
            </div>
            <Button className="bg-white text-kwooka-charcoal hover:bg-white/90">
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
