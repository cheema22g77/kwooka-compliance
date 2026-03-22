// ============================================================================
// TESTS: Webhooks — signature generation, event matching, retry logic,
//        delivery, and event handler integration
// Run: npx vitest run tests/webhooks.test.ts
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signPayload,
  verifySignature,
  matchesEvent,
  WebhookManager,
  type WebhookEndpoint,
} from "../src/lib/webhooks";
import { EventBus, createEvent } from "../src/events/bus";
import { registerHandlers } from "../src/events/handlers";
import type { AnyDomainEvent, AssessmentCompleted } from "../src/events/types";
import type { OrgId } from "../src/core/value-objects";

const ORG = "org_test" as OrgId;

function makeEndpoint(overrides?: Partial<WebhookEndpoint>): WebhookEndpoint {
  return {
    id: "ep_1",
    orgId: ORG,
    url: "https://example.com/webhook",
    secret: "whsec_test_secret_123",
    events: [],
    active: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvent(type = "AssessmentCompleted"): AnyDomainEvent {
  return createEvent(
    type as any,
    ORG,
    { assessmentId: "a1", score: 85, riskLevel: "medium", findingCount: 3 } as any,
  );
}

// ── Signature Generation ──

describe("signPayload", () => {
  it("returns a hex string", () => {
    const sig = signPayload('{"test":true}', "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    const body = '{"id":"1","type":"test"}';
    expect(signPayload(body, "secret")).toBe(signPayload(body, "secret"));
  });

  it("changes with different body", () => {
    const s1 = signPayload('{"a":1}', "secret");
    const s2 = signPayload('{"a":2}', "secret");
    expect(s1).not.toBe(s2);
  });

  it("changes with different secret", () => {
    const body = '{"test":true}';
    const s1 = signPayload(body, "secret_1");
    const s2 = signPayload(body, "secret_2");
    expect(s1).not.toBe(s2);
  });
});

describe("verifySignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"test":true}';
    const secret = "my_secret";
    const sig = signPayload(body, secret);
    expect(verifySignature(body, secret, sig)).toBe(true);
  });

  it("returns false for wrong signature", () => {
    expect(verifySignature('{"test":true}', "secret", "wrong_sig_abc123")).toBe(false);
  });

  it("returns false for wrong body", () => {
    const secret = "my_secret";
    const sig = signPayload('{"a":1}', secret);
    expect(verifySignature('{"a":2}', secret, sig)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const body = '{"test":true}';
    const sig = signPayload(body, "secret_1");
    expect(verifySignature(body, "secret_2", sig)).toBe(false);
  });

  it("returns false for different length signatures", () => {
    expect(verifySignature("body", "secret", "short")).toBe(false);
  });
});

// ── Event Matching ──

describe("matchesEvent", () => {
  it("matches all events when events array is empty", () => {
    const ep = makeEndpoint({ events: [] });
    expect(matchesEvent(ep, "AssessmentCompleted")).toBe(true);
    expect(matchesEvent(ep, "FindingCreated")).toBe(true);
    expect(matchesEvent(ep, "AnyOtherEvent")).toBe(true);
  });

  it("matches only subscribed events", () => {
    const ep = makeEndpoint({ events: ["AssessmentCompleted", "FindingCreated"] });
    expect(matchesEvent(ep, "AssessmentCompleted")).toBe(true);
    expect(matchesEvent(ep, "FindingCreated")).toBe(true);
    expect(matchesEvent(ep, "DocumentUploaded")).toBe(false);
  });

  it("returns false for inactive endpoints", () => {
    const ep = makeEndpoint({ active: false, events: [] });
    expect(matchesEvent(ep, "AssessmentCompleted")).toBe(false);
  });

  it("returns false for inactive + matching events", () => {
    const ep = makeEndpoint({ active: false, events: ["AssessmentCompleted"] });
    expect(matchesEvent(ep, "AssessmentCompleted")).toBe(false);
  });
});

// ── WebhookManager ──

describe("WebhookManager", () => {
  let manager: WebhookManager;

  beforeEach(() => {
    manager = new WebhookManager({ maxRetries: 3 });
    manager.clearLog();
  });

  describe("deliver", () => {
    it("succeeds on 200 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await manager.deliver(makeEndpoint(), makeEvent());

      expect(result).toBe(true);
      expect(manager.getDeliveryLog()).toHaveLength(1);
      expect(manager.getDeliveryLog()[0]!.success).toBe(true);
      expect(manager.getDeliveryLog()[0]!.attempt).toBe(1);
    });

    it("sends correct headers", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const ep = makeEndpoint();
      const event = makeEvent();
      await manager.deliver(ep, event);

      const call = (global.fetch as any).mock.calls[0];
      const headers = call[1].headers;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Kwooka-Event"]).toBe("AssessmentCompleted");
      expect(headers["X-Kwooka-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(headers["User-Agent"]).toBe("Kwooka-Webhooks/1.0");
    });

    it("sends signed body with correct payload shape", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const event = makeEvent();
      await manager.deliver(makeEndpoint(), event);

      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.id).toBe(event.eventId);
      expect(body.type).toBe("AssessmentCompleted");
      expect(body.orgId).toBe(ORG);
      expect(body.payload).toBeDefined();
    });

    it("does not retry on 4xx client errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });

      const result = await manager.deliver(makeEndpoint(), makeEvent());

      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("retries on 5xx server errors", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) return { ok: false, status: 500 };
        return { ok: true, status: 200 };
      });

      const fastManager = new WebhookManager({ maxRetries: 3 });
      // Override the delay for testing
      const origSetTimeout = global.setTimeout;

      const result = await fastManager.deliver(makeEndpoint(), makeEvent());

      expect(result).toBe(true);
      expect(callCount).toBe(3);
    });

    it("retries on network errors", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) throw new Error("ECONNREFUSED");
        return { ok: true, status: 200 };
      });

      const result = await manager.deliver(makeEndpoint(), makeEvent());

      expect(result).toBe(true);
      expect(callCount).toBe(2);
    });

    it("fails after exhausting retries", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const result = await manager.deliver(makeEndpoint(), makeEvent());

      expect(result).toBe(false);
      expect(manager.getDeliveryLog().length).toBe(3); // 3 attempts
    });

    it("logs all delivery attempts", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) return { ok: false, status: 503 };
        return { ok: true, status: 200 };
      });

      await manager.deliver(makeEndpoint(), makeEvent());

      const log = manager.getDeliveryLog();
      expect(log.length).toBeGreaterThanOrEqual(2);
      expect(log[0]!.success).toBe(false);
      expect(log[0]!.attempt).toBe(1);
    });
  });

  describe("dispatch", () => {
    it("delivers to all matching endpoints", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const endpoints = [
        makeEndpoint({ id: "ep_1", events: ["AssessmentCompleted"] }),
        makeEndpoint({ id: "ep_2", events: ["AssessmentCompleted"] }),
        makeEndpoint({ id: "ep_3", events: ["FindingCreated"] }),
      ];

      const count = await manager.dispatch(endpoints, makeEvent());

      expect(count).toBe(2); // Only ep_1 and ep_2 match
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("returns 0 when no endpoints match", async () => {
      const endpoints = [
        makeEndpoint({ events: ["FindingCreated"] }),
      ];

      const count = await manager.dispatch(endpoints, makeEvent());
      expect(count).toBe(0);
    });

    it("delivers to all endpoints when subscribed to all events", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const endpoints = [
        makeEndpoint({ id: "ep_1", events: [] }),
        makeEndpoint({ id: "ep_2", events: [] }),
      ];

      const count = await manager.dispatch(endpoints, makeEvent());
      expect(count).toBe(2);
    });

    it("skips inactive endpoints", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const endpoints = [
        makeEndpoint({ id: "ep_1", active: true, events: [] }),
        makeEndpoint({ id: "ep_2", active: false, events: [] }),
      ];

      const count = await manager.dispatch(endpoints, makeEvent());
      expect(count).toBe(1);
    });

    it("handles partial failures", async () => {
      let callIdx = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callIdx++;
        if (callIdx === 1) return { ok: true, status: 200 };
        return { ok: false, status: 400 };
      });

      const endpoints = [
        makeEndpoint({ id: "ep_1", events: [] }),
        makeEndpoint({ id: "ep_2", events: [] }),
      ];

      const count = await manager.dispatch(endpoints, makeEvent());
      expect(count).toBe(1);
    });
  });

  describe("delivery log", () => {
    it("starts empty", () => {
      expect(manager.getDeliveryLog()).toEqual([]);
    });

    it("clears on clearLog()", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      await manager.deliver(makeEndpoint(), makeEvent());
      expect(manager.getDeliveryLog().length).toBeGreaterThan(0);

      manager.clearLog();
      expect(manager.getDeliveryLog()).toEqual([]);
    });
  });
});

