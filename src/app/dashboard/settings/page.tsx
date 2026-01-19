'use client'

import React, { useState, useEffect } from 'react'
import { 
  User, Building2, Bell, Shield, Layers, Loader2, Save, Check,
  Mail, Phone, Globe, MapPin, FileText, AlertTriangle, CheckCircle2,
  Key, Eye, EyeOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const SETTINGS_TABS = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'sectors', name: 'Sectors', icon: Layers },
  { id: 'company', name: 'Company', icon: Building2 },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
]

interface OrganisationSettings {
  company_name: string
  abn: string
  address: string
  phone: string
  email: string
  website: string
  authorised_person: string
  authorised_position: string
}

interface NotificationSettings {
  email_findings: boolean
  email_deadlines: boolean
  email_weekly_summary: boolean
  email_legislation_updates: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Profile state
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  
  // Company/Organisation state
  const [orgSettings, setOrgSettings] = useState<OrganisationSettings>({
    company_name: '',
    abn: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    authorised_person: '',
    authorised_position: '',
  })
  
  // Notification state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_findings: true,
    email_deadlines: true,
    email_weekly_summary: false,
    email_legislation_updates: true,
  })
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchAllSettings()
  }, [])

  const fetchAllSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      setUserId(user.id)
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile({ 
          full_name: profileData.full_name || '', 
          email: profileData.email || user.email || '' 
        })
      }
      
      // Fetch organisation settings
      const { data: orgData } = await supabase
        .from('organisation_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (orgData) {
        setOrgSettings({
          company_name: orgData.company_name || '',
          abn: orgData.abn || '',
          address: orgData.address || '',
          phone: orgData.phone || '',
          email: orgData.email || '',
          website: orgData.website || '',
          authorised_person: orgData.authorised_person || '',
          authorised_position: orgData.authorised_position || '',
        })
      }
      
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', userId)
      
      if (updateError) throw updateError
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    
    try {
      // Try to update first
      const { data: existing } = await supabase
        .from('organisation_settings')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('organisation_settings')
          .update({
            ...orgSettings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        if (updateError) throw updateError
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('organisation_settings')
          .insert({
            user_id: userId,
            ...orgSettings
          })
        
        if (insertError) throw insertError
      }
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setSaving(true)
    setError(null)
    setSaved(false)
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Settings saved successfully!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                if (tab.id === 'sectors') {
                  return (
                    <Link
                      key={tab.id}
                      href="/dashboard/settings/sectors"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        'hover:bg-slate-100 text-slate-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </Link>
                  )
                }
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setError(null); setSaved(false) }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
                      isActive 
                        ? 'bg-kwooka-ochre/10 text-kwooka-ochre font-medium' 
                        : 'hover:bg-slate-100 text-slate-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={profile.email} 
                      disabled 
                      className="bg-slate-50" 
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Company Settings */}
          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Organisation Details</CardTitle>
                <CardDescription>
                  These details are used when generating compliance documents and policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Organisation Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        value={orgSettings.company_name}
                        onChange={(e) => setOrgSettings({ ...orgSettings, company_name: e.target.value })}
                        placeholder="Kwooka Health Services Ltd"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="abn"
                        value={orgSettings.abn}
                        onChange={(e) => setOrgSettings({ ...orgSettings, abn: e.target.value })}
                        placeholder="12 345 678 901"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={orgSettings.address}
                      onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                      placeholder="123 Main Street, Perth WA 6000"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="org_phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org_phone"
                        value={orgSettings.phone}
                        onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                        placeholder="08 1234 5678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org_email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org_email"
                        type="email"
                        value={orgSettings.email}
                        onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                        placeholder="admin@company.com.au"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        value={orgSettings.website}
                        onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                        placeholder="www.company.com.au"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Authorised Signatory</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This person will appear on generated policies and compliance documents
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="authorised_person">Name</Label>
                      <Input
                        id="authorised_person"
                        value={orgSettings.authorised_person}
                        onChange={(e) => setOrgSettings({ ...orgSettings, authorised_person: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authorised_position">Position</Label>
                      <Input
                        id="authorised_position"
                        value={orgSettings.authorised_position}
                        onChange={(e) => setOrgSettings({ ...orgSettings, authorised_position: e.target.value })}
                        placeholder="Managing Director"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveCompany} disabled={saving} className="bg-kwooka-ochre hover:bg-kwooka-ochre/90">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Organisation Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Control how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Email Notifications</h3>
                  
                  {[
                    { key: 'email_findings', label: 'New Findings', description: 'Get notified when new compliance findings are identified' },
                    { key: 'email_deadlines', label: 'Deadline Reminders', description: 'Receive reminders for upcoming compliance deadlines' },
                    { key: 'email_weekly_summary', label: 'Weekly Summary', description: 'Receive a weekly summary of your compliance status' },
                    { key: 'email_legislation_updates', label: 'Legislation Updates', description: 'Get notified about changes to relevant legislation' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <button
                        onClick={() => setNotifications({ 
                          ...notifications, 
                          [item.key]: !notifications[item.key as keyof NotificationSettings] 
                        })}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          notifications[item.key as keyof NotificationSettings] 
                            ? 'bg-kwooka-ochre' 
                            : 'bg-slate-200'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            notifications[item.key as keyof NotificationSettings] 
                              ? 'translate-x-6' 
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Email notifications require email service configuration. 
                    Contact your administrator if you're not receiving notifications.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new_password"
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm_password"
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Password must be at least 8 characters long
                  </div>

                  <Button 
                    onClick={handleChangePassword} 
                    disabled={saving || !newPassword || !confirmPassword}
                    className="bg-kwooka-ochre hover:bg-kwooka-ochre/90"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Additional security options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Active Sessions</p>
                      <p className="text-sm text-muted-foreground">Manage devices where you're logged in</p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                    <div>
                      <p className="font-medium text-red-700">Delete Account</p>
                      <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-100" disabled>
                      Contact Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}