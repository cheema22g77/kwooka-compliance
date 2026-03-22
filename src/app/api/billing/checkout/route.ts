/**
 * /api/billing/checkout — Create a Stripe Checkout session
 *
 * Body: { tier: "starter"|"professional"|"enterprise", interval: "monthly"|"annual" }
 * Returns: { url: string } — redirect the user to this URL
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, AuthError, getServiceClient } from "@/adapters/database/auth";
import { PLANS, getStripePriceId, type BillingInterval } from "@/lib/billing";
import type { SubscriptionTier } from "@/core/value-objects";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tier, interval = "monthly" } = body as {
    tier?: string;
    interval?: string;
  };

  if (!tier || !PLANS[tier as SubscriptionTier]) {
    return NextResponse.json(
      { error: "Invalid tier. Must be: starter, professional, or enterprise" },
      { status: 400 }
    );
  }

  if (interval !== "monthly" && interval !== "annual") {
    return NextResponse.json(
      { error: "Invalid interval. Must be monthly or annual" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const supabase = getServiceClient();

    // Look up or create Stripe customer
    let customerId: string | undefined;

    const { data: org } = await supabase
      .from("organisations")
      .select("id, name")
      .eq("id", (
        await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .single()
      ).data?.org_id)
      .single();

    // Check if customer already exists in Stripe (stored in org metadata)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .single();

    // Search for existing Stripe customer by email
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0]!.id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: {
          user_id: user.id,
          org_id: org?.id ?? "",
        },
      });
      customerId = customer.id;
    }

    const priceId = getStripePriceId(
      tier as SubscriptionTier,
      interval as BillingInterval
    );

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true&tier=${tier}`,
      cancel_url: `${origin}/dashboard/billing?cancelled=true`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          org_id: org?.id ?? "",
          tier,
        },
      },
      metadata: {
        user_id: user.id,
        org_id: org?.id ?? "",
        tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
