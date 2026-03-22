// ============================================================================
// TESTS: Billing — Plan limits, feature gating, pricing logic
// Pure logic tests — no Stripe or external services
// Run: npx vitest run tests/billing.test.ts
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  PLANS,
  canAddSector,
  hasAgentCallsRemaining,
  isFeatureAvailable,
  getEffectiveMonthlyPrice,
  formatPrice,
  getStripePriceId,
} from "../src/lib/billing";
import type { SubscriptionTier } from "../src/core/value-objects";

// ── Plan Configuration ──

describe("PLANS", () => {
  it("has all three tiers defined", () => {
    expect(Object.keys(PLANS)).toEqual(["starter", "professional", "enterprise"]);
  });

  it("starter is cheapest, enterprise is most expensive", () => {
    expect(PLANS.starter.monthlyPriceCents).toBeLessThan(PLANS.professional.monthlyPriceCents);
    expect(PLANS.professional.monthlyPriceCents).toBeLessThan(PLANS.enterprise.monthlyPriceCents);
  });

  it("annual pricing is cheaper per month than monthly", () => {
    for (const tier of ["starter", "professional", "enterprise"] as SubscriptionTier[]) {
      const monthlyRate = PLANS[tier].monthlyPriceCents;
      const annualMonthlyRate = Math.round(PLANS[tier].annualPriceCents / 12);
      expect(annualMonthlyRate).toBeLessThan(monthlyRate);
    }
  });

  it("enterprise has unlimited users and agent calls", () => {
    expect(PLANS.enterprise.maxUsers).toBe(Infinity);
    expect(PLANS.enterprise.aiAgentCalls).toBe(Infinity);
  });

  it("each plan has features array", () => {
    for (const tier of ["starter", "professional", "enterprise"] as SubscriptionTier[]) {
      expect(PLANS[tier].features.length).toBeGreaterThan(0);
    }
  });
});

// ── Sector Limits ──

describe("canAddSector", () => {
  it("starter allows 1 sector", () => {
    expect(canAddSector("starter", 0)).toBe(true);
    expect(canAddSector("starter", 1)).toBe(false);
  });

  it("professional allows up to 3 sectors", () => {
    expect(canAddSector("professional", 0)).toBe(true);
    expect(canAddSector("professional", 2)).toBe(true);
    expect(canAddSector("professional", 3)).toBe(false);
  });

  it("enterprise allows all 6 sectors", () => {
    expect(canAddSector("enterprise", 0)).toBe(true);
    expect(canAddSector("enterprise", 5)).toBe(true);
    expect(canAddSector("enterprise", 6)).toBe(false);
  });
});

// ── Agent Call Limits ──

describe("hasAgentCallsRemaining", () => {
  it("starter has 100 calls per month", () => {
    expect(hasAgentCallsRemaining("starter", 0)).toBe(true);
    expect(hasAgentCallsRemaining("starter", 99)).toBe(true);
    expect(hasAgentCallsRemaining("starter", 100)).toBe(false);
    expect(hasAgentCallsRemaining("starter", 150)).toBe(false);
  });

  it("professional has 500 calls per month", () => {
    expect(hasAgentCallsRemaining("professional", 499)).toBe(true);
    expect(hasAgentCallsRemaining("professional", 500)).toBe(false);
  });

  it("enterprise has unlimited calls", () => {
    expect(hasAgentCallsRemaining("enterprise", 0)).toBe(true);
    expect(hasAgentCallsRemaining("enterprise", 999999)).toBe(true);
  });
});

// ── Feature Gating ──

