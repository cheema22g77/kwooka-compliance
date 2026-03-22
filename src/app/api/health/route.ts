// ============================================================================
// API: /api/health — System Health Check
// Checks: Supabase DB, Anthropic LLM, circuit breakers, DLQ, audit buffer
// Returns: { status: "healthy" | "degraded" | "unhealthy", checks: {...} }
// ============================================================================
import { NextResponse } from "next/server";
import { llmBreaker, dbBreaker, emailBreaker } from "@/lib/circuit-breaker";
import { eventBus } from "@/events/bus";
import { auditBuffer } from "@/lib/audit-trail";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

interface CheckResult {
  status: "pass" | "warn" | "fail";
  message: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // Run independent checks in parallel
  const [dbResult, llmResult] = await Promise.allSettled([
    checkSupabase(),
    checkAnthropic(),
  ]);

  checks.supabase =
    dbResult.status === "fulfilled"
      ? dbResult.value
      : { status: "fail", message: dbResult.reason?.message ?? "Unknown error" };

  checks.anthropic =
    llmResult.status === "fulfilled"
      ? llmResult.value
      : { status: "fail", message: llmResult.reason?.message ?? "Unknown error" };

  // Circuit breaker states (synchronous)
  checks.circuitBreakers = checkCircuitBreakers();

  // Dead letter queue depth (synchronous)
  checks.deadLetterQueue = checkDeadLetterQueue();

  // Audit buffer pending count (synchronous)
  checks.auditBuffer = checkAuditBuffer();

  // Derive overall status
  const allChecks = Object.values(checks);
  const hasFail = allChecks.some((c) => c.status === "fail");
  const hasWarn = allChecks.some((c) => c.status === "warn");

  const status = hasFail ? "unhealthy" : hasWarn ? "degraded" : "healthy";

  return NextResponse.json(
    { status, timestamp: new Date().toISOString(), checks },
    { status: status === "unhealthy" ? 503 : 200 }
  );
}

// ── Supabase DB connectivity ──
async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return { status: "fail", message: "Missing Supabase environment variables" };
    }

    const supabase = createClient(url, key);
    const { error } = await supabase.from("legislation_sources").select("id").limit(1);

    const durationMs = Date.now() - start;

    if (error) {
      return { status: "fail", message: error.message, durationMs };
    }

    return {
      status: durationMs > 3000 ? "warn" : "pass",
      message: durationMs > 3000 ? "Slow response" : "Connected",
      durationMs,
    };
  } catch (err: any) {
    return { status: "fail", message: err.message, durationMs: Date.now() - start };
  }
}

// ── Anthropic API availability (tiny Haiku call) ──
async function checkAnthropic(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { status: "fail", message: "Missing ANTHROPIC_API_KEY" };
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "Reply with just: ok" }],
    });

    const durationMs = Date.now() - start;

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return {
      status: durationMs > 5000 ? "warn" : "pass",
      message: durationMs > 5000 ? "Slow response" : "Available",
      durationMs,
      details: {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (err: any) {
    return { status: "fail", message: err.message, durationMs: Date.now() - start };
  }
}

// ── Circuit breaker states ──
function checkCircuitBreakers(): CheckResult {
  const breakers = [llmBreaker, dbBreaker, emailBreaker];
  const metrics = breakers.map((b) => b.getMetrics());

  const openBreakers = metrics.filter((m) => m.state === "open");
  const halfOpenBreakers = metrics.filter((m) => m.state === "half_open");

  let status: CheckResult["status"] = "pass";
  let message = "All circuits closed";

  if (openBreakers.length > 0) {
    status = "fail";
    message = `Open: ${openBreakers.map((m) => m.serviceName).join(", ")}`;
  } else if (halfOpenBreakers.length > 0) {
    status = "warn";
    message = `Half-open: ${halfOpenBreakers.map((m) => m.serviceName).join(", ")}`;
  }

  return {
    status,
    message,
    details: Object.fromEntries(
      metrics.map((m) => [
        m.serviceName,
        {
          state: m.state,
          failureCount: m.failureCount,
          lastFailureTime: m.lastFailureTime
            ? new Date(m.lastFailureTime).toISOString()
            : null,
        },
      ])
    ),
  };
}

// ── Dead letter queue depth ──
function checkDeadLetterQueue(): CheckResult {
  const count = eventBus.getDeadLetterCount();

  if (count === 0) {
    return { status: "pass", message: "Empty", details: { depth: 0 } };
  }

  if (count <= 5) {
    return {
      status: "warn",
      message: `${count} entries pending retry`,
      details: { depth: count },
    };
  }

  return {
    status: "fail",
    message: `${count} entries — investigate failures`,
    details: { depth: count },
  };
}

// ── Audit buffer pending count ──
function checkAuditBuffer(): CheckResult {
  const pending = auditBuffer.getPendingCount();

  if (pending === 0) {
    return { status: "pass", message: "Empty", details: { pending: 0 } };
  }

  if (pending < 15) {
    return {
      status: "pass",
      message: `${pending} entries buffered`,
      details: { pending },
    };
  }

  return {
    status: "warn",
    message: `${pending} entries — nearing flush threshold`,
    details: { pending },
  };
}