// ── Event Handler Integration ──

describe("registerHandlers webhook integration", () => {
  it("dispatches events to webhook manager", async () => {
    const bus = new EventBus();
    const dispatched: { endpoints: any[]; event: AnyDomainEvent }[] = [];

    const manager = new WebhookManager();
    // Stub dispatch
    manager.dispatch = vi.fn(async (endpoints, event) => {
      dispatched.push({ endpoints, event });
      return endpoints.length;
    });

    const endpoints = [makeEndpoint()];

    registerHandlers(bus, {
      webhookManager: manager,
      getWebhookEndpoints: async () => endpoints,
    });

    await bus.publish(makeEvent());

    expect(dispatched.length).toBe(1);
    expect(dispatched[0]!.event.eventType).toBe("AssessmentCompleted");
    expect(dispatched[0]!.endpoints).toEqual(endpoints);
  });

  it("does not dispatch when no endpoints returned", async () => {
    const bus = new EventBus();
    const manager = new WebhookManager();
    manager.dispatch = vi.fn(async () => 0);

    registerHandlers(bus, {
      webhookManager: manager,
      getWebhookEndpoints: async () => [],
    });

    await bus.publish(makeEvent());

    expect(manager.dispatch).not.toHaveBeenCalled();
  });

  it("does not throw when webhook dispatch fails", async () => {
    const bus = new EventBus();
    const manager = new WebhookManager();

    registerHandlers(bus, {
      webhookManager: manager,
      getWebhookEndpoints: async () => { throw new Error("DB down"); },
    });

    // Should not throw
    await bus.publish(makeEvent());
  });
});

// ── Signature Round-Trip ──

describe("signature round-trip", () => {
  it("sign → verify cycle works for webhook payloads", () => {
    const event = makeEvent();
    const body = JSON.stringify({
      id: event.eventId,
      type: event.eventType,
      orgId: event.orgId,
      occurredAt: event.occurredAt,
      payload: event.payload,
    });
    const secret = "whsec_my_production_secret";

    const signature = signPayload(body, secret);
    expect(verifySignature(body, secret, signature)).toBe(true);
    expect(verifySignature(body + " ", secret, signature)).toBe(false);
  });
});
