// ============================================================================
// RING 3: EVENT HANDLERS — Wire events to side effects
// Pattern: Gold's event handlers
// ============================================================================
import type { EventBus } from "../bus";
import type { AnyDomainEvent } from "../types";
import type { WebhookManager, WebhookEndpoint } from "@/lib/webhooks";

/**
 * Register all domain event handlers on the bus.
 * Called once at app initialisation.
 *
 * Handlers are intentionally lightweight — they dispatch to ports/adapters
 * rather than containing business logic directly.
 */
export function registerHandlers(
  bus: EventBus,
  deps: {
    sendNotification?: (orgId: string, type: string, title: string, message: string) => Promise<void>;
    sendEmail?: (to: string, subject: string, body: string) => Promise<void>;
    recalculateRisk?: (orgId: string) => Promise<void>;
    logAuditTrail?: (event: AnyDomainEvent) => Promise<void>;
    webhookManager?: WebhookManager;
    getWebhookEndpoints?: (orgId: string) => Promise<WebhookEndpoint[]>;
  }
): void {
  // Global audit trail — every event gets logged
  if (deps.logAuditTrail) {
    bus.onAll(deps.logAuditTrail);
  }

  // Assessment completed → notify user
  bus.on("AssessmentCompleted", async (event) => {
    if (!deps.sendNotification) return;
    const { assessmentId, score, riskLevel, findingCount } = event.payload as {
      assessmentId: string; score: number; riskLevel: string; findingCount: number;
    };
    await deps.sendNotification(
      event.orgId,
      "assessment_complete",
      "Assessment Complete",
      `Analysis finished with score ${score}/100 (${riskLevel} risk). ${findingCount} findings identified.`
    );
  });

  // Finding escalated → urgent notification
  bus.on("FindingEscalated", async (event) => {
    if (!deps.sendNotification) return;
    const { findingId, severity, reason } = event.payload as {
      findingId: string; severity: string; reason: string;
    };
    await deps.sendNotification(
      event.orgId,
      "finding_escalated",
      `Critical Finding Escalated`,
      `Finding ${findingId} escalated to ${severity}: ${reason}`
    );
  });

  // Finding status changed → recalculate org risk
  bus.on("FindingStatusChanged", async (event) => {
    if (!deps.recalculateRisk) return;
    await deps.recalculateRisk(event.orgId);
  });

  // Document expiring → warning notification
  bus.on("DocumentExpiring", async (event) => {
    if (!deps.sendNotification) return;
    const { documentId, daysRemaining } = event.payload as {
      documentId: string; daysRemaining: number;
    };
    await deps.sendNotification(
      event.orgId,
      "document_expiring",
      "Document Expiring Soon",
      `Document ${documentId} expires in ${daysRemaining} days. Please renew.`
    );
  });

  // Legislation change → may need program review
  bus.on("LegislationChangeDetected", async (event) => {
    if (!deps.sendNotification) return;
    const { sector, source, impactLevel } = event.payload as {
      sector: string; source: string; impactLevel: string;
    };
    await deps.sendNotification(
      event.orgId,
      "legislation_change",
      "Regulatory Change Detected",
      `New ${impactLevel} impact update for ${sector} from ${source}. Review your compliance program.`
    );
  });

  // Deadline approaching → calendar alert
  bus.on("DeadlineApproaching", async (event) => {
    if (!deps.sendNotification) return;
    const { deadlineType, daysRemaining, deadline } = event.payload as {
      deadlineType: string; daysRemaining: number; deadline: string;
    };
    await deps.sendNotification(
      event.orgId,
      "deadline_approaching",
      `Deadline in ${daysRemaining} days`,
      `${deadlineType} deadline on ${deadline}. Take action now.`
    );
  });

  // Guardrail rejection → system alert (for monitoring)
  bus.on("GuardrailRejection", async (event) => {
    const { layer, reason, agentRunId } = event.payload as {
      layer: string; reason: string; agentRunId: string;
    };
    console.warn(`[Guardrail] Layer ${layer} rejected run ${agentRunId}: ${reason}`);
  });

  // Webhooks — dispatch matching events to registered endpoints
  if (deps.webhookManager && deps.getWebhookEndpoints) {
    const manager = deps.webhookManager;
    const getEndpoints = deps.getWebhookEndpoints;

    bus.onAll(async (event) => {
      try {
        const endpoints = await getEndpoints(event.orgId);
        if (endpoints.length > 0) {
          await manager.dispatch(endpoints, event);
        }
      } catch (err) {
        console.error(`[Webhooks] Failed to dispatch ${event.eventType}:`, err);
      }
    });
  }
}
