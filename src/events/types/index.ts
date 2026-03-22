// ============================================================================
// RING 3: DOMAIN EVENTS — 30+ Events
// All immutable, past tense, persisted to event_log, replayable
// Pattern: Gold's Ring 3 domain events
// ============================================================================
import type {
  OrgId, UserId, AssessmentId, FindingId, EvidenceId,
  DocumentId, ProgramId, SectorId, RiskLevel,
  ComplianceStatus, FindingSeverity, FindingStatus,
  SubscriptionTier, GovernanceRole,
} from "@/core/value-objects";

// === BASE EVENT ===
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly orgId: OrgId;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly payload: Record<string, unknown>;
}

// === ASSESSMENT LIFECYCLE ===
export interface AssessmentStarted extends DomainEvent {
  eventType: "AssessmentStarted";
  payload: { assessmentId: string; sector: SectorId; userId: string };
}
export interface AssessmentCompleted extends DomainEvent {
  eventType: "AssessmentCompleted";
  payload: { assessmentId: string; score: number; riskLevel: RiskLevel; findingCount: number };
}
export interface AssessmentFailed extends DomainEvent {
  eventType: "AssessmentFailed";
  payload: { assessmentId: string; error: string };
}

// === FINDINGS ===
export interface FindingCreated extends DomainEvent {
  eventType: "FindingCreated";
  payload: { findingId: string; assessmentId: string; severity: FindingSeverity; sector: SectorId };
}
export interface FindingStatusChanged extends DomainEvent {
  eventType: "FindingStatusChanged";
  payload: { findingId: string; from: FindingStatus; to: FindingStatus; changedBy: string };
}
export interface FindingEscalated extends DomainEvent {
  eventType: "FindingEscalated";
  payload: { findingId: string; severity: FindingSeverity; reason: string };
}
export interface FindingAssigned extends DomainEvent {
  eventType: "FindingAssigned";
  payload: { findingId: string; assignedTo: string };
}
export interface FindingOverdue extends DomainEvent {
  eventType: "FindingOverdue";
  payload: { findingId: string; dueDate: string; daysOverdue: number };
}

// === EVIDENCE ===
export interface EvidenceUploaded extends DomainEvent {
  eventType: "EvidenceUploaded";
  payload: { evidenceId: string; documentId: string | null; uploadedBy: string };
}
export interface EvidenceLinked extends DomainEvent {
  eventType: "EvidenceLinked";
  payload: { evidenceId: string; findingId: string };
}
export interface CoverageMapped extends DomainEvent {
  eventType: "CoverageMapped";
  payload: { evidenceId: string; requirementsCovered: number; totalRequirements: number };
}

// === COMPLIANCE PROGRAM ===
export interface ProgramCreated extends DomainEvent {
  eventType: "ProgramCreated";
  payload: { programId: string; sector: SectorId };
}
export interface ProgramVersionCreated extends DomainEvent {
  eventType: "ProgramVersionCreated";
  payload: { programId: string; version: number; createdBy: string };
}
export interface ProgramApproved extends DomainEvent {
  eventType: "ProgramApproved";
  payload: { programId: string; approvedBy: string };
}
export interface ProgramReviewDue extends DomainEvent {
  eventType: "ProgramReviewDue";
  payload: { programId: string; sector: SectorId; deadline: string };
}

// === DOCUMENT ===
export interface DocumentUploaded extends DomainEvent {
  eventType: "DocumentUploaded";
  payload: { documentId: string; category: string; sector: SectorId | null };
}
export interface DocumentExpiring extends DomainEvent {
  eventType: "DocumentExpiring";
  payload: { documentId: string; expiresAt: string; daysRemaining: number };
}
export interface RetentionWarning extends DomainEvent {
  eventType: "RetentionWarning";
  payload: { documentId: string; retentionUntil: string; attemptedAction: string };
}

