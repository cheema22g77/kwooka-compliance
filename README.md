# Kwooka Compliance

AI-powered compliance management platform for Australian regulated industries. Built by Kwooka Health Services Ltd — an Aboriginal-owned enterprise, Supply Nation certified, based in Perth, Western Australia.

**Live:** [kwooka-compliance-main.vercel.app](https://kwooka-compliance-main.vercel.app)

## Overview

Kwooka Compliance analyses policies, procedures, and evidence documents against Australian regulatory requirements across 6 sectors. It uses a multi-agent AI architecture with guardrails, reflection, and memory to deliver audit-ready compliance scoring, findings tracking, and remediation planning.

### Sectors Covered

| Sector | Regulations | Authority |
|--------|------------|-----------|
| NDIS | Practice Standards, Code of Conduct | NDIS Quality & Safeguards Commission |
| Transport | Heavy Vehicle National Law, Chain of Responsibility | NHVR |
| Healthcare | NSQHS Standards | Australian Commission on Safety & Quality |
| Aged Care | Aged Care Quality Standards, SIRS | Aged Care Quality & Safety Commission |
| Workplace | WHS Act & Regulations | WorkSafe / SafeWork Australia |
| Construction | WHS Construction Regs, High Risk Work | WorkSafe WA |

## Architecture

The platform follows a hexagonal (ports & adapters) architecture inspired by Anthropic's Gold pattern, organised in concentric rings:

```
Ring 1  Value Objects       Pure types, branded IDs, domain primitives (zero imports)
Ring 2  Outbound Ports      12 interfaces (ILLMPort, IAssessmentRepo, IBillingPort, etc.)
Ring 3  Domain Events       30+ immutable events, EventBus with DLQ, fan-out handlers
Ring 4  Adapters            Anthropic LLM, Supabase DB, Stripe billing
Ring 5  Agents              8 AI agents extending BaseAgent (LLM → guardrails → reflection)
Ring 5.5 Agent Memory       Store/recall past runs by reflection score for context injection
Ring 6  Guardrails          4-layer pipeline: Schema → Grounding → Business Rules → Safety
Ring 7  Intelligence        Orchestrator, intent classifier, context gatherer, quality monitor
Ring 8  API Routes          27 endpoints, public API gateway, client portal
```

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Anthropic Claude (Sonnet for generation, Haiku for classification)
- **Billing:** Stripe (3 tiers)
- **Styling:** Tailwind CSS + shadcn/ui + Radix UI
- **Testing:** Vitest (267 tests across 10 suites)
- **Deployment:** Vercel

## Project Structure

```
src/
├── core/                          # Ring 1 — Value objects, entities, rules, errors
│   └── value-objects/             # Branded types, ABN, SectorId, FindingStatus, etc.
│
├── ports/                         # Ring 2 — Outbound port interfaces
│   └── outbound/                  # ILLMPort, IAssessmentRepo, IBillingPort, etc.
│
├── events/                        # Ring 3 — Domain events
│   ├── types/                     # 30+ event type definitions
│   ├── bus/                       # EventBus with DLQ, persistence, fan-out
│   └── handlers/                  # Wire events to notifications, risk, audit, webhooks
│
├── adapters/                      # Ring 4 — External service adapters
│   ├── llm/anthropic.ts           # AnthropicLLMAdapter (implements ILLMPort)
│   └── database/                  # Auth, analysis repo, findings repo, notifications
│
├── agents/                        # Ring 5 — AI agents
│   ├── base-agent.ts              # Abstract base: LLM calls, guardrails, reflection, memory
│   ├── compliance-analyser.ts     # Document analysis against sector regulations
│   ├── copilot-agent.ts           # Streaming chat with orchestrator delegation
│   ├── policy-generator.ts        # AI-powered policy drafting
│   ├── findings-assessor.ts       # Finding severity and remediation assessment
│   ├── legislation-monitor.ts     # Regulatory change impact analysis
│   ├── playbook-advisor.ts        # Compliance checklist recommendations
│   ├── report-drafter.ts          # Audit report generation
│   └── onboarding-agent.ts        # Business profile analysis
│
├── memory/                        # Ring 5.5 — Agent memory
│   └── agent-memory.ts            # IAgentMemory: store/recall by reflection score
│
├── guardrails/                    # Ring 6 — Safety pipeline
│   ├── index.ts                   # L1 Schema → L2 Grounding → L3 Business Rules → L4 Safety
│   └── validate-analysis.ts       # Analysis output validation and score clamping
│
├── intelligence/                  # Ring 7 — Copilot orchestration
│   ├── types.ts                   # CopilotIntent, ComputedContext, OrchestratorResult
│   ├── intent-classifier.ts       # Haiku-based intent classification (~100ms)
│   ├── context-gatherer.ts        # Sector config + RAG + user history assembly
│   ├── quality-monitor.ts         # Per-org response quality tracking
│   └── orchestrator.ts            # classify → gather → prompt → messages pipeline
│
├── lib/                           # Shared libraries
│   ├── api-keys/                  # kw_live_ key generation, SHA-256 hashing, validation
│   ├── webhooks/                  # HMAC-SHA256 signed delivery, retry, event matching
│   ├── billing/                   # Plan config, feature gating, pricing logic
│   ├── circuit-breaker/           # 3 breakers: LLM, DB, email (open/half-open/closed)
│   ├── audit-trail/               # Immutable audit entries, buffered batch writes
│   ├── versioning/                # Immutable document versioning engine
│   ├── rate-limiter.ts            # In-memory rate limiting per endpoint
│   ├── portal-session.ts          # Client portal cookie-based session
│   ├── rag/                       # Legislation search, chunking, BM25
│   ├── enhanced-rag-search.ts     # Multi-strategy RAG with query expansion
│   └── legislation-monitor.ts     # Regulatory change detection via content hashing
│
├── app/
│   ├── api/                       # 27 API routes
│   │   ├── health/                # System health check (DB, LLM, breakers, DLQ, audit)
│   │   ├── analyze/               # Document compliance analysis
│   │   ├── chat/                  # Streaming copilot chat (SSE)
│   │   ├── generate-policy/       # AI policy generation
│   │   ├── audit-report/          # Audit report generation
│   │   ├── search/                # Legislation RAG search
│   │   ├── v1/[...path]/          # Public API gateway (Bearer auth, enterprise tier)
│   │   ├── integrations/keys/     # API key CRUD
│   │   ├── integrations/webhooks/ # Webhook endpoint CRUD
│   │   ├── portal/auth/           # Client portal token authentication
│   │   ├── billing/               # Stripe checkout, portal, webhooks
│   │   ├── rag/                   # Ingest, search, query endpoints
│   │   └── cron/                  # Legislation change monitoring
│   │
│   ├── dashboard/                 # 18 dashboard pages
│   │   ├── page.tsx               # Compliance score overview
│   │   ├── analysis/              # Document analysis, bulk upload, history
│   │   ├── findings/              # Findings tracking and management
│   │   ├── documents/             # Document management + evidence mapping
│   │   ├── calendar/              # Compliance calendar and deadlines
│   │   ├── playbooks/             # Sector-specific compliance checklists
│   │   ├── generator/             # AI policy generator
│   │   ├── copilot/               # AI compliance chat
│   │   ├── integrations/          # API keys + webhook management
│   │   ├── billing/               # Subscription management
│   │   ├── settings/              # Profile, company, sectors, security
│   │   ├── legislation/           # Legislation monitoring dashboard
│   │   └── admin/                 # RAG admin tools
│   │
│   └── (portal)/portal/           # Client portal (read-only, separate auth)
│       ├── layout.tsx             # Branded layout with token-based login
│       ├── overview/              # Compliance score dashboard
│       ├── documents/             # Read-only document list with download
│       ├── findings/              # Findings status and remediation progress
│       └── reports/               # Downloadable audit reports
│
├── components/
│   ├── layout/                    # Header, sidebar
│   └── ui/                        # Card, Button, Badge, Input, Label, Dropdown, etc.
│
├── contexts/                      # React contexts
│   └── sector-context.tsx         # Multi-sector state management
│
└── hooks/
    └── use-auth.ts                # Authentication hook

tests/                             # 10 test suites, 267 tests
├── core.test.ts                   # Value objects, entities, business rules, errors
├── agents.test.ts                 # BaseAgent execution, retries, guardrails, reflection
├── guardrails.test.ts             # 4-layer pipeline, analysis validation
├── events.test.ts                 # EventBus pub/sub, DLQ, handlers
├── versioning.test.ts             # Immutable document versioning
├── billing.test.ts                # Plan limits, feature gating, pricing
├── memory.test.ts                 # Agent memory store/recall, deduplication
├── intelligence.test.ts           # Intent classification, context assembly, orchestrator
├── api-keys.test.ts               # Key generation, hashing, validation
└── webhooks.test.ts               # Signatures, event matching, retry, delivery

supabase/migrations/               # 8 migration files
├── 001_initial_schema.sql         # Base tables, RLS
├── 002_compliance_analyses.sql    # Analysis results
├── 003_v2_architecture.sql        # Orgs, agent_runs, event_log, audit_trail
├── 004_agent_memory.sql           # output_summary column + recall index
├── 005_api_keys.sql               # API key hashes
├── 006_portal_invites.sql         # Client portal tokens
├── 007_webhook_endpoints.sql      # Webhook subscriptions
└── 20250118_create_audit_logs.sql # Audit logs
```

## Key Features

### AI-Powered Analysis
- Upload any policy, procedure, or evidence document
- AI analyses against sector-specific Australian regulations
- Compliance score (0–100) with severity-rated findings
- Specific regulation references and remediation steps
- 4-layer guardrail pipeline prevents hallucinated regulations and legal advice

### 8 Specialised AI Agents
All agents inherit from `BaseAgent` with built-in retry, guardrails, reflection scoring, and memory:

| Agent | Purpose |
|-------|---------|
| ComplianceAnalyser | Document analysis against sector regulations |
| CopilotAgent | Streaming compliance chat with intent classification |
| PolicyGenerator | AI-powered policy drafting from templates |
| FindingsAssessor | Finding severity assessment and remediation |
| LegislationMonitor | Regulatory change impact analysis |
| PlaybookAdvisor | Compliance checklist recommendations |
| ReportDrafter | Audit-ready report generation |
| OnboardingAgent | Business profile and sector analysis |

### Agent Memory System
- Stores successful agent runs with reflection scores
- Recalls top-3 highest-scoring past runs for context injection
- Agents improve over time per organisation
- `IAgentMemory` interface with Supabase and in-memory adapters

### Intelligence Layer
- **Intent Classifier:** Haiku call (~100ms) classifies user messages into analysis/explanation/recommendation/general
- **Context Gatherer:** Assembles sector config + RAG results + user history
- **Quality Monitor:** Tracks per-org guardrail pass rates, intent distribution, response quality
- **Orchestrator:** Full pipeline: classify → gather → prompt → stream

### Guardrails Pipeline
4 layers, short-circuits on first failure:
1. **Schema:** Validates JSON structure per agent type
2. **Grounding:** Rejects fabricated regulations and suspicious section numbers
3. **Business Rules:** Risk/score consistency, valid severities and statuses
4. **Safety:** Blocks legal advice, regulator impersonation, compliance dismissal

### Public API (`/api/v1/`)
- Authentication via `kw_live_` prefixed API keys (SHA-256 hashed)
- Enterprise tier gate via `isFeatureAvailable`
- Rate limiting per key (60 req/min)
- Endpoints: `/v1/health`, `/v1/analyse`, `/v1/search`

### Webhooks
- HMAC-SHA256 signed POST delivery to registered URLs
- Event type filtering (30+ domain events or subscribe to all)
- 3 retries with exponential backoff (1s, 2s, 4s)
- Wired into EventBus global handler
- Dashboard UI with grouped event selector and signing secret management

### Client Portal (`/portal/`)
- Read-only compliance dashboard for external stakeholders
- Token-based authentication via `portal_invites` table
- Pages: Overview (score + stats), Documents (download), Findings (progress), Reports (audit packs)
- Branded with Kwooka mascot, no edit capabilities

### Infrastructure
- **Circuit Breakers:** 3 pre-configured (LLM, DB, email) with open/half-open/closed states
- **Event Bus:** Persist-first fan-out, dead letter queue with retry
- **Audit Trail:** Immutable entries with 47 action types, buffered batch writes
- **Rate Limiting:** Per-endpoint configurable limits
- **Health Check:** `/api/health` monitors DB, LLM, breakers, DLQ, audit buffer

### Billing (Stripe)

| Feature | Starter ($99/mo) | Professional ($299/mo) | Enterprise ($599/mo) |
|---------|:-:|:-:|:-:|
| Sectors | 1 | 3 | 6 |
| AI Agent Calls | 100/mo | 500/mo | Unlimited |
| Users | 3 | 15 | Unlimited |
| Audit Reports | - | Yes | Yes |
| Bulk Analysis | - | Yes | Yes |
| API Access | - | - | Yes |
| Webhooks | - | - | Yes |
| Custom Playbooks | - | - | Yes |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Anthropic API key

### Setup

```bash
git clone https://github.com/cheema22g77/kwooka-compliance.git
cd kwooka-compliance
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Run migrations in order (001 through 007) in Supabase SQL Editor.

```bash
npm run dev
```

### Testing

```bash
npm run test          # Run all 267 tests
npx vitest run        # Same, explicit
npx vitest --watch    # Watch mode
```

### Deployment

```bash
npx vercel --prod
```

## Brand

| Colour | Hex | Usage |
|--------|-----|-------|
| Ochre | `#C4621A` | Primary — buttons, active states, CTAs |
| Rust | `#8B4513` | Secondary accent |
| Sand | `#D4A574` | Light accent, score highlights |
| Sage | `#87A878` | Success, nature tones |
| Charcoal | `#2D3436` | Dark text, backgrounds |
| Cream | `#FDF6E9` | Light backgrounds |

## License

Proprietary — Kwooka Health Services Ltd. All rights reserved.

Aboriginal-Owned Enterprise. Supply Nation Certified. Perth, Western Australia.
