// ============================================================================
// TESTS: Event Bus, Dead Letter Queue, Event Handlers
// Pure in-memory tests — no external services
// Run: npx vitest run tests/events.test.ts
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus, createEvent } from "../src/events/bus";
import { registerHandlers } from "../src/events/handlers";
import type { OrgId } from "../src/core/value-objects";
import type { AnyDomainEvent, AssessmentCompleted, FindingEscalated } from "../src/events/types";

const ORG = "org_test" as OrgId;

function makeEvent<T extends AnyDomainEvent>(
  eventType: T["eventType"],
  payload: T["payload"],
): T {
  return createEvent<T>(eventType, ORG, payload);
}

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe("publish & subscribe", () => {
    it("delivers event to matching handler", async () => {
      const received: AnyDomainEvent[] = [];
      bus.on("AssessmentCompleted", async (e) => { received.push(e); });

      const event = makeEvent<AssessmentCompleted>("AssessmentCompleted", {
        assessmentId: "a1",
        score: 85,
        riskLevel: "medium",
        findingCount: 3,
      });

      await bus.publish(event);

      expect(received).toHaveLength(1);
      expect(received[0]!.payload).toEqual(event.payload);
    });

    it("does not deliver to non-matching handlers", async () => {
      const received: AnyDomainEvent[] = [];
      bus.on("FindingCreated", async (e) => { received.push(e); });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 80, riskLevel: "low", findingCount: 0,
        }),
      );

      expect(received).toHaveLength(0);
    });

    it("delivers to global (*) handlers for all events", async () => {
      const received: AnyDomainEvent[] = [];
      bus.onAll(async (e) => { received.push(e); });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 90, riskLevel: "low", findingCount: 0,
        }),
      );

      expect(received).toHaveLength(1);
    });

    it("delivers to multiple handlers for same event type", async () => {
      let count = 0;
      bus.on("AssessmentCompleted", async () => { count++; });
      bus.on("AssessmentCompleted", async () => { count++; });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 70, riskLevel: "medium", findingCount: 2,
        }),
      );

      expect(count).toBe(2);
    });
  });

  describe("publishAll", () => {
    it("publishes events in sequence", async () => {
      const order: string[] = [];
      bus.on("AssessmentCompleted", async () => { order.push("assessment"); });
      bus.on("FindingEscalated", async () => { order.push("escalated"); });

      await bus.publishAll([
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 50, riskLevel: "high", findingCount: 5,
        }),
        makeEvent<FindingEscalated>("FindingEscalated", {
          findingId: "f1", severity: "critical", reason: "Unresolved",
        }),
      ]);

      expect(order).toEqual(["assessment", "escalated"]);
    });
  });

  describe("persistence", () => {
    it("calls persistence function before fan-out", async () => {
      const persisted: AnyDomainEvent[] = [];
      bus.setPersistence(async (e) => { persisted.push(e); });

      const handlerCalled: boolean[] = [];
      bus.on("AssessmentCompleted", async () => { handlerCalled.push(true); });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 60, riskLevel: "high", findingCount: 4,
        }),
      );

      expect(persisted).toHaveLength(1);
      expect(handlerCalled).toHaveLength(1);
    });

    it("continues fan-out even if persistence fails", async () => {
      bus.setPersistence(async () => { throw new Error("DB down"); });

      const received: AnyDomainEvent[] = [];
      bus.on("AssessmentCompleted", async (e) => { received.push(e); });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 70, riskLevel: "medium", findingCount: 1,
        }),
      );

      expect(received).toHaveLength(1);
    });
  });

  describe("dead letter queue", () => {
    it("starts empty", () => {
      expect(bus.getDeadLetterCount()).toBe(0);
      expect(bus.getDeadLetters()).toEqual([]);
    });

    it("captures failed handler events", async () => {
      bus.on("AssessmentCompleted", async () => {
        throw new Error("handler crashed");
      });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 50, riskLevel: "high", findingCount: 3,
        }),
      );

      expect(bus.getDeadLetterCount()).toBe(1);
      const dlq = bus.getDeadLetters();
      expect(dlq[0]!.error).toContain("handler crashed");
      expect(dlq[0]!.retryCount).toBe(0);
    });

    it("retries dead letter entry successfully", async () => {
      let callCount = 0;
      bus.on("AssessmentCompleted", async () => {
        callCount++;
        if (callCount <= 1) throw new Error("transient");
      });

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 60, riskLevel: "high", findingCount: 2,
        }),
      );

      expect(bus.getDeadLetterCount()).toBe(1);

      const retried = await bus.retryDeadLetter(0);
      expect(retried).toBe(true);
      expect(bus.getDeadLetterCount()).toBe(0);
    });

    it("returns false for invalid DLQ index", async () => {
      const result = await bus.retryDeadLetter(999);
      expect(result).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears handlers, DLQ, and persistence", async () => {
      bus.on("AssessmentCompleted", async () => { throw new Error("fail"); });
      bus.setPersistence(async () => {});

      await bus.publish(
        makeEvent<AssessmentCompleted>("AssessmentCompleted", {
          assessmentId: "a1", score: 50, riskLevel: "high", findingCount: 1,
        }),
      );

      expect(bus.getDeadLetterCount()).toBe(1);

      bus.reset();

      expect(bus.getDeadLetterCount()).toBe(0);
    });
  });
});

