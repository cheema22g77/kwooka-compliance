// ============================================================================
// RING 1: VALUE OBJECTS — ZERO IMPORTS — PURE TYPESCRIPT
// Kwooka Compliance V2 — Branded Types + Domain Primitives
// Pattern: Gold's Ring 1 value objects with Compliance-specific types
// ============================================================================

// === BRANDED TYPES ===
// Prevents accidentally passing a raw string where a typed ID is expected
type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type AssessmentId = Brand<string, "AssessmentId">;
export type FindingId = Brand<string, "FindingId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type DocumentId = Brand<string, "DocumentId">;
export type PlaybookId = Brand<string, "PlaybookId">;
export type ProgramId = Brand<string, "ProgramId">;
export type NotificationId = Brand<string, "NotificationId">;
export type AgentRunId = Brand<string, "AgentRunId">;

// === ID FACTORIES ===
export function createOrgId(raw: string): OrgId { return raw as OrgId; }
export function createUserId(raw: string): UserId { return raw as UserId; }
export function createAssessmentId(raw: string): AssessmentId { return raw as AssessmentId; }
export function createFindingId(raw: string): FindingId { return raw as FindingId; }
export function createEvidenceId(raw: string): EvidenceId { return raw as EvidenceId; }
export function createDocumentId(raw: string): DocumentId { return raw as DocumentId; }
export function createPlaybookId(raw: string): PlaybookId { return raw as PlaybookId; }
export function createProgramId(raw: string): ProgramId { return raw as ProgramId; }
export function createNotificationId(raw: string): NotificationId { return raw as NotificationId; }
export function createAgentRunId(raw: string): AgentRunId { return raw as AgentRunId; }

// === 1. ABN — 11-digit Australian Business Number with check-digit ===
// Direct from Gold
export interface ABN {
  readonly value: string;
}

export function createABN(raw: string): ABN {
  const digits = raw.replace(/\s/g, "");
  if (!/^\d{11}$/.test(digits)) {
    throw new Error(`Invalid ABN: must be 11 digits, got "${raw}"`);
  }
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const chars = digits.split("").map(Number);
  chars[0] = (chars[0] ?? 0) - 1;
  const sum = chars.reduce((acc, d, i) => acc + d * (weights[i] ?? 0), 0);
  if (sum % 89 !== 0) {
    throw new Error(`Invalid ABN: check digit failed for "${raw}"`);
  }
  return { value: digits };
}

export function isValidABN(raw: string): boolean {
  try {
    createABN(raw);
    return true;
  } catch {
    return false;
  }
}

// === 2. SECTOR — The 6 Australian compliance sectors ===
export const SECTOR_IDS = [
  "ndis",
  "aged_care",
  "healthcare",
  "transport",
  "workplace",
  "construction",
] as const;

export type SectorId = (typeof SECTOR_IDS)[number];

export function isValidSector(value: string): value is SectorId {
  return SECTOR_IDS.includes(value as SectorId);
}

// === 3. RISK LEVEL ===
export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export function isValidRiskLevel(value: string): value is RiskLevel {
  return RISK_LEVELS.includes(value as RiskLevel);
}

export function riskLevelToNumber(level: RiskLevel): number {
  const map: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[level];
}

export function numberToRiskLevel(n: number): RiskLevel {
  if (n <= 1) return "low";
  if (n <= 2) return "medium";
  if (n <= 3) return "high";
  return "critical";
}

