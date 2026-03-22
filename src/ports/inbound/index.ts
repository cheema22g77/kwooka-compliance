// ============================================================================
// RING 2: INBOUND PORTS — 9 Interfaces
// What the outside world asks the core domain
// Pattern: Green's inbound ports — interfaces only, no implementations
// ============================================================================
import type {
  OrgId, UserId, AssessmentId, FindingId, EvidenceId,
  DocumentId, PlaybookId, ProgramId,
  SectorId, RiskLevel, FindingStatus, DocumentCategory,
} from "@/core/value-objects";
import type {
  ComplianceAssessment, Finding, Evidence, ComplianceProgram,
  ComplianceDocument, Playbook, AuditReport, Notification,
  LegislationUpdate, Organisation,
} from "@/core/entities";

// === 1. IAssessmentPort ===
export interface IAssessmentPort {
  runAssessment(params: {
    orgId: OrgId;
    userId: UserId;
    sector: SectorId;
    documentContent: string;
    documentName?: string;
  }): Promise<ComplianceAssessment>;

  getById(id: AssessmentId): Promise<ComplianceAssessment | null>;
  getByOrg(orgId: OrgId, sector?: SectorId): Promise<ComplianceAssessment[]>;
  getHistory(orgId: OrgId, limit?: number): Promise<ComplianceAssessment[]>;
  bulkAnalyse(orgId: OrgId, sector: SectorId, documents: Array<{
    content: string;
    name: string;
  }>): Promise<ComplianceAssessment[]>;
}

// === 2. IFindingsPort ===
export interface IFindingsPort {
  create(finding: Omit<Finding, "id" | "createdAt" | "updatedAt" | "evidenceIds">): Promise<Finding>;
  getById(id: FindingId): Promise<Finding | null>;
  getByOrg(orgId: OrgId, filters?: {
    sector?: SectorId;
    severity?: string;
    status?: FindingStatus;
  }): Promise<Finding[]>;
  getByAssessment(assessmentId: AssessmentId): Promise<Finding[]>;
  updateStatus(id: FindingId, status: FindingStatus, userId: UserId): Promise<Finding>;
  assign(id: FindingId, userId: UserId): Promise<Finding>;
  linkEvidence(findingId: FindingId, evidenceId: EvidenceId): Promise<Finding>;
  getOverdue(orgId: OrgId): Promise<Finding[]>;
}

// === 3. IDocumentPort ===
export interface IDocumentPort {
  upload(params: {
    orgId: OrgId;
    title: string;
    category: DocumentCategory;
    sector?: SectorId;
    fileBuffer: ArrayBuffer | Uint8Array;
    fileName: string;
    mimeType: string;
    uploadedBy: UserId;
    expiresAt?: string;
  }): Promise<ComplianceDocument>;

  getById(id: DocumentId): Promise<ComplianceDocument | null>;
  listByOrg(orgId: OrgId, category?: DocumentCategory): Promise<ComplianceDocument[]>;
  getExpiring(orgId: OrgId, withinDays: number): Promise<ComplianceDocument[]>;
  generateAuditPack(orgId: OrgId, sector: SectorId): Promise<{ url: string; documentIds: DocumentId[] }>;
}

// === 4. IPlaybookPort ===
export interface IPlaybookPort {
  getBySector(orgId: OrgId, sector: SectorId): Promise<Playbook | null>;
  createFromTemplate(orgId: OrgId, sector: SectorId): Promise<Playbook>;
  completeItem(playbookId: PlaybookId, itemId: string, evidenceId?: EvidenceId): Promise<Playbook>;
  getProgress(orgId: OrgId): Promise<Array<{ sector: SectorId; progressPercent: number }>>;
}

// === 5. IProgramPort ===
export interface IProgramPort {
  create(params: {
    orgId: OrgId;
    sector: SectorId;
    title: string;
    content: string;
    createdBy: string;
  }): Promise<ComplianceProgram>;

  addVersion(programId: ProgramId, content: string, createdBy: string, changeNote?: string): Promise<ComplianceProgram>;
  approve(programId: ProgramId, approvedBy: UserId): Promise<ComplianceProgram>;
  getCurrent(orgId: OrgId, sector: SectorId): Promise<ComplianceProgram | null>;
  getVersionAtDate(programId: ProgramId, date: string): Promise<ComplianceProgram | null>;
}

// === 6. IReportingPort ===
export interface IReportingPort {
  generateAuditReport(orgId: OrgId, sector: SectorId): Promise<AuditReport>;
  exportPDF(reportId: string): Promise<ArrayBuffer>;
  exportDOCX(reportId: string): Promise<ArrayBuffer>;
  getReports(orgId: OrgId, sector?: SectorId): Promise<AuditReport[]>;
}

// === 7. IOnboardingPort ===
export interface IOnboardingPort {
  createOrg(params: {
    name: string;
    abn?: string;
    sectors: SectorId[];
    userId: UserId;
    indigenousOwned?: boolean;
    supplyNationNumber?: string;
  }): Promise<Organisation>;

  selectSectors(orgId: OrgId, sectors: SectorId[]): Promise<Organisation>;
  runInitialAssessment(orgId: OrgId, sector: SectorId): Promise<ComplianceAssessment>;
}

// === 8. INotificationPort ===
export interface INotificationPort {
  send(params: {
    orgId: OrgId;
    userId?: UserId;
    type: Notification["type"];
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<Notification>;

  getUnread(orgId: OrgId, userId: UserId): Promise<Notification[]>;
  markRead(notificationId: string, userId: UserId): Promise<void>;
  markAllRead(orgId: OrgId, userId: UserId): Promise<void>;
}

// === 9. ICalendarPort ===
export interface CalendarDeadline {
  id: string;
  title: string;
  dueDate: string;
  sector: SectorId;
  type: "finding_due" | "program_renewal" | "document_expiry" | "regulatory_deadline" | "audit_due";
  severity: RiskLevel;
  entityId: string;
}

export interface ICalendarPort {
  getDeadlines(orgId: OrgId, from: string, to: string): Promise<CalendarDeadline[]>;
  getUpcoming(orgId: OrgId, days: number): Promise<CalendarDeadline[]>;
  addReminder(deadline: CalendarDeadline): Promise<void>;
}
