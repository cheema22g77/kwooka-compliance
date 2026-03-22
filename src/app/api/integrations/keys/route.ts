// ============================================================================
// API: /api/integrations/keys — CRUD for API keys
// GET: list keys for the authenticated user's org
// POST: create a new key
// DELETE: revoke a key
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/adapters/database/auth";
import { getServiceClient } from "@/adapters/database/auth";
import { generateApiKey, maskApiKey } from "@/lib/api-keys";
import { isFeatureAvailable } from "@/lib/billing";
import type { SubscriptionTier } from "@/core/value-objects";

const MAX_KEYS_PER_ORG = 10;

// GET: List all keys for the user's org
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Get user's org
  const orgId = await getUserOrgId(supabase, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, last_used_at, created_at, revoked_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }

  return NextResponse.json({
    keys: (keys ?? []).map((k: any) => ({
      id: k.id,
      name: k.name,
      lastUsedAt: k.last_used_at,
      createdAt: k.created_at,
      revokedAt: k.revoked_at,
      isActive: !k.revoked_at,
    })),
  });
}

// POST: Create a new API key
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Get user's org + tier
  const orgId = await getUserOrgId(supabase, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  // Check tier
  const tier = await getOrgTier(supabase, orgId);
  if (!isFeatureAvailable(tier, "includesApiAccess")) {
    return NextResponse.json(
      { error: "API access requires an Enterprise plan" },
      { status: 403 },
    );
  }

  // Check key count limit
  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("revoked_at", null);

  if ((count ?? 0) >= MAX_KEYS_PER_ORG) {
    return NextResponse.json(
      { error: `Maximum ${MAX_KEYS_PER_ORG} active keys per organisation` },
      { status: 400 },
    );
  }

  // Parse body
  const body = await request.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  }

  // Generate key
  const { rawKey, keyHash } = generateApiKey();

  const { error: insertError } = await supabase
    .from("api_keys")
    .insert({
      org_id: orgId,
      key_hash: keyHash,
      name,
    });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }

  return NextResponse.json({
    key: rawKey,
    name,
    message: "Store this key securely — it will not be shown again.",
  }, { status: 201 });
}

// DELETE: Revoke a key
export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const orgId = await getUserOrgId(supabase, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const keyId = body.keyId;
  if (!keyId) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Key revoked" });
}

// Helpers

async function getUserOrgId(supabase: any, userId: string): Promise<string | null> {
  // Try org_members first
  const { data: member } = await supabase
    .from("org_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (member) return member.organisation_id;

  // Fallback: use userId as orgId (single-user mode)
  return userId;
}

async function getOrgTier(supabase: any, orgId: string): Promise<SubscriptionTier> {
  const { data } = await supabase
    .from("organisations")
    .select("tier")
    .eq("id", orgId)
    .single();

  return (data?.tier as SubscriptionTier) ?? "starter";
}
