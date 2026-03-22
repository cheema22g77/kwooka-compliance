'use client'

import React from 'react'
import Link from 'next/link'
import {
  Shield, Sparkles, FileText, CalendarDays, ClipboardCheck,
  Download, ArrowRight, CheckCircle2, AlertTriangle,
  Zap, Lock, Globe, BarChart3,
} from 'lucide-react'

const FEATURES = [
  { icon: Sparkles, title: 'AI Document Analysis', description: 'Upload any policy or procedure. Get an instant compliance score with specific findings mapped to Australian regulations.' },
  { icon: Shield, title: 'Evidence Vault', description: 'Map every document to the compliance requirements it satisfies. See exactly where your gaps are, sector by sector.' },
  { icon: CalendarDays, title: 'Compliance Calendar', description: 'Never miss an audit deadline. Sector-specific cycles auto-populated — NDIS quarterly reporting, NHVAS annual reviews, SIRS deadlines.' },
  { icon: ClipboardCheck, title: 'Sector Playbooks', description: 'Pre-built compliance checklists drawn from real Australian regulations. Tick items off, track progress, know where you stand.' },
  { icon: Download, title: 'Audit-Ready Reports', description: 'One-click PDF compliance pack. Score summary, evidence map, findings, action plan — ready for your next auditor visit.' },
  { icon: FileText, title: 'Policy Generator', description: 'AI-powered policy drafting informed by your sector regulations. Generate compliant documents in minutes, not weeks.' },
]

const SECTORS = [
  { name: 'NDIS', reg: 'Practice Standards', color: 'bg-purple-500' },
  { name: 'Transport', reg: 'HVNL & CoR', color: 'bg-blue-500' },
  { name: 'Healthcare', reg: 'NSQHS Standards', color: 'bg-red-500' },
  { name: 'Aged Care', reg: 'Quality Standards', color: 'bg-green-500' },
  { name: 'Workplace', reg: 'WHS Act', color: 'bg-amber-500' },
  { name: 'Construction', reg: 'WHS Regs', color: 'bg-orange-500' },
]