describe("createEvent", () => {
  it("generates unique event IDs", () => {
    const e1 = createEvent<AssessmentCompleted>(
      "AssessmentCompleted", ORG,
      { assessmentId: "a1", score: 80, riskLevel: "low", findingCount: 0 },
    );
    const e2 = createEvent<AssessmentCompleted>(
      "AssessmentCompleted", ORG,
      { assessmentId: "a2", score: 90, riskLevel: "low", findingCount: 0 },
    );
    expect(e1.eventId).not.toBe(e2.eventId);
  });

  it("sets correct fields", () => {
    const e = createEvent<AssessmentCompleted>(
      "AssessmentCompleted", ORG,
      { assessmentId: "a1", score: 75, riskLevel: "medium", findingCount: 2 },
      "cor_custom",
    );
    expect(e.eventType).toBe("AssessmentCompleted");
    expect(e.orgId).toBe(ORG);
    expect(e.correlationId).toBe("cor_custom");
    expect(e.occurredAt).toBeTruthy();
  });

  it("auto-generates correlationId if not provided", () => {
    const e = createEvent<AssessmentCompleted>(
      "AssessmentCompleted", ORG,
      { assessmentId: "a1", score: 80, riskLevel: "low", findingCount: 0 },
    );
    expect(e.correlationId).toMatch(/^cor_/);
  });
});

describe("registerHandlers", () => {
  it("sends notification on AssessmentCompleted", async () => {
    const bus = new EventBus();
    const notifications: any[] = [];

    registerHandlers(bus, {
      sendNotification: async (orgId, type, title, message) => {
        notifications.push({ orgId, type, title, message });
      },
    });

    await bus.publish(
      makeEvent<AssessmentCompleted>("AssessmentCompleted", {
        assessmentId: "a1", score: 82, riskLevel: "medium", findingCount: 4,
      }),
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe("assessment_complete");
    expect(notifications[0]!.message).toContain("82/100");
    expect(notifications[0]!.message).toContain("4 findings");
  });

  it("sends urgent notification on FindingEscalated", async () => {
    const bus = new EventBus();
    const notifications: any[] = [];

    registerHandlers(bus, {
      sendNotification: async (orgId, type, title, message) => {
        notifications.push({ orgId, type, title, message });
      },
    });

    await bus.publish(
      makeEvent<FindingEscalated>("FindingEscalated", {
        findingId: "f1", severity: "critical", reason: "No remediation plan",
      }),
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe("finding_escalated");
    expect(notifications[0]!.title).toContain("Escalated");
  });

  it("logs all events via audit trail handler", async () => {
    const bus = new EventBus();
    const logged: AnyDomainEvent[] = [];

    registerHandlers(bus, {
      logAuditTrail: async (event) => { logged.push(event); },
    });

    await bus.publish(
      makeEvent<AssessmentCompleted>("AssessmentCompleted", {
        assessmentId: "a1", score: 90, riskLevel: "low", findingCount: 0,
      }),
    );

    expect(logged).toHaveLength(1);
    expect(logged[0]!.eventType).toBe("AssessmentCompleted");
  });

  it("recalculates risk on FindingStatusChanged", async () => {
    const bus = new EventBus();
    const recalculated: string[] = [];

    registerHandlers(bus, {
      recalculateRisk: async (orgId) => { recalculated.push(orgId); },
    });

    await bus.publish(
      createEvent("FindingStatusChanged" as any, ORG, {
        findingId: "f1", from: "open", to: "remediated", changedBy: "user1",
      } as any),
    );

    expect(recalculated).toHaveLength(1);
    expect(recalculated[0]).toBe(ORG);
  });
});
