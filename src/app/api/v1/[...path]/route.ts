// ============================================================================
// PUBLIC API GATEWAY: /api/v1/*
// Authenticates via Bearer kw_live_... header
// Checks enterprise tier, rate limits per key, routes to handlers
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { isFeatureAvailable } from "@/lib/billing";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getServiceClient } from "@/adapters/database/auth";
import type { SubscriptionTier } from "@/core/value-objects";

export const maxDuration = 60;

// Rate limit for API keys: 60 requests per minute
const API_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, await params);
}

async function handleRequest(
  request: NextRequest,
  { path }: { path: string[] },
) {
  // 1. Extract API key from Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer kw_live_")) {
    return NextResponse.json(
      { error: "Missing or invalid API key. Use: Authorization: Bearer kw_live_..." },
      { status: 401 },
    );
  }

  const rawKey = authHeader.slice("Bearer ".length);

  // 2. Validate key against database
  const supabase = getServiceClient();
  const keyRecord = await validateApiKey(rawKey, supabase);

  if (!keyRecord) {
    return NextResponse.json(
      { error: "Invalid or revoked API key" },
      { status: 401 },
    );
  }

  // 3. Check org tier — API access requires enterprise
  const { data: org } = await supabase
    .from("organisations")
    .select("id, tier")
    .eq("id", keyRecord.orgId)
    .single();

  if (!org) {
    return NextResponse.json(
      { error: "Organisation not found" },
      { status: 404 },
    );
  }

  const tier = (org.tier ?? "starter") as SubscriptionTier;
  if (!isFeatureAvailable(tier, "includesApiAccess")) {
    return NextResponse.json(
      { error: "API access requires an Enterprise plan. Please upgrade at /dashboard/billing." },
      { status: 403 },
    );
  }

  // 4. Rate limit per API key
  const rateLimitKey = `apikey:${keyRecord.id}`;
  const rateCheck = checkRateLimit(rateLimitKey, "search"); // reuse search config (60/min)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and retry." },
      { status: 429, headers: rateCheck.headers },
    );
  }

  // 5. Route to internal handlers
  const route = path.join("/");

  switch (route) {
    case "health":
      return NextResponse.json({
        status: "ok",
        orgId: keyRecord.orgId,
        tier,
        timestamp: new Date().toISOString(),
      });

    case "analyse":
    case "analyze": {
      // Proxy to internal analyze endpoint
      const body = await request.json().catch(() => null);
      if (!body?.documentContent) {
        return NextResponse.json(
          { error: "documentContent is required" },
          { status: 400 },
        );
      }
      const internalUrl = new URL("/api/analyze", request.url);
      const internalResponse = await fetch(internalUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key-Org": keyRecord.orgId,
        },
        body: JSON.stringify({
          ...body,
          userId: keyRecord.orgId, // Use orgId as userId for API access
        }),
      });
      const result = await internalResponse.json();
      return NextResponse.json(result, { status: internalResponse.status });
    }

    case "search": {
      const body = await request.json().catch(() => null);
      if (!body?.query) {
        return NextResponse.json(
          { error: "query is required" },
          { status: 400 },
        );
      }
      const internalUrl = new URL("/api/search", request.url);
      const internalResponse = await fetch(internalUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key-Org": keyRecord.orgId,
        },
        body: JSON.stringify(body),
      });
      const result = await internalResponse.json();
      return NextResponse.json(result, { status: internalResponse.status });
    }

    default:
      return NextResponse.json(
        {
          error: `Unknown endpoint: /api/v1/${route}`,
          available: ["health", "analyse", "search"],
        },
        { status: 404 },
      );
  }
}
