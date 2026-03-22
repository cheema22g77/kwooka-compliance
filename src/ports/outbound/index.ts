// ============================================================================
// RING 2: OUTBOUND PORTS — 10 Interfaces
// What the core domain needs from the outside world
// Adapters (Ring 4) implement these — swappable (stub → real)
// Pattern: Gold's outbound ports
// ============================================================================
import type {
  OrgId, UserId, AssessmentId, FindingId, EvidenceId,
  DocumentId, ProgramId, SectorId, RiskLevel,
  FindingStatus, DocumentCategory, SubscriptionTier,
  DocumentVersion,
} from "@/core/value-objects";
import type {
  ComplianceAssessment, Finding, Evidence, ComplianceProgram,
  ComplianceDocument, AuditReport, Organisation, Notification,
  LegislationUpdate,
} from "@/core/entities";

// === 1. ILLMPort — AI model abstraction ===
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: { input: number; output: number };
  durationMs: number;
}

export interface ILLMPort {
  complete(params: {
    model: "sonnet" | "haiku";
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse>;

  stream(params: {
    model: "sonnet" | "haiku";
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;
}

// === 2. IAssessmentRepo ===
export interface IAssessmentRepo {
  save(assessment: ComplianceAssessment): Promise<ComplianceAssessment>;
  findById(id: AssessmentId): Promise<ComplianceAssessment | null>;
  findByOrg(orgId: OrgId, sector?: SectorId, limit?: number): Promise<ComplianceAssessment[]>;
  update(id: AssessmentId, data: Partial<ComplianceAssessment>): Promise<ComplianceAssessment>;
}

// === 3. IFindingsRepo ===
export interface IFindingsRepo {
  save(finding: Finding): Promise<Finding>;
  findById(id: FindingId): Promise<Finding | null>;
  findByAssessment(assessmentId: AssessmentId): Promise<Finding[]>;
  findByOrg(orgId: OrgId, filters?: {
    sector?: SectorId;
    severity?: string;
    status?: FindingStatus;
  }): Promise<Finding[]>;
  update(id: FindingId, data: Partial<Finding>): Promise<Finding>;
  findOverdue(orgId: OrgId): Promise<Finding[]>;
}

// === 4. IDocumentRepo ===
export interface IDocumentRepo {
  save(doc: ComplianceDocument): Promise<ComplianceDocument>;
  findById(id: DocumentId): Promise<ComplianceDocument | null>;
  findByOrg(orgId: OrgId, category?: DocumentCategory): Promise<ComplianceDocument[]>;
  findExpiring(orgId: OrgId, withinDays: number): Promise<ComplianceDocument[]>;
  update(id: DocumentId, data: Partial<ComplianceDocument>): Promise<ComplianceDocument>;
  delete(id: DocumentId): Promise<void>;
}

// === 5. IVersionedDocRepo — Immutable versioning, from Gold ===
export interface IVersionedDocRepo {
  createVersion(params: {
    documentId: string;
    orgId: OrgId;
    content: string;
    createdBy: string;
    changeNote?: string;
  }): Promise<DocumentVersion>;

  getVersionAtDate(documentId: string, date: string): Promise<DocumentVersion | null>;
  getCurrent(documentId: string): Promise<DocumentVersion | null>;
  listHistory(documentId: string): Promise<DocumentVersion[]>;
}

// === 6. IStoragePort ===
export interface IStoragePort {
  upload(params: {
    bucket: string;
    path: string;
    data: ArrayBuffer | Uint8Array;
    contentType: string;
  }): Promise<{ url: string }>;

  download(bucket: string, path: string): Promise<ArrayBuffer>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
}

// === 7. IRegulatoryFeedPort — Legislation monitoring ===
export interface RegulatoryUpdate {
  id: string;
  source: string;
  title: string;
  summary: string;
  publishedAt: string;
  impactedSectors: SectorId[];
  url: string;
}

export interface IRegulatoryFeedPort {
  fetchUpdates(sector: SectorId, since: string): Promise<RegulatoryUpdate[]>;
  checkForChanges(sectors: SectorId[]): Promise<RegulatoryUpdate[]>;
}

// === 8. INotificationRepo ===
export interface INotificationRepo {
  save(notification: Notification): Promise<Notification>;
  findUnread(orgId: OrgId, userId: UserId): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(orgId: OrgId, userId: UserId): Promise<void>;
}

// === 9. IEmailPort — External email sending ===
export interface IEmailPort {
  send(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ sent: boolean; messageId?: string }>;
}

// === 10. IBillingPort — Stripe subscription management ===
export interface IBillingPort {
  createCheckoutSession(params: {
    orgId: OrgId;
    tier: SubscriptionTier;
    interval: "monthly" | "annual";
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionUrl: string }>;

  createPortalSession(orgId: OrgId, returnUrl: string): Promise<{ portalUrl: string }>;

  getSubscription(orgId: OrgId): Promise<{
    tier: SubscriptionTier;
    status: "trialing" | "active" | "past_due" | "cancelled";
    currentPeriodEnd: string;
  } | null>;

  handleWebhookEvent(payload: string, signature: string): Promise<void>;
}

// === 11. IOrgRepo ===
export interface IOrgRepo {
  save(org: Organisation): Promise<Organisation>;
  findById(id: OrgId): Promise<Organisation | null>;
  update(id: OrgId, data: Partial<Organisation>): Promise<Organisation>;
}

// === 12. IEventPersistencePort — Event log storage ===
export interface IEventPersistencePort {
  persist(event: {
    eventId: string;
    eventType: string;
    orgId: OrgId;
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<void>;

  replay(orgId: OrgId, since: string): Promise<Array<{
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }>>;
}
