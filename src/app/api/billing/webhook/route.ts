/**
 * /api/billing/webhook — Stripe Webhook Handler
 *
 * Handles subscription lifecycle events and updates org tier in Supabase.
 *
 * Events handled:
 *   - checkout.session.completed → set tier on org
 *   - customer.subscription.updated → update tier on plan change
 *   - customer.subscription.deleted → downgrade to starter
 *   - invoice.payment_failed → log warning (could trigger notification)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/adapters/database/auth";
import type { SubscriptionTier } from "@/core/value-objects";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

const TIER_FROM_PRICE: Record<string, SubscriptionTier> = {};

function buildPriceTierMap() {
  // Build the lookup from env vars at runtime
  for (const tier of ["starter", "professional", "enterprise"] as const) {
    for (const interval of ["monthly", "annual"] as const) {
      const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
      const priceId = process.env[key];
      if (priceId) {
        TIER_FROM_PRICE[priceId] = tier;
      }
    }
  }
}

function tierFromSubscription(subscription: Stripe.Subscription): SubscriptionTier {
  buildPriceTierMap();

  for (const item of subscription.items.data) {
    const priceId = typeof item.price === "string" ? item.price : item.price.id;
    if (TIER_FROM_PRICE[priceId]) {
      return TIER_FROM_PRICE[priceId]!;
    }
  }
  return "starter";
}

async function updateOrgTier(orgId: string, tier: SubscriptionTier) {
  if (!orgId) return;
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("organisations")
    .update({ tier })
    .eq("id", orgId);

  if (error) {
    console.error(`Failed to update org ${orgId} to tier ${tier}:`, error);
  }
}

async function findOrgIdFromCustomer(customerId: string): Promise<string | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer.metadata?.org_id as string) || null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const tier = session.metadata?.tier as SubscriptionTier | undefined;

        if (orgId && tier) {
          await updateOrgTier(orgId, tier);
          console.log(`Checkout complete: org ${orgId} → ${tier}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId =
          subscription.metadata?.org_id ??
          (await findOrgIdFromCustomer(
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id
          ));

        if (orgId) {
          const newTier = tierFromSubscription(subscription);
          await updateOrgTier(orgId, newTier);
          console.log(`Subscription updated: org ${orgId} → ${newTier}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId =
          subscription.metadata?.org_id ??
          (await findOrgIdFromCustomer(
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id
          ));

        if (orgId) {
          await updateOrgTier(orgId, "starter");
          console.log(`Subscription cancelled: org ${orgId} → starter`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          const orgId = await findOrgIdFromCustomer(customerId);
          console.warn(
            `Payment failed for org ${orgId ?? "unknown"}, customer ${customerId}`
          );
          // TODO: send notification to org admins
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge but ignore
        break;
    }
  } catch (error: any) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    // Return 200 anyway to prevent Stripe retrying indefinitely
  }

  return NextResponse.json({ received: true });
}
