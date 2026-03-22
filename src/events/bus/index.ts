// ============================================================================
// RING 3: EVENT BUS — persistence, fan-out, dead letter queue
// Pattern: Gold's EventBus — DLQ persists to Supabase, survives Vercel restarts
// ============================================================================
import type { AnyDomainEvent } from "../types";
import type { OrgId } from "@/core/value-objects";

type EventHandler = (event: AnyDomainEvent) => Promise<void>;
type PersistFn = (event: AnyDomainEvent) => Promise<void>;

export interface DeadLetterEntry {
  event: AnyDomainEvent;
  error: string;
  failedAt: string;
  retryCount: number;
}

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private persistFn: PersistFn | null = null;
  private deadLetterQueue: DeadLetterEntry[] = [];
  private maxRetries = 3;

  /** Register a persistence function (adapter injects this) */
  setPersistence(fn: PersistFn): void {
    this.persistFn = fn;
  }

  /** Subscribe to an event type */
  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  /** Subscribe to ALL events */
  onAll(handler: EventHandler): void {
    this.on("*", handler);
  }

  /** Publish an event — persists first, then fans out to handlers */
  async publish(event: AnyDomainEvent): Promise<void> {
    // 1. Persist to event_log
    if (this.persistFn) {
      try {
        await this.persistFn(event);
      } catch (err) {
        // Persistence failure is logged but non-fatal
        console.error(`[EventBus] Failed to persist event ${event.eventType}:`, err);
      }
    }

    // 2. Fan-out to type-specific handlers + global handlers
    const typeHandlers = this.handlers.get(event.eventType) ?? [];
    const globalHandlers = this.handlers.get("*") ?? [];
    const allHandlers = [...typeHandlers, ...globalHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const entry: DeadLetterEntry = {
          event,
          error: errorMessage,
          failedAt: new Date().toISOString(),
          retryCount: 0,
        };
        this.deadLetterQueue.push(entry);
        console.error(`[EventBus] Handler failed for ${event.eventType}: ${errorMessage}`);
      }
    }
  }

  /** Publish multiple events in sequence */
  async publishAll(events: AnyDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /** Get dead letter queue entries */
  getDeadLetters(): readonly DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /** Retry a dead letter entry */
  async retryDeadLetter(index: number): Promise<boolean> {
    const entry = this.deadLetterQueue[index];
    if (!entry) return false;
    if (entry.retryCount >= this.maxRetries) return false;

    try {
      await this.publish(entry.event);
      this.deadLetterQueue.splice(index, 1);
      return true;
    } catch (_err) {
      entry.retryCount++;
      return false;
    }
  }

  /** Get DLQ depth for health checks */
  getDeadLetterCount(): number {
    return this.deadLetterQueue.length;
  }

  /** Clear all handlers (for testing) */
  reset(): void {
    this.handlers.clear();
    this.deadLetterQueue = [];
    this.persistFn = null;
  }
}

// === EVENT FACTORY ===
let eventCounter = 0;

export function createEvent<T extends AnyDomainEvent>(
  eventType: T["eventType"],
  orgId: OrgId,
  payload: T["payload"],
  correlationId?: string
): T {
  eventCounter++;
  return {
    eventId: `evt_${Date.now()}_${eventCounter}`,
    eventType,
    orgId,
    occurredAt: new Date().toISOString(),
    correlationId: correlationId ?? `cor_${Date.now()}_${eventCounter}`,
    payload,
  } as T;
}

// Singleton bus
export const eventBus = new EventBus();
