/**
 * /api/billing/portal — Create a Stripe Customer Portal session
 *
 * Lets users manage their subscription (change plan, update payment, cancel).
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, AuthError } from "@/adapters/database/auth";

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

  try {
    const stripe = getStripe();

    // Find the Stripe customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe to a plan first." },
        { status: 404 }
      );
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0]!.id,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
