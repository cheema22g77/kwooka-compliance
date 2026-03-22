// ============================================================================
// LIB: Billing — Stripe Subscription Management
// 3 tiers: Starter ($99), Professional ($299), Enterprise ($599)
// Pattern: Gold's billing module
// ============================================================================
import type { SubscriptionTier } from "@/core/value-objects";

export type BillingInterval = "monthly" | "annual";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "paused";

export interface Plan {
  readonly tier: SubscriptionTier;
  readonly name: string;
  readonly description: string;
  readonly monthlyPriceCents: number;
  readonly annualPriceCents: number;
  readonly features: readonly string[];
  readonly maxUsers: number;
  readonly maxSectors: number;
  readonly aiAgentCalls: number; // per month
  readonly includesAuditReports: boolean;
  readonly includesApiAccess: boolean;
  readonly includesBulkAnalysis: boolean;
  readonly includesCustomPlaybooks: boolean;
  readonly includesWebhooks: boolean;
}

export const PLANS: Record<SubscriptionTier, Plan> = {
  starter: {
    tier: "starter",
    name: "Starter",
    description: "For small organisations getting started with compliance",
    monthlyPriceCents: 9900, // $99/mo
    annualPriceCents: 99000, // $990/yr ($82.50/mo effective)
    features: [
      "1 compliance sector",
      "Document analysis",
      "Compliance findings tracking",
      "Sector-specific playbook",
      "AI compliance copilot",
      "Compliance calendar",
      "7-year document retention",
      "Email support",
    ],
    maxUsers: 3,
    maxSectors: 1,
    aiAgentCalls: 100,
    includesAuditReports: false,
    includesApiAccess: false,
    includesBulkAnalysis: false,
    includesCustomPlaybooks: false,
    includesWebhooks: false,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    description: "For growing organisations managing multiple compliance areas",
    monthlyPriceCents: 29900, // $299/mo
    annualPriceCents: 299000, // $2,990/yr ($249.17/mo effective)
    features: [
      "Everything in Starter",
      "Up to 3 compliance sectors",
      "Full audit-ready PDF reports",
      "Bulk document analysis",
      "Evidence vault with coverage mapping",
      "Compliance program versioning",
      "Legislation change monitoring",
      "Priority support",
    ],
    maxUsers: 15,
    maxSectors: 3,
    aiAgentCalls: 500,
    includesAuditReports: true,
    includesApiAccess: false,
    includesBulkAnalysis: true,
    includesCustomPlaybooks: false,
    includesWebhooks: false,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "For large organisations with comprehensive compliance needs",
    monthlyPriceCents: 59900, // $599/mo
    annualPriceCents: 599000, // $5,990/yr ($499.17/mo effective)
    features: [
      "Everything in Professional",
      "All 6 compliance sectors",
      "Unlimited AI agent calls",
      "Full API access + webhooks",
      "Custom playbooks",
      "DOCX report export",
      "Multi-user RBAC",
      "Dedicated account manager",
      "SOC 2 compliance documentation",
    ],
    maxUsers: Infinity,
    maxSectors: 6,
    aiAgentCalls: Infinity,
    includesAuditReports: true,
    includesApiAccess: true,
    includesBulkAnalysis: true,
    includesCustomPlaybooks: true,
    includesWebhooks: true,
  },
};

/** Check if an org can add another sector */
export function canAddSector(
  tier: SubscriptionTier,
  currentSectorCount: number
): boolean {
  return currentSectorCount < PLANS[tier].maxSectors;
}

/** Check if an org has remaining agent calls */
export function hasAgentCallsRemaining(
  tier: SubscriptionTier,
  usedThisMonth: number
): boolean {
  const limit = PLANS[tier].aiAgentCalls;
  return limit === Infinity || usedThisMonth < limit;
}

/** Check if a feature is available on a tier */
export function isFeatureAvailable(
  tier: SubscriptionTier,
  feature: keyof Pick<Plan,
    "includesAuditReports" | "includesApiAccess" |
    "includesBulkAnalysis" | "includesCustomPlaybooks" | "includesWebhooks"
  >
): boolean {
  return PLANS[tier][feature];
}

/** Get the effective monthly price for display */
export function getEffectiveMonthlyPrice(
  tier: SubscriptionTier,
  interval: BillingInterval
): number {
  const plan = PLANS[tier];
  if (interval === "monthly") return plan.monthlyPriceCents;
  return Math.round(plan.annualPriceCents / 12);
}

/** Format price for display (AUD) */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Get Stripe price ID mapping (configured via env vars in production) */
export function getStripePriceId(
  tier: SubscriptionTier,
  interval: BillingInterval
): string {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key] ?? `price_${tier}_${interval}_placeholder`;
}
