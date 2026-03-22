// ============================================================================
// API: /api/integrations/webhooks — CRUD for webhook endpoints
// GET: list, POST: create, PUT: update, DELETE: remove
// Gated behind enterprise tier (includesWebhooks)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getServiceClient } from "@/adapters/database/auth";
import { isFeatureAvailable } from "@/lib/billing";
import { ALL_EVENT_TYPES } from "@/events/types";
import type { SubscriptionTier } from "@/core/value-objects";
import { randomBytes } from "crypto";

const MAX_WEBHOOKS_PER_ORG = 5;

// GET: List webhook endpoints
export async function GET(request: NextRequest) {
  const ctx = await getOrgContext(request);
  if ("error" in ctx) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("webhook_endpoints")
    .select("id, url, events, active, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }

  return NextResponse.json({
    webhooks: (data ?? []).map((w: any) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      createdAt: w.created_at,
    })),
    availableEvents: ALL_EVENT_TYPES,
  });
}

// POST: Create a new webhook endpoint
export async function POST(request: NextRequest) {
  const ctx = await getOrgContext(request);
  if ("error" in ctx) return ctx.error;

  // Feature gate
  if (!isFeatureAvailable(ctx.tier, "includesWebhooks")) {
    return NextResponse.json(
      { error: "Webhooks require an Enterprise plan" },
      { status: 403 },
    );
  }

  // Check limit
  const { count } = await ctx.supabase
    .from("webhook_endpoints")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId);

  if ((count ?? 0) >= MAX_WEBHOOKS_PER_ORG) {
    return NextResponse.json(
      { error: `Maximum ${MAX_WEBHOOKS_PER_ORG} webhook endpoints per organisation` },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { url, events = [] } = body;

  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Validate event types
  for (const evt of events) {
    if (!ALL_EVENT_TYPES.includes(evt)) {
      return NextResponse.json({ error: `Unknown event type: ${evt}` }, { status: 400 });
    }
  }

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;

  const { data, error } = await ctx.supabase
    .from("webhook_endpoints")
    .insert({
      org_id: ctx.orgId,
      url: url.trim(),
      secret,
      events,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    secret,
    message: "Store the signing secret securely — it will not be shown again.",
  }, { status: 201 });
}

// PUT: Update a webhook endpoint
export async function PUT(request: NextRequest) {
  const ctx = await getOrgContext(request);
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const { id, url, events, active } = body;

  if (!id) {
    return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (url !== undefined) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
      }
      updates.url = url.trim();
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }
  if (events !== undefined) updates.events = events;
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("webhook_endpoints")
    .update(updates)
    .eq("id", id)
    .eq("org_id", ctx.orgId);

  if (error) {
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove a webhook endpoint
export async function DELETE(request: NextRequest) {
  const ctx = await getOrgContext(request);
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── Helpers ──

type OrgContext = { orgId: string; tier: SubscriptionTier; supabase: any };
type OrgContextResult = OrgContext | { error: NextResponse };

async function getOrgContext(request: NextRequest): Promise<OrgContextResult> {
  let user;
  try {
    user = await requireAuth(request);
  } catch {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const supabase = getServiceClient();

  // Get org
  const { data: member } = await supabase
    .from("org_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const orgId = member?.organisation_id ?? user.id;

  // Get tier
  const { data: org } = await supabase
    .from("organisations")
    .select("tier")
    .eq("id", orgId)
    .single();

  const tier = (org?.tier as SubscriptionTier) ?? "starter";

  return { orgId, tier, supabase };
}
