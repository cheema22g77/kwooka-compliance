"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PLANS,
  formatPrice,
  getEffectiveMonthlyPrice,
  type BillingInterval,
} from "@/lib/billing";
import type { SubscriptionTier } from "@/core/value-objects";
import {
  Check,
  CreditCard,
  Zap,
  Building2,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";

const TIER_ORDER: SubscriptionTier[] = ["starter", "professional", "enterprise"];

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  professional: <CreditCard className="h-5 w-5" />,
  enterprise: <Building2 className="h-5 w-5" />,
};

// In production this would come from fetching the org's current subscription.
// For now we read from a query param or default to starter.
function useCurrentPlan(): {
  tier: SubscriptionTier;
  status: string;
  loading: boolean;
} {
  // TODO: Replace with real API call to fetch org subscription
  return { tier: "starter", status: "active", loading: false };
}

export default function BillingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { tier: currentTier, status, loading } = useCurrentPlan();

  // Check for success/cancelled query params (from Stripe redirect)
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const checkoutSuccess = params?.get("success") === "true";
  const checkoutCancelled = params?.get("cancelled") === "true";

  async function handleCheckout(tier: SubscriptionTier) {
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoadingTier(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
      }
    } catch (err) {
      console.error("Portal failed:", err);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Billing & Subscription
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your Kwooka Compliance subscription plan
        </p>
      </div>

      {/* Success / Cancelled banners */}
      {checkoutSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Subscription activated successfully!
            </span>
          </CardContent>
        </Card>
      )}
      {checkoutCancelled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <X className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Checkout was cancelled. No changes were made.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Current plan summary */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-slate-50">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900">
                {PLANS[currentTier].name}
              </span>
              <Badge variant="success">{status}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {formatPrice(PLANS[currentTier].monthlyPriceCents)}/month
              &middot; {PLANS[currentTier].maxSectors} sector
              {PLANS[currentTier].maxSectors !== 1 ? "s" : ""} &middot;{" "}
              {PLANS[currentTier].aiAgentCalls === Infinity
                ? "Unlimited"
                : PLANS[currentTier].aiAgentCalls}{" "}
              AI calls/mo
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handlePortal}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            interval === "monthly"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          onClick={() => setInterval("monthly")}
        >
          Monthly
        </button>
        <button
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            interval === "annual"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          onClick={() => setInterval("annual")}
        >
          Annual
          <span className="ml-1.5 text-xs text-green-600 font-semibold">
            Save ~17%
          </span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIER_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = tier === currentTier;
          const isPopular = tier === "professional";
          const effectiveMonthly = getEffectiveMonthlyPrice(tier, interval);

          return (
            <Card
              key={tier}
              className={cn(
                "relative flex flex-col",
                isPopular && "border-kwooka-ochre shadow-lg",
                isCurrent && "ring-2 ring-kwooka-ochre/40"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-kwooka-ochre text-white border-0 shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-slate-600">
                  {TIER_ICONS[tier]}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                {/* Price */}
                <div>
                  <span className="text-3xl font-bold text-slate-900">
                    {formatPrice(effectiveMonthly)}
                  </span>
                  <span className="text-slate-500 text-sm">/month</span>
                  {interval === "annual" && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Billed {formatPrice(plan.annualPriceCents)}/year
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    {plan.maxUsers === Infinity ? "Unlimited" : plan.maxUsers}{" "}
                    users
                  </Badge>
                  <Badge variant="outline">
                    {plan.maxSectors} sector{plan.maxSectors !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline">
                    {plan.aiAgentCalls === Infinity
                      ? "Unlimited"
                      : plan.aiAgentCalls}{" "}
                    AI calls
                  </Badge>
                </div>

                {/* Feature list */}
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "w-full",
                      isPopular
                        ? ""
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                    onClick={() => handleCheckout(tier)}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === tier ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier)
                      ? "Upgrade"
                      : "Downgrade"}{" "}
                    to {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQ / contact */}
      <Card>
        <CardContent className="p-6 text-center text-sm text-slate-500">
          <p>
            All plans include a 14-day free trial. No credit card required to
            start.
          </p>
          <p className="mt-1">
            Need a custom plan for your organisation?{" "}
            <a
              href="mailto:compliance@kwooka.com.au"
              className="text-kwooka-ochre font-medium hover:underline"
            >
              Contact our team
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
