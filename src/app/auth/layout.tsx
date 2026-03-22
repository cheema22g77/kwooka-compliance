import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-kwooka-charcoal via-kwooka-charcoal to-kwooka-rust relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/kwooka_mascot_clean.png"
              alt="Kwooka Mascot"
              width={60}
              height={60}
              className="drop-shadow-lg"
            />
            <div>
              <span className="text-2xl font-bold tracking-tight">Kwooka</span>
              <span className="block text-xs text-white/60 uppercase tracking-widest">
                Compliance
              </span>
            </div>
          </Link>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Large Mascot */}
            <div className="flex justify-center">
              <Image
                src="/images/kwooka_mascot_clean.png"
                alt="Kwooka Mascot"
                width={280}
                height={280}
                className="drop-shadow-2xl"
              />
            </div>
            
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold leading-tight">
                AI-Powered Compliance
                <br />
                <span className="text-kwooka-ochre">Made Simple</span>
              </h1>
              <p className="text-lg text-white/70 max-w-md mx-auto">
                Streamline your compliance management with intelligent document
                analysis, automated findings, and real-time insights.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Documents Analyzed', value: '50K+' },
                { label: 'Compliance Frameworks', value: '15+' },
                { label: 'Time Saved', value: '80%' },
                { label: 'Accuracy Rate', value: '99.2%' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-kwooka-ochre">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} Kwooka Health Services Ltd. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