// === 4. COMPLIANCE STATUS ===
export const COMPLIANCE_STATUSES = [
  "compliant",
  "partial",
  "gap",
  "not_addressed",
  "critical",
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export function isValidComplianceStatus(value: string): value is ComplianceStatus {
  return COMPLIANCE_STATUSES.includes(value as ComplianceStatus);
}

export function complianceStatusPriority(status: ComplianceStatus): number {
  const map: Record<ComplianceStatus, number> = {
    critical: 5,
    gap: 4,
    not_addressed: 3,
    partial: 2,
    compliant: 1,
  };
  return map[status];
}

// === 5. FINDING SEVERITY ===
export const FINDING_SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

// === 6. FINDING STATUS ===
export const FINDING_STATUSES = [
  "open",
  "in_progress",
  "remediated",
  "accepted_risk",
  "closed",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export function canTransitionFinding(from: FindingStatus, to: FindingStatus): boolean {
  const allowed: Record<FindingStatus, FindingStatus[]> = {
    open: ["in_progress", "accepted_risk", "closed"],
    in_progress: ["remediated", "accepted_risk", "open"],
    remediated: ["closed", "open"],
    accepted_risk: ["open", "closed"],
    closed: ["open"], // reopen
  };
  return (allowed[from] ?? []).includes(to);
}

// === 7. ASSESSMENT STATUS ===
export const ASSESSMENT_STATUSES = [
  "pending",
  "analysing",
  "completed",
  "failed",
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

// === 8. DOCUMENT CATEGORY ===
export const DOCUMENT_CATEGORIES = [
  "policy",
  "procedure",
  "evidence",
  "certificate",
  "audit_report",
  "compliance_program",
  "risk_assessment",
  "training_record",
  "incident_report",
  "other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

// === 9. SUBSCRIPTION TIER ===
export const SUBSCRIPTION_TIERS = ["starter", "professional", "enterprise"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

// === 10. GOVERNANCE ROLE ===
export const GOVERNANCE_ROLES = [
  "owner",
  "admin",
  "compliance_officer",
  "manager",
  "viewer",
] as const;
export type GovernanceRole = (typeof GOVERNANCE_ROLES)[number];

export function canApprove(role: GovernanceRole): boolean {
  return role === "owner" || role === "admin" || role === "compliance_officer";
}

// === 11. NOTIFICATION TYPE ===
export const NOTIFICATION_TYPES = [
  "assessment_complete",
  "finding_escalated",
  "deadline_approaching",
  "legislation_change",
  "document_expiring",
  "program_review_due",
  "system_alert",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// === 12. DOCUMENT VERSION — Immutable, from Gold's versioning engine ===
export interface DocumentVersion {
  readonly version: number;
  readonly content: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly changeNote: string | null;
}

// === SECTOR CONFIG — Enhanced from existing sectors.ts ===
export interface SectorConfig {
  readonly id: SectorId;
  readonly name: string;
  readonly fullName: string;
  readonly authority: string;
  readonly icon: string;
  readonly color: string;
  readonly keyAreas: readonly string[];
  readonly regulations: readonly string[];
  readonly authorities: readonly string[];
  readonly suggestedPrompts: readonly string[];
  readonly retentionYears: number;
  readonly renewalMonths: number;
  readonly reportingDeadlineDays: number;
}

export const SECTORS: Record<SectorId, SectorConfig> = {
  ndis: {
    id: "ndis",
    name: "NDIS",
    fullName: "NDIS Practice Standards",
    authority: "NDIS Quality and Safeguards Commission",
    icon: "Shield",
    color: "orange",
    keyAreas: [
      "Rights and Responsibilities",
      "Governance and Operational Management",
      "Provision of Supports",
      "Support Provision Environment",
      "Worker Screening",
      "Incident Management",
      "Complaints Management",
      "Restrictive Practices",
    ],
    regulations: [
      "NDIS Act 2013",
      "NDIS Practice Standards",
      "NDIS Code of Conduct",
      "NDIS Quality and Safeguards Framework",
      "Worker Screening Requirements",
    ],
    authorities: ["NDIS Quality and Safeguards Commission", "NDIA"],
    suggestedPrompts: [
      "What are the NDIS Practice Standards?",
      "Explain worker screening requirements",
      "What are reportable incidents under NDIS?",
      "How do I manage restrictive practices?",
    ],
    retentionYears: 7,
    renewalMonths: 36,
    reportingDeadlineDays: 5,
  },
  transport: {
    id: "transport",
    name: "Transport",
    fullName: "Heavy Vehicle National Law (HVNL)",
    authority: "National Heavy Vehicle Regulator (NHVR)",
    icon: "Truck",
    color: "blue",
    keyAreas: [
      "Chain of Responsibility",
      "Fatigue Management",
      "Speed Compliance",
      "Mass & Loading",
      "Vehicle Standards",
      "Driver Competency",
      "Journey Management",
      "Record Keeping",
    ],
    regulations: [
      "Heavy Vehicle National Law (HVNL)",
      "Chain of Responsibility (CoR)",
      "Fatigue Management Standards",
      "Work Diary Requirements",
      "Mass, Dimension and Loading Requirements",
      "National Heavy Vehicle Accreditation Scheme (NHVAS)",
    ],
    authorities: ["National Heavy Vehicle Regulator (NHVR)", "Main Roads WA", "Transport WA"],
    suggestedPrompts: [
      "Explain driver fatigue management requirements",
      "What are my CoR obligations as a consignor?",
      "How do I maintain NHVAS accreditation?",
      "What records must I keep for work diaries?",
    ],
    retentionYears: 7,
    renewalMonths: 12,
    reportingDeadlineDays: 2,
  },
  healthcare: {
    id: "healthcare",
    name: "Healthcare",
    fullName: "National Safety and Quality Health Service Standards",
    authority: "Australian Commission on Safety and Quality in Health Care",
    icon: "Heart",
    color: "red",
    keyAreas: [
      "Clinical Governance",
      "Partnering with Consumers",
      "Infection Prevention",
      "Medication Safety",
      "Patient Identification",
      "Clinical Handover",
      "Blood Management",
      "Recognising Deterioration",
    ],
    regulations: [
      "Health Practitioner Regulation National Law",
      "Australian Health Service Safety and Quality Standards",
      "Private Health Facilities Act",
      "Medicines and Poisons Act",
    ],
    authorities: [
      "AHPRA",
      "Australian Commission on Safety and Quality in Health Care",
      "WA Department of Health",
    ],
    suggestedPrompts: [
      "What clinical governance requirements apply?",
      "How do I manage medication compliance?",
      "Explain infection control standards",
      "What patient safety incidents must be reported?",
    ],
    retentionYears: 7,
    renewalMonths: 36,
    reportingDeadlineDays: 3,
  },
  aged_care: {
    id: "aged_care",
    name: "Aged Care",
    fullName: "Aged Care Quality Standards",
    authority: "Aged Care Quality and Safety Commission",
    icon: "Users",
    color: "purple",
    keyAreas: [
      "Consumer Dignity and Choice",
      "Ongoing Assessment and Planning",
      "Personal Care and Clinical Care",
      "Services and Supports",
      "Organisation Service Environment",
      "Feedback and Complaints",
      "Human Resources",
      "Organisational Governance",
    ],
    regulations: [
      "Aged Care Act 1997",
      "Aged Care Quality Standards",
      "Serious Incident Response Scheme (SIRS)",
    ],
    authorities: ["Aged Care Quality and Safety Commission", "Department of Health and Aged Care"],
    suggestedPrompts: [
      "Explain the 8 Aged Care Quality Standards",
      "What incidents must be reported to SIRS?",
      "What are the care minute requirements?",
      "How do I manage restraint compliance?",
    ],
    retentionYears: 7,
    renewalMonths: 36,
    reportingDeadlineDays: 1,
  },
  workplace: {
    id: "workplace",
    name: "Workplace Safety",
    fullName: "Work Health and Safety Act & Regulations",
    authority: "WorkSafe / SafeWork Australia",
    icon: "HardHat",
    color: "yellow",
    keyAreas: [
      "PCBU Duties",
      "Risk Management",
      "Consultation",
      "Training & Competency",
      "Incident Notification",
      "Hazardous Work",
      "Emergency Procedures",
      "Worker Health Monitoring",
    ],
    regulations: [
      "Work Health and Safety Act 2020 (WA)",
      "WHS Regulations",
      "Codes of Practice",
      "Fair Work Act",
    ],
    authorities: ["WorkSafe WA", "Fair Work Commission", "Fair Work Ombudsman"],
    suggestedPrompts: [
      "What are PCBU duties under WHS?",
      "How do I conduct a risk assessment?",
      "What incidents must be notified to WorkSafe?",
      "Explain psychosocial hazard requirements",
    ],
    retentionYears: 7,
    renewalMonths: 12,
    reportingDeadlineDays: 2,
  },
  construction: {
    id: "construction",
    name: "Construction",
    fullName: "WHS Regulations - Construction Work",
    authority: "WorkSafe",
    icon: "Building",
    color: "amber",
    keyAreas: [
      "Safe Work Method Statements",
      "Principal Contractor Duties",
      "High Risk Work Licensing",
      "Working at Heights",
      "Excavation Safety",
      "Asbestos Management",
      "Electrical Safety",
      "Plant & Equipment",
    ],
    regulations: [
      "WHS Regulations - Construction Work",
      "Building Act 2011 (WA)",
      "High Risk Work Licensing",
    ],
    authorities: ["WorkSafe WA", "Building and Energy WA"],
    suggestedPrompts: [
      "When do I need a SWMS?",
      "What are principal contractor obligations?",
      "Explain high risk work licensing",
      "What asbestos requirements apply?",
    ],
    retentionYears: 7,
    renewalMonths: 12,
    reportingDeadlineDays: 2,
  },
};

export function getSectorConfig(sector: string): SectorConfig | undefined {
  return SECTORS[sector as SectorId];
}