describe("isFeatureAvailable", () => {
  it("starter lacks audit reports, API, bulk analysis", () => {
    expect(isFeatureAvailable("starter", "includesAuditReports")).toBe(false);
    expect(isFeatureAvailable("starter", "includesApiAccess")).toBe(false);
    expect(isFeatureAvailable("starter", "includesBulkAnalysis")).toBe(false);
    expect(isFeatureAvailable("starter", "includesCustomPlaybooks")).toBe(false);
    expect(isFeatureAvailable("starter", "includesWebhooks")).toBe(false);
  });

  it("professional includes audit reports and bulk analysis", () => {
    expect(isFeatureAvailable("professional", "includesAuditReports")).toBe(true);
    expect(isFeatureAvailable("professional", "includesBulkAnalysis")).toBe(true);
  });

  it("professional lacks API access and webhooks", () => {
    expect(isFeatureAvailable("professional", "includesApiAccess")).toBe(false);
    expect(isFeatureAvailable("professional", "includesWebhooks")).toBe(false);
  });

  it("enterprise includes everything", () => {
    expect(isFeatureAvailable("enterprise", "includesAuditReports")).toBe(true);
    expect(isFeatureAvailable("enterprise", "includesApiAccess")).toBe(true);
    expect(isFeatureAvailable("enterprise", "includesBulkAnalysis")).toBe(true);
    expect(isFeatureAvailable("enterprise", "includesCustomPlaybooks")).toBe(true);
    expect(isFeatureAvailable("enterprise", "includesWebhooks")).toBe(true);
  });
});

// ── Pricing Logic ──

describe("getEffectiveMonthlyPrice", () => {
  it("returns monthly price for monthly interval", () => {
    expect(getEffectiveMonthlyPrice("starter", "monthly")).toBe(9900);
    expect(getEffectiveMonthlyPrice("professional", "monthly")).toBe(29900);
    expect(getEffectiveMonthlyPrice("enterprise", "monthly")).toBe(59900);
  });

  it("returns annual price / 12 for annual interval", () => {
    const starterAnnualMonthly = getEffectiveMonthlyPrice("starter", "annual");
    expect(starterAnnualMonthly).toBe(Math.round(99000 / 12));
    expect(starterAnnualMonthly).toBeLessThan(9900);
  });
});

describe("formatPrice", () => {
  it("formats whole dollar amounts without decimals", () => {
    expect(formatPrice(9900)).toBe("$99");
    expect(formatPrice(29900)).toBe("$299");
  });

  it("formats cents with two decimal places", () => {
    expect(formatPrice(9950)).toBe("$99.50");
    expect(formatPrice(8250)).toBe("$82.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0");
  });
});

describe("getStripePriceId", () => {
  it("returns placeholder when env var is not set", () => {
    const priceId = getStripePriceId("starter", "monthly");
    expect(priceId).toBe("price_starter_monthly_placeholder");
  });

  it("constructs correct env var key pattern", () => {
    // The function looks for STRIPE_PRICE_{TIER}_{INTERVAL}
    // Without env vars set, it falls back to placeholder
    expect(getStripePriceId("professional", "annual")).toBe(
      "price_professional_annual_placeholder",
    );
    expect(getStripePriceId("enterprise", "monthly")).toBe(
      "price_enterprise_monthly_placeholder",
    );
  });
});

// ── Tier Progression ──

describe("tier progression", () => {
  it("higher tiers always have more sectors", () => {
    expect(PLANS.starter.maxSectors).toBeLessThan(PLANS.professional.maxSectors);
    expect(PLANS.professional.maxSectors).toBeLessThan(PLANS.enterprise.maxSectors);
  });

  it("higher tiers always have more users", () => {
    expect(PLANS.starter.maxUsers).toBeLessThan(PLANS.professional.maxUsers);
    expect(PLANS.professional.maxUsers).toBeLessThan(PLANS.enterprise.maxUsers);
  });

  it("higher tiers always have more agent calls", () => {
    expect(PLANS.starter.aiAgentCalls).toBeLessThan(PLANS.professional.aiAgentCalls);
    expect(PLANS.professional.aiAgentCalls).toBeLessThan(PLANS.enterprise.aiAgentCalls);
  });

  it("enterprise is a strict superset of professional features", () => {
    const boolFeatures = [
      "includesAuditReports",
      "includesApiAccess",
      "includesBulkAnalysis",
      "includesCustomPlaybooks",
      "includesWebhooks",
    ] as const;

    for (const feature of boolFeatures) {
      if (PLANS.professional[feature]) {
        expect(PLANS.enterprise[feature]).toBe(true);
      }
    }
  });
});