// === LEGISLATION ===
export interface LegislationChangeDetected extends DomainEvent {
  eventType: "LegislationChangeDetected";
  payload: { updateId: string; sector: SectorId; source: string; impactLevel: RiskLevel };
}
export interface ImpactAssessed extends DomainEvent {
  eventType: "ImpactAssessed";
  payload: { updateId: string; programReviewRequired: boolean; affectedFindings: number };
}

// === PLAYBOOK ===
export interface ChecklistItemCompleted extends DomainEvent {
  eventType: "ChecklistItemCompleted";
  payload: { playbookId: string; itemId: string; sector: SectorId };
}
export interface PlaybookCompleted extends DomainEvent {
  eventType: "PlaybookCompleted";
  payload: { playbookId: string; sector: SectorId; completedAt: string };
}

// === ORGANISATION ===
export interface OrgCreated extends DomainEvent {
  eventType: "OrgCreated";
  payload: { name: string; sectors: SectorId[] };
}
export interface SectorAdded extends DomainEvent {
  eventType: "SectorAdded";
  payload: { sector: SectorId };
}
export interface TierChanged extends DomainEvent {
  eventType: "TierChanged";
  payload: { from: SubscriptionTier; to: SubscriptionTier };
}

// === SYSTEM ===
export interface GuardrailRejection extends DomainEvent {
  eventType: "GuardrailRejection";
  payload: { layer: string; reason: string; agentRunId: string };
}
export interface CircuitBreakerStateChanged extends DomainEvent {
  eventType: "CircuitBreakerStateChanged";
  payload: { service: string; state: "closed" | "open" | "half_open" };
}
export interface DeadlineApproaching extends DomainEvent {
  eventType: "DeadlineApproaching";
  payload: { deadlineType: string; deadline: string; daysRemaining: number; entityId: string };
}
export interface AuditPackGenerated extends DomainEvent {
  eventType: "AuditPackGenerated";
  payload: { packUrl: string; sector: SectorId };
}
export interface AgentRunCompleted extends DomainEvent {
  eventType: "AgentRunCompleted";
  payload: { agentRunId: string; agentName: string; success: boolean; tokensUsed: number; durationMs: number; reflectionScore: number | null };
}

// === ALL EVENT TYPES UNION ===
export type AnyDomainEvent =
  | AssessmentStarted | AssessmentCompleted | AssessmentFailed
  | FindingCreated | FindingStatusChanged | FindingEscalated | FindingAssigned | FindingOverdue
  | EvidenceUploaded | EvidenceLinked | CoverageMapped
  | ProgramCreated | ProgramVersionCreated | ProgramApproved | ProgramReviewDue
  | DocumentUploaded | DocumentExpiring | RetentionWarning
  | LegislationChangeDetected | ImpactAssessed
  | ChecklistItemCompleted | PlaybookCompleted
  | OrgCreated | SectorAdded | TierChanged
  | GuardrailRejection | CircuitBreakerStateChanged | DeadlineApproaching
  | AuditPackGenerated | AgentRunCompleted;

// === EVENT TYPE STRINGS ===
export const ALL_EVENT_TYPES = [
  "AssessmentStarted", "AssessmentCompleted", "AssessmentFailed",
  "FindingCreated", "FindingStatusChanged", "FindingEscalated", "FindingAssigned", "FindingOverdue",
  "EvidenceUploaded", "EvidenceLinked", "CoverageMapped",
  "ProgramCreated", "ProgramVersionCreated", "ProgramApproved", "ProgramReviewDue",
  "DocumentUploaded", "DocumentExpiring", "RetentionWarning",
  "LegislationChangeDetected", "ImpactAssessed",
  "ChecklistItemCompleted", "PlaybookCompleted",
  "OrgCreated", "SectorAdded", "TierChanged",
  "GuardrailRejection", "CircuitBreakerStateChanged", "DeadlineApproaching",
  "AuditPackGenerated", "AgentRunCompleted",
] as const;
