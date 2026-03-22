// ============================================================================
// API: /api/portal/auth — Authenticate portal users via invite token
// POST: validate token → set portal session cookie → return org context
// GET: check current portal session
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/adapters/database/auth";
import { getPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";

const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

// POST: Authenticate with invite token
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: invite, error } = await supabase
    .from("portal_invites")
    .select("id, org_id, email, org_name, expires_at, revoked_at")
    .eq("token", token)
    .is("revoked_at", null)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 401 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 401 });
  }

  const session = {
    orgId: invite.org_id,
    email: invite.email,
    orgName: invite.org_name || "Organisation",
    expiresAt: invite.expires_at,
  };

  const sessionValue = Buffer.from(JSON.stringify(session)).toString("base64");

  const response = NextResponse.json({
    success: true,
    orgName: session.orgName,
    email: session.email,
  });

  response.cookies.set(PORTAL_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/portal",
  });

  return response;
}

// GET: Check current portal session
export async function GET(request: NextRequest) {
  const session = getPortalSession(request);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    orgId: session.orgId,
    orgName: session.orgName,
    email: session.email,
  });
}
