// ============================================================================
// RING 1: ENTITIES — ZERO EXTERNAL IMPORTS
// Kwooka Compliance V2 — 10 Core Entities
// Immutable creation functions, domain logic within entities
// Pattern: Gold's readonly interfaces + createX() factories
// ============================================================================
import type {
  OrgId, UserId, AssessmentId, FindingId, EvidenceId, DocumentId,
  PlaybookId, ProgramId, NotificationId,
  SectorId, RiskLevel, ComplianceStatus, FindingSeverity, FindingStatus,
  AssessmentStatus, DocumentCategory, SubscriptionTier, GovernanceRole,
  NotificationType, DocumentVersion, ABN,
} from "../value-objects";
import { complianceStatusPriority, canTransitionFinding, numberToRiskLevel, riskLevelToNumber } from "../value-objects";
import { StateTransitionError, ValidationError } from "../errors";

// ── Helpers ──
function now(): string { return new Date().toISOString(); }
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// 1. ORGANISATION — Multi-tenant container
// ============================================================================
export interface Organisation {
  readonly id: OrgId;
  readonly name: string;
  readonly abn: ABN | null;
  readonly sectors: readonly SectorId[];
  readonly tier: SubscriptionTier;
  readonly indigenousOwned: boolean;
  readonly supplyNationNumber: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createOrganisation(params: {
  id: OrgId;
  name: string;
  abn?: ABN | null;
  sectors?: SectorId[];
  tier?: SubscriptionTier;
  indigenousOwned?: boolean;
  supplyNationNumber?: string | null;
}): Organisation {
  if (!params.name.trim()) throw new ValidationError("Organisation name is required");
  return {
    id: params.id,
    name: params.name.trim(),
    abn: params.abn ?? null,
    sectors: params.sectors ?? [],
    tier: params.tier ?? "starter",
    indigenousOwned: params.indigenousOwned ?? false,
    supplyNationNumber: params.supplyNationNumber ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function addSector(org: Organisation, sector: SectorId): Organisation {
  if (org.sectors.includes(sector)) return org;
  return { ...org, sectors: [...org.sectors, sector], updatedAt: now() };
}

export function changeTier(org: Organisation, tier: SubscriptionTier): Organisation {
  return { ...org, tier, updatedAt: now() };
}

// ============================================================================
// 2. COMPLIANCE ASSESSMENT — AI-powered analysis of a document/org
// ============================================================================
export interface ComplianceAssessment {
  readonly id: AssessmentId;
  readonly orgId: OrgId;
  readonly userId: UserId;
  readonly sector: SectorId;
  readonly status: AssessmentStatus;
  readonly riskLevel: RiskLevel | null;
  readonly overallStatus: ComplianceStatus | null;
  readonly score: number | null; // 0-100
  readonly documentName: string | null;
  readonly findingCount: number;
  readonly summary: string | null;
  readonly agentRunId: string | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export function createAssessment(params: {
  id: AssessmentId;
  orgId: OrgId;
  userId: UserId;
  sector: SectorId;
  documentName?: string;
}): ComplianceAssessment {
  return {
    id: params.id,
    orgId: params.orgId,
    userId: params.userId,
    sector: params.sector,
    status: "pending",
    riskLevel: null,
    overallStatus: null,
    score: null,
    documentName: params.documentName ?? null,
    findingCount: 0,
    summary: null,
    agentRunId: null,
    createdAt: now(),
    completedAt: null,
  };
}

export function completeAssessment(
  assessment: ComplianceAssessment,
  result: {
    riskLevel: RiskLevel;
    overallStatus: ComplianceStatus;
    score: number;
    findingCount: number;
    summary: string;
    agentRunId: string;
  }
): ComplianceAssessment {
  return {
    ...assessment,
    status: "completed",
    riskLevel: result.riskLevel,
    overallStatus: result.overallStatus,
    score: Math.max(0, Math.min(100, Math.round(result.score))),
    findingCount: result.findingCount,
    summary: result.summary,
    agentRunId: result.agentRunId,
    completedAt: now(),
  };
}

export function failAssessment(assessment: ComplianceAssessment, agentRunId?: string): ComplianceAssessment {
  return { ...assessment, status: "failed", agentRunId: agentRunId ?? null, completedAt: now() };
}

// ============================================================================
// 3. FINDING — Individual compliance gap or observation
// ============================================================================
export interface Finding {
  readonly id: FindingId;
  readonly assessmentId: AssessmentId;
  readonly orgId: OrgId;
  readonly sector: SectorId;
  readonly title: string;
  readonly description: string;
  readonly severity: FindingSeverity;
  readonly status: FindingStatus;
  readonly regulation: string | null;
  readonly requirement: string | null;
  readonly remediation: string | null;
  readonly dueDate: string | null;
  readonly assignedTo: UserId | null;
  readonly evidenceIds: readonly EvidenceId[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createFinding(params: {
  id: FindingId;
  assessmentId: AssessmentId;
  orgId: OrgId;
  sector: SectorId;
  title: string;
  description: string;
  severity: FindingSeverity;
  regulation?: string;
  requirement?: string;
  remediation?: string;
  dueDate?: string;
}): Finding {
  if (!params.title.trim()) throw new ValidationError("Finding title is required");
  return {
    id: params.id,
    assessmentId: params.assessmentId,
    orgId: params.orgId,
    sector: params.sector,
    title: params.title.trim(),
    description: params.description,
    severity: params.severity,
    status: "open",
    regulation: params.regulation ?? null,
    requirement: params.requirement ?? null,
    remediation: params.remediation ?? null,
    dueDate: params.dueDate ?? null,
    assignedTo: null,
    evidenceIds: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

export function transitionFinding(finding: Finding, to: FindingStatus): Finding {
  if (!canTransitionFinding(finding.status, to)) {
    throw new StateTransitionError("Finding", finding.status, to);
  }
  return { ...finding, status: to, updatedAt: now() };
}

export function assignFinding(finding: Finding, userId: UserId): Finding {
  return { ...finding, assignedTo: userId, updatedAt: now() };
}

export function linkEvidence(finding: Finding, evidenceId: EvidenceId): Finding {
  if (finding.evidenceIds.includes(evidenceId)) return finding;
  return { ...finding, evidenceIds: [...finding.evidenceIds, evidenceId], updatedAt: now() };
}

// ============================================================================
// 4. EVIDENCE — Document/artefact proving compliance
// ============================================================================
export interface Evidence {
  readonly id: EvidenceId;
  readonly orgId: OrgId;
  readonly documentId: DocumentId | null;
  readonly findingId: FindingId | null;
  readonly type: "document" | "photo" | "certificate" | "record" | "other";
  readonly title: string;
  readonly description: string | null;
  readonly fileUrl: string | null;
  readonly coverageMap: ReadonlyMap<string, boolean> | null; // requirement → covered
  readonly uploadedBy: UserId;
  readonly createdAt: string;
}

export function createEvidence(params: {
  id: EvidenceId;
  orgId: OrgId;
  title: string;
  type: Evidence["type"];
  uploadedBy: UserId;
  documentId?: DocumentId;
  findingId?: FindingId;
  description?: string;
  fileUrl?: string;
}): Evidence {
  return {
    id: params.id,
    orgId: params.orgId,
    documentId: params.documentId ?? null,
    findingId: params.findingId ?? null,
    type: params.type,
    title: params.title.trim(),
    description: params.description ?? null,
    fileUrl: params.fileUrl ?? null,
    coverageMap: null,
    uploadedBy: params.uploadedBy,
    createdAt: now(),
  };
}

// ============================================================================
// 5. COMPLIANCE PROGRAM — Versioned compliance program per sector
// ============================================================================
export interface ComplianceProgram {
  readonly id: ProgramId;
  readonly orgId: OrgId;
  readonly sector: SectorId;
  readonly title: string;
  readonly currentVersion: number;
  readonly versions: readonly DocumentVersion[];
  readonly approvedBy: UserId | null;
  readonly approvedAt: string | null;
  readonly status: "draft" | "active" | "archived";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createProgram(params: {
  id: ProgramId;
  orgId: OrgId;
  sector: SectorId;
  title: string;
  content: string;
  createdBy: string;
}): ComplianceProgram {
  return {
    id: params.id,
    orgId: params.orgId,
    sector: params.sector,
    title: params.title.trim(),
    currentVersion: 1,
    versions: [{
      version: 1,
      content: params.content,
      createdBy: params.createdBy,
      createdAt: now(),
      changeNote: "Initial version",
    }],
    approvedBy: null,
    approvedAt: null,
    status: "draft",
    createdAt: now(),
    updatedAt: now(),
  };
}

export function addProgramVersion(
  program: ComplianceProgram,
  content: string,
  createdBy: string,
  changeNote?: string
): ComplianceProgram {
  const nextVersion = program.currentVersion + 1;
  return {
    ...program,
    currentVersion: nextVersion,
    versions: [
      ...program.versions,
      {
        version: nextVersion,
        content,
        createdBy,
        createdAt: now(),
        changeNote: changeNote ?? null,
      },
    ],
    updatedAt: now(),
  };
}

export function approveProgram(program: ComplianceProgram, approvedBy: UserId): ComplianceProgram {
  return {
    ...program,
    approvedBy,
    approvedAt: now(),
    status: "active",
    updatedAt: now(),
  };
}

export function getProgramVersionAtDate(program: ComplianceProgram, date: string): DocumentVersion | null {
  const targetDate = new Date(date).getTime();
  const validVersions = program.versions.filter(v => new Date(v.createdAt).getTime() <= targetDate);
  return validVersions.length > 0 ? validVersions[validVersions.length - 1]! : null;
}

// ============================================================================
// 6. DOCUMENT — Uploaded file with metadata and retention
// ============================================================================
export interface ComplianceDocument {
  readonly id: DocumentId;
  readonly orgId: OrgId;
  readonly title: string;
  readonly category: DocumentCategory;
  readonly sector: SectorId | null;
  readonly fileUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly versions: readonly DocumentVersion[];
  readonly currentVersion: number;
  readonly retentionUntil: string; // ISO date — cannot delete before this
  readonly expiresAt: string | null; // when the document itself expires (e.g. cert)
  readonly uploadedBy: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createDocument(params: {
  id: DocumentId;
  orgId: OrgId;
  title: string;
  category: DocumentCategory;
  sector?: SectorId;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: UserId;
  retentionYears?: number;
  expiresAt?: string;
}): ComplianceDocument {
  const retentionYears = params.retentionYears ?? 7;
  const retentionUntil = new Date();
  retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

  return {
    id: params.id,
    orgId: params.orgId,
    title: params.title.trim(),
    category: params.category,
    sector: params.sector ?? null,
    fileUrl: params.fileUrl,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    versions: [],
    currentVersion: 0,
    retentionUntil: retentionUntil.toISOString(),
    expiresAt: params.expiresAt ?? null,
    uploadedBy: params.uploadedBy,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function canDeleteDocument(doc: ComplianceDocument): boolean {
  return new Date() >= new Date(doc.retentionUntil);
}

export function isDocumentExpiring(doc: ComplianceDocument, withinDays: number): boolean {
  if (!doc.expiresAt) return false;
  const expiryDate = new Date(doc.expiresAt);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + withinDays);
  return expiryDate <= warningDate && expiryDate > new Date();
}

// ============================================================================
// 7. AUDIT REPORT — Generated compliance report
// ============================================================================
export interface AuditReport {
  readonly id: string;
  readonly orgId: OrgId;
  readonly sector: SectorId;
  readonly title: string;
  readonly score: number;
  readonly riskLevel: RiskLevel;
  readonly findingSummary: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
    readonly info: number;
  };
  readonly pdfUrl: string | null;
  readonly agentRunId: string | null;
  readonly generatedAt: string;
}

export function createAuditReport(params: {
  id: string;
  orgId: OrgId;
  sector: SectorId;
  title: string;
  score: number;
  riskLevel: RiskLevel;
  findingSummary: AuditReport["findingSummary"];
  agentRunId?: string;
}): AuditReport {
  return {
    ...params,
    pdfUrl: null,
    agentRunId: params.agentRunId ?? null,
    generatedAt: now(),
  };
}

// ============================================================================
// 8. PLAYBOOK — Sector-specific compliance checklist
// ============================================================================
export interface ChecklistItem {
  readonly id: string;
  readonly requirement: string;
  readonly regulation: string;
  readonly description: string;
  readonly completed: boolean;
  readonly evidenceId: EvidenceId | null;
  readonly notes: string | null;
}

export interface Playbook {
  readonly id: PlaybookId;
  readonly orgId: OrgId;
  readonly sector: SectorId;
  readonly title: string;
  readonly items: readonly ChecklistItem[];
  readonly progressPercent: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createPlaybook(params: {
  id: PlaybookId;
  orgId: OrgId;
  sector: SectorId;
  title: string;
  items: ChecklistItem[];
}): Playbook {
  return {
    id: params.id,
    orgId: params.orgId,
    sector: params.sector,
    title: params.title,
    items: params.items,
    progressPercent: calculateProgress(params.items),
    createdAt: now(),
    updatedAt: now(),
  };
}

export function completeChecklistItem(playbook: Playbook, itemId: string, evidenceId?: EvidenceId): Playbook {
  const items = playbook.items.map(item =>
    item.id === itemId
      ? { ...item, completed: true, evidenceId: evidenceId ?? null }
      : item
  );
  return { ...playbook, items, progressPercent: calculateProgress(items), updatedAt: now() };
}

function calculateProgress(items: readonly ChecklistItem[]): number {
  if (items.length === 0) return 0;
  return Math.round((items.filter(i => i.completed).length / items.length) * 100);
}

// ============================================================================
// 9. NOTIFICATION — User-facing alerts
// ============================================================================
export interface Notification {
  readonly id: NotificationId;
  readonly orgId: OrgId;
  readonly userId: UserId | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly read: boolean;
  readonly actionUrl: string | null;
  readonly createdAt: string;
}

export function createNotification(params: {
  id: NotificationId;
  orgId: OrgId;
  userId?: UserId;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}): Notification {
  return {
    id: params.id,
    orgId: params.orgId,
    userId: params.userId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    read: false,
    actionUrl: params.actionUrl ?? null,
    createdAt: now(),
  };
}

export function markRead(notification: Notification): Notification {
  return { ...notification, read: true };
}

// ============================================================================
// 10. LEGISLATION UPDATE — Tracked regulatory changes
// ============================================================================
export interface LegislationUpdate {
  readonly id: string;
  readonly sector: SectorId;
  readonly source: string;
  readonly title: string;
  readonly summary: string;
  readonly impactLevel: RiskLevel;
  readonly url: string | null;
  readonly publishedAt: string;
  readonly assessedAt: string | null;
  readonly programReviewRequired: boolean;
}

export function createLegislationUpdate(params: {
  id: string;
  sector: SectorId;
  source: string;
  title: string;
  summary: string;
  impactLevel: RiskLevel;
  url?: string;
  publishedAt: string;
}): LegislationUpdate {
  return {
    id: params.id,
    sector: params.sector,
    source: params.source,
    title: params.title,
    summary: params.summary,
    impactLevel: params.impactLevel,
    url: params.url ?? null,
    publishedAt: params.publishedAt,
    assessedAt: null,
    programReviewRequired: params.impactLevel === "high" || params.impactLevel === "critical",
  };
}

// ============================================================================
// AGGREGATE FUNCTIONS — Cross-entity domain logic
// ============================================================================

/** Calculate overall risk level from a set of findings */
export function calculateOverallRisk(findings: readonly Finding[]): RiskLevel {
  if (findings.length === 0) return "low";
  const maxSeverity = Math.max(
    ...findings.map(f => {
      const map: Record<FindingSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return map[f.severity];
    })
  );
  return numberToRiskLevel(maxSeverity);
}

/** Calculate compliance score (0-100) from findings */
export function calculateComplianceScore(
  findings: readonly Finding[],
  totalRequirements: number
): number {
  if (totalRequirements === 0) return 100;
  const compliantCount = findings.filter(
    f => f.status === "remediated" || f.status === "closed"
  ).length;
  const openGaps = findings.filter(
    f => f.status === "open" || f.status === "in_progress"
  ).length;
  // Score = (total requirements - open gaps) / total requirements * 100
  return Math.max(0, Math.round(((totalRequirements - openGaps) / totalRequirements) * 100));
}
