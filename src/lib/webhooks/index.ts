// ============================================================================
// LIB: Webhook Manager — HMAC-SHA256 signed webhook delivery with retry
// Dispatches domain events to registered endpoints
// ============================================================================
import { createHmac } from "crypto";
import type { AnyDomainEvent } from "@/events/types";

// === Types ===

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: string[];    // event types to subscribe to, empty = all
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  endpointId: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  error: string | null;
  deliveredAt: string;
}

export interface WebhookPayload {
  id: string;
  type: string;
  orgId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

// === Signature Generation ===

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 * Header: X-Kwooka-Signature: sha256=<hex>
 */
export function signPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Verify a webhook signature against the payload and secret.
 */
export function verifySignature(body: string, secret: string, signature: string): boolean {
  const expected = signPayload(body, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// === Event Matching ===

/**
 * Check if an endpoint is subscribed to a given event type.
 * Empty events array = subscribe to all events.
 */
export function matchesEvent(endpoint: WebhookEndpoint, eventType: string): boolean {
  if (!endpoint.active) return false;
  if (endpoint.events.length === 0) return true;
  return endpoint.events.includes(eventType);
}

// === Webhook Manager ===

const DEFAULT_MAX_RETRIES = 3;
const TIMEOUT_MS = 10_000;

export class WebhookManager {
  private deliveryLog: WebhookDelivery[] = [];
  private readonly maxRetries: number;

  constructor(opts?: { maxRetries?: number }) {
    this.maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Deliver a webhook to an endpoint with retry + exponential backoff.
   * Returns true if delivery succeeded within the retry budget.
   */
  async deliver(
    endpoint: WebhookEndpoint,
    event: AnyDomainEvent,
  ): Promise<boolean> {
    const webhookPayload: WebhookPayload = {
      id: event.eventId,
      type: event.eventType,
      orgId: event.orgId,
      occurredAt: event.occurredAt,
      payload: event.payload,
    };

    const body = JSON.stringify(webhookPayload);
    const signature = signPayload(body, endpoint.secret);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kwooka-Signature": `sha256=${signature}`,
            "X-Kwooka-Event": event.eventType,
            "X-Kwooka-Delivery": event.eventId,
            "User-Agent": "Kwooka-Webhooks/1.0",
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const delivery: WebhookDelivery = {
          endpointId: endpoint.id,
          eventType: event.eventType,
          statusCode: response.status,
          success: response.ok,
          attempt,
          error: response.ok ? null : `HTTP ${response.status}`,
          deliveredAt: new Date().toISOString(),
        };
        this.deliveryLog.push(delivery);

        if (response.ok) return true;

        // Don't retry on 4xx (client errors) — only retry on 5xx
        if (response.status >= 400 && response.status < 500) return false;
      } catch (err) {
        const delivery: WebhookDelivery = {
          endpointId: endpoint.id,
          eventType: event.eventType,
          statusCode: null,
          success: false,
          attempt,
          error: err instanceof Error ? err.message : String(err),
          deliveredAt: new Date().toISOString(),
        };
        this.deliveryLog.push(delivery);
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    return false;
  }

  /**
   * Dispatch an event to all matching endpoints.
   * Returns the number of successful deliveries.
   */
  async dispatch(
    endpoints: WebhookEndpoint[],
    event: AnyDomainEvent,
  ): Promise<number> {
    const matching = endpoints.filter((ep) => matchesEvent(ep, event.eventType));
    if (matching.length === 0) return 0;

    let successes = 0;
    // Deliver in parallel
    const results = await Promise.allSettled(
      matching.map((ep) => this.deliver(ep, event)),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) successes++;
    }

    return successes;
  }

  /** Get delivery log (for testing/monitoring) */
  getDeliveryLog(): readonly WebhookDelivery[] {
    return [...this.deliveryLog];
  }

  /** Clear delivery log */
  clearLog(): void {
    this.deliveryLog = [];
  }
}

// Singleton
export const webhookManager = new WebhookManager();