const STATS = [
  { value: '6', label: 'Australian Sectors' },
  { value: '48', label: 'Compliance Areas' },
  { value: '100+', label: 'Regulation References' },
  { value: '<2min', label: 'To First Analysis' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-kwooka-charcoal tracking-tight">Kwooka</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-slate-600 hover:text-kwooka-ochre transition-colors">Features</a>
            <a href="#sectors" className="text-slate-600 hover:text-kwooka-ochre transition-colors">Sectors</a>
            <a href="#pricing" className="text-slate-600 hover:text-kwooka-ochre transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-kwooka-ochre transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/auth/signup" className="text-sm font-medium bg-kwooka-ochre text-white px-4 py-2 rounded-lg hover:bg-kwooka-ochre/90 transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4621A' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-kwooka-ochre/5 border border-kwooka-ochre/15 rounded-full px-4 py-1.5 mb-8">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-kwooka-ochre">Aboriginal-Owned Enterprise · Supply Nation Certified</span>
          </div>

          {/* Mascot */}
          <img src="/images/kwooka_mascot_clean.png" alt="Kwooka mascot" className="h-24 w-24 mx-auto mb-6 rounded-2xl object-cover shadow-lg" />

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-kwooka-charcoal tracking-tight leading-[1.1] mb-6">
            Australian compliance,
            <br />
            <span className="text-kwooka-ochre">sorted.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload a policy document. Get an AI compliance score in under two minutes.
            Track findings, fill evidence gaps, and walk into your next audit ready.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 bg-kwooka-ochre text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-kwooka-ochre/90 transition-all hover:shadow-lg hover:shadow-kwooka-ochre/20 text-base">
              Start Your First Analysis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-medium px-7 py-3.5 rounded-xl hover:bg-slate-200 transition-all text-base">
              Try Live Demo
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {STATS.map(stat => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold text-kwooka-charcoal">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof — sector coverage */}
      <section id="sectors" className="py-16 bg-kwooka-charcoal">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-slate-400 mb-8 tracking-wide uppercase">Built for Australian regulated industries</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SECTORS.map(s => (
              <div key={s.name} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-lg px-5 py-3">
                <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                <div>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  <p className="text-slate-500 text-[11px]">{s.reg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-kwooka-ochre tracking-wide uppercase mb-3">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-kwooka-charcoal tracking-tight">
              From first upload to audit-ready
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              One platform that analyses your documents, tracks your findings, maps your evidence, and generates your audit report.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-slate-100 hover:border-kwooka-ochre/20 hover:shadow-lg hover:shadow-kwooka-ochre/5 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-kwooka-ochre/10 flex items-center justify-center mb-4 group-hover:bg-kwooka-ochre/15 transition-colors">
                  <feature.icon className="h-5 w-5 text-kwooka-ochre" />
                </div>
                <h3 className="font-semibold text-kwooka-charcoal mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-kwooka-ochre tracking-wide uppercase mb-3">Three steps</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-kwooka-charcoal tracking-tight">
              Compliance score in two minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload', desc: 'Drop in any policy, procedure, or compliance document. PDF, DOCX, or paste text directly.' },
              { step: '02', title: 'Analyse', desc: 'AI scans against your sector regulations. Every finding mapped to specific legislation with severity ratings.' },
              { step: '03', title: 'Act', desc: 'Prioritised action plan, trackable findings, and evidence gaps highlighted. Generate your audit report in one click.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <span className="text-5xl font-black text-kwooka-ochre/10">{item.step}</span>
                <h3 className="text-xl font-bold text-kwooka-charcoal mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kwooka — differentiation */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-kwooka-ochre tracking-wide uppercase mb-3">Why Kwooka</p>
              <h2 className="text-3xl font-bold text-kwooka-charcoal tracking-tight mb-6">
                Built in Australia,<br />for Australian regulation
              </h2>
              <div className="space-y-5">
                {[
                  { icon: Globe, text: 'Australian-first. Not a US platform with AU bolted on. Every regulation, every authority, every compliance area is Australian from the ground up.' },
                  { icon: BarChart3, text: 'Multi-sector. NDIS, Transport, Healthcare, Aged Care, WHS, Construction — one platform, six regulated industries.' },
                  { icon: Zap, text: 'AI-powered analysis against real legislation. Not generic checklists — actual regulatory references with specific clause numbers.' },
                  { icon: Lock, text: 'Aboriginal-owned enterprise. Supply Nation certified. Supporting Indigenous procurement means your compliance spend creates social impact.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-8 w-8 rounded-lg bg-kwooka-ochre/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-kwooka-ochre" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-kwooka-charcoal to-kwooka-rust rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-kwooka-sand" />
                  </div>
                  <div>
                    <p className="font-semibold">Compliance Score</p>
                    <p className="text-sm text-white/60">NDIS — Incident Management Policy</p>
                  </div>
                </div>
                <div className="flex items-end gap-4 mb-6">
                  <span className="text-6xl font-black text-kwooka-sand">78%</span>
                  <span className="text-sm text-white/50 mb-2">PARTIAL COMPLIANCE</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Rights & Responsibilities', score: 92 },
                    { label: 'Incident Management', score: 65 },
                    { label: 'Worker Screening', score: 88 },
                    { label: 'Complaints Management', score: 54 },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">{item.label}</span>
                        <span className="text-white/50">{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-kwooka-sand rounded-full" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-white/60">3 critical findings · 5 action items generated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-kwooka-ochre tracking-wide uppercase mb-3">Simple pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-kwooka-charcoal tracking-tight">
              Enterprise compliance at SME prices
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              Competitors charge $50,000–$200,000 per year. We believe every Australian provider deserves access to compliance tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter', price: 'Free', period: 'forever',
                features: ['2 analyses per month', '1 sector', 'Compliance copilot', 'Basic findings tracking'],
                cta: 'Get Started', ctaStyle: 'bg-slate-900 text-white hover:bg-slate-800',
              },
              {
                name: 'Professional', price: '$99', period: '/month',
                features: ['Unlimited analyses', 'All 6 sectors', 'Evidence vault', 'Compliance calendar', 'Audit-ready reports', 'Sector playbooks', 'Priority support'],
                cta: 'Start Free Trial', ctaStyle: 'bg-kwooka-ochre text-white hover:bg-kwooka-ochre/90', popular: true,
              },
              {
                name: 'Business', price: '$299', period: '/month',
                features: ['Everything in Pro', 'Team workspace', 'Assign findings to staff', 'Custom playbooks', 'API access', 'Dedicated support', 'Multi-site management'],
                cta: 'Contact Us', ctaStyle: 'bg-slate-900 text-white hover:bg-slate-800',
              },
            ].map((plan, i) => (
              <div key={i} className={`relative bg-white rounded-2xl p-7 ${plan.popular ? 'ring-2 ring-kwooka-ochre shadow-xl shadow-kwooka-ochre/10' : 'border border-slate-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-kwooka-ochre text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-semibold text-kwooka-charcoal mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-kwooka-charcoal">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </div>
                <div className="space-y-2.5 mb-7">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-kwooka-ochre shrink-0" />
                      <span className="text-sm text-slate-600">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/auth/signup" className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-all ${plan.ctaStyle}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-kwooka-charcoal tracking-tight mb-4">
            Your next audit is coming.
          </h2>
          <p className="text-lg text-slate-500 mb-8">
            Find out where you stand in two minutes. No credit card required.
          </p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-kwooka-ochre text-white font-semibold px-8 py-4 rounded-xl hover:bg-kwooka-ochre/90 transition-all hover:shadow-lg hover:shadow-kwooka-ochre/20 text-base">
            Start Your First Analysis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="h-7 w-7 rounded-md object-cover" />
            <span className="font-bold text-sm text-kwooka-charcoal">Kwooka Compliance</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span>Kwooka Health Services Ltd</span>
            <span>·</span>
            <span>Aboriginal-Owned Enterprise</span>
            <span>·</span>
            <span>Supply Nation Certified</span>
            <span>·</span>
            <span>Perth, Western Australia</span>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Kwooka</p>
        </div>
      </footer>
    </div>
  )
}
