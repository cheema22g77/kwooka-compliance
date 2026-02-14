# Kwooka Compliance System

AI-powered compliance management platform for Australian businesses.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## Features

- 🔐 Authentication (signup, login, password reset)
- 📊 Dashboard with compliance metrics
- 📄 Document management with AI analysis
- ⚠️ Findings tracking and management
- 🎯 Compliance framework progress tracking
- ⚙️ User and company settings
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account and project

### 1. Clone and Install

```bash
cd kwooka-compliance
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 3. Environment Setup

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Setup

1. Go to your Supabase project's SQL Editor
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`

This will create all necessary tables, RLS policies, and seed data.

### 5. Enable Email Auth

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates as needed

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
kwooka-compliance/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── reset-password/
│   │   ├── dashboard/         # Protected dashboard pages
│   │   │   ├── documents/
│   │   │   ├── findings/
│   │   │   └── settings/
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   │   ├── header.tsx
│   │   │   └── sidebar.tsx
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                  # Custom React hooks
│   │   └── use-auth.ts        # Authentication hook
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   └── utils.ts           # Utility functions
│   └── types/
│       └── database.ts        # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
├── middleware.ts              # Next.js middleware (auth)
└── tailwind.config.ts         # Tailwind configuration
```

## Authentication Flow

1. Users sign up with email/password
2. Email verification sent automatically
3. After verification, users can log in
4. Protected routes redirect to login if not authenticated
5. Authenticated users are redirected away from auth pages

## Database Schema

### Tables

- **profiles**: User profile data (extends Supabase auth)
- **documents**: Uploaded compliance documents
- **findings**: Compliance issues/findings
- **compliance_frameworks**: Supported frameworks
- **user_compliance_progress**: User's progress per framework
- **activity_log**: Audit trail
- **notifications**: User notifications

### Row Level Security

All tables have RLS enabled. Users can only access their own data.

## Brand Colors

- **Ochre**: `#C4621A` - Primary brand color
- **Rust**: `#8B4513` - Secondary accent
- **Sand**: `#D4A574` - Light accent
- **Sage**: `#87A878` - Success/nature tones
- **Charcoal**: `#2D3436` - Dark backgrounds
- **Cream**: `#FDF6E9` - Light backgrounds

## Next Steps

After setup, you can:

1. Add AI document analysis integration
2. Implement file upload to Supabase Storage
3. Add real-time notifications
4. Build reporting/export features
5. Integrate compliance framework APIs

## License

Proprietary - Kwooka Health Services Ltd
