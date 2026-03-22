// ============================================================================
// LIB: Portal Session — read portal session from cookie
// ============================================================================
import { NextRequest } from "next/server";

const PORTAL_COOKIE = "portal_session";

export interface PortalSession {
  orgId: string;
  email: string;
  orgName: string;
  expiresAt: string;
}

export function getPortalSession(request: NextRequest): PortalSession | null {
  const cookie = request.cookies.get(PORTAL_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const session = JSON.parse(Buffer.from(cookie, "base64").toString("utf-8")) as PortalSession;

    if (new Date(session.expiresAt) < new Date()) return null;

    return session;
  } catch {
    return null;
  }
}

export { PORTAL_COOKIE };
