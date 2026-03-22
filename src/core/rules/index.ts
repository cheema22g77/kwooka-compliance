// ============================================================================
// RING 1: BUSINESS RULES — ZERO IMPORTS OUTSIDE CORE
// Per Australian regulatory frameworks across 6 sectors
// Pattern: Gold's rules engine — pure functions, no side effects
// ============================================================================
import type {
  SectorId, RiskLevel, FindingSeverity, FindingStatus,
  ComplianceStatus, GovernanceRole, DocumentCategory,
} from "../value-objects";
import { SECTORS } from "../value-objects";
import type { Finding, ComplianceAssessment, ComplianceDocument, Playbook } from "../entities";

// ============================================================================
// ASSESSMENT RULES
// ============================================================================

/** ASM-001: Determine if an assessment requires immediate escalation */
export function requiresEscalation(findings: readonly Finding[]): boolean {
  return findings.some(f => f.severity === "critical" && f.status === "open");
}

/** ASM-002: Calculate aggregate risk from findings */
export function aggregateRiskLevel(findings: readonly Finding[]): RiskLevel {
  if (findings.length === 0) return "low";

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;

  if (criticalCount >= 1) return "critical";
  if (highCount >= 3) return "critical";
  if (highCount >= 1) return "high";
  if (findings.some(f => f.severity === "medium")) return "medium";
  return "low";
}

/** ASM-003: Determine overall compliance status from findings */
export function overallComplianceStatus(findings: readonly Finding[]): ComplianceStatus {
  if (findings.length === 0) return "compliant";

  const openFindings = findings.filter(f => f.status === "open" || f.status === "in_progress");
  if (openFindings.some(f => f.severity === "critical")) return "critical";
  if (openFindings.some(f => f.severity === "high")) return "gap";
  if (openFindings.length > 0) return "partial";
  return "compliant";
}

/** ASM-004: Calculate compliance score (0-100) */
export function calculateScore(findings: readonly Finding[], totalRequirements: number): number {
  if (totalRequirements === 0) return 100;
  const gapCount = findings.filter(
    f => f.status === "open" || f.status === "in_progress"
  ).length;
  return Math.max(0, Math.round(((totalRequirements - gapCount) / totalRequirements) * 100));
}

// ============================================================================
// REPORTING & DEADLINE RULES
// ============================================================================

/** RPT-001: Get mandatory reporting deadline in days for a sector */
export function getReportingDeadlineDays(sector: SectorId): number {
  return SECTORS[sector].reportingDeadlineDays;
}

/** RPT-002: Is a finding past its reporting deadline? */
export function isPastReportingDeadline(finding: Finding): boolean {
  if (finding.severity !== "critical" && finding.severity !== "high") return false;
  const deadlineDays = getReportingDeadlineDays(finding.sector);
  const createdAt = new Date(finding.createdAt);
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + deadlineDays);
  return new Date() > deadline;
}

/** RPT-003: Get all overdue findings */
export function getOverdueFindings(findings: readonly Finding[]): Finding[] {
  return findings.filter(f =>
    (f.status === "open" || f.status === "in_progress") &&
    f.dueDate &&
    new Date(f.dueDate) < new Date()
  );
}

/** RPT-004: NDIS — Reportable incidents must be reported within 24 hours */
export function isNDISReportableIncident(finding: Finding): boolean {
  if (finding.sector !== "ndis") return false;
  const reportableKeywords = [
    "abuse", "neglect", "restrictive practice", "death",
    "serious injury", "sexual misconduct", "exploitation",
  ];
  const text = `${finding.title} ${finding.description}`.toLowerCase();
  return reportableKeywords.some(kw => text.includes(kw));
}

/** RPT-005: Aged Care — SIRS reporting within 24 hours for Priority 1 */
export function isSIRSPriority1(finding: Finding): boolean {
  if (finding.sector !== "aged_care") return false;
  const priority1Keywords = [
    "death", "serious injury", "sexual assault", "abuse",
    "neglect", "missing consumer", "restrictive practice",
  ];
  const text = `${finding.title} ${finding.description}`.toLowerCase();
  return priority1Keywords.some(kw => text.includes(kw));
}

/** RPT-006: WHS — Notifiable incidents to WorkSafe immediately */
export function isNotifiableWHSIncident(finding: Finding): boolean {
  if (finding.sector !== "workplace" && finding.sector !== "construction") return false;
  const notifiableKeywords = [
    "death", "serious injury", "amputation", "electric shock",
    "dangerous incident", "collapse", "explosion",
  ];
  const text = `${finding.title} ${finding.description}`.toLowerCase();
  return notifiableKeywords.some(kw => text.includes(kw));
}

// ============================================================================
// DOCUMENT & RETENTION RULES
// ============================================================================

/** DOC-001: Minimum retention period per sector (years) */
export function getRetentionYears(sector: SectorId): number {
  return SECTORS[sector].retentionYears; // All currently 7 years
}

/** DOC-002: Can a document be deleted (retention period elapsed)? */
export function canDeleteByRetention(retentionUntil: string): boolean {
  return new Date() >= new Date(retentionUntil);
}

/** DOC-003: Get documents expiring within N days */
export function isExpiringWithin(expiresAt: string | null, days: number): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return expiry <= threshold && expiry > new Date();
}

/** DOC-004: Required document categories by sector */
export function getRequiredDocumentCategories(sector: SectorId): DocumentCategory[] {
  const base: DocumentCategory[] = ["policy", "procedure", "risk_assessment", "compliance_program"];

  const sectorSpecific: Partial<Record<SectorId, DocumentCategory[]>> = {
    ndis: ["training_record", "incident_report"],
    aged_care: ["training_record", "incident_report"],
    healthcare: ["certificate", "training_record", "incident_report"],
    construction: ["certificate"], // High risk work licences
    transport: ["certificate"], // Driver competency records
    workplace: ["training_record", "incident_report"],
  };

  return [...base, ...(sectorSpecific[sector] ?? [])];
}

// ============================================================================
// PROGRAM RULES
// ============================================================================

/** PRG-001: Program renewal due? */
export function isProgramRenewalDue(
  sector: SectorId,
  lastApprovedAt: string | null
): boolean {
  if (!lastApprovedAt) return true;
  const renewalMonths = SECTORS[sector].renewalMonths;
  const approved = new Date(lastApprovedAt);
  approved.setMonth(approved.getMonth() + renewalMonths);
  return new Date() >= approved;
}

/** PRG-002: Does a legislation change require program review? */
export function requiresProgramReview(impactLevel: RiskLevel): boolean {
  return impactLevel === "high" || impactLevel === "critical";
}

/** PRG-003: Approval role required for program changes */
export function getProgramApprovalRole(): GovernanceRole {
  return "compliance_officer";
}

// ============================================================================
// WORKER SCREENING RULES
// ============================================================================

/** WRK-001: Does this sector require worker screening? */
export function requiresWorkerScreening(sector: SectorId): boolean {
  return sector === "ndis" || sector === "aged_care" || sector === "healthcare";
}

/** WRK-002: Worker screening check type */
export function getScreeningType(sector: SectorId): string | null {
  const types: Partial<Record<SectorId, string>> = {
    ndis: "NDIS Worker Screening Check",
    aged_care: "National Police Check + NDIS Worker Screening",
    healthcare: "Working with Children Check + National Police Check",
  };
  return types[sector] ?? null;
}

/** WRK-003: Construction — High risk work licence required? */
export function requiresHighRiskWorkLicence(activityDescription: string): boolean {
  const highRiskActivities = [
    "scaffolding", "crane", "hoist", "forklift",
    "rigging", "dogging", "explosive", "confined space",
    "working at heights", "demolition",
  ];
  const lower = activityDescription.toLowerCase();
  return highRiskActivities.some(a => lower.includes(a));
}

// ============================================================================
// SECTOR-SPECIFIC RULES
// ============================================================================

/** SEC-001: NDIS — Restrictive practices require behaviour support plan */
export function requiresBehaviourSupportPlan(finding: Finding): boolean {
  if (finding.sector !== "ndis") return false;
  return finding.title.toLowerCase().includes("restrictive practice") ||
    finding.description.toLowerCase().includes("restrictive practice");
}

/** SEC-002: Transport — Chain of Responsibility parties */
export const COR_PARTIES = [
  "employer",
  "prime_contractor",
  "operator",
  "scheduler",
  "consignor",
  "consignee",
  "packer",
  "loader",
  "unloader",
] as const;

/** SEC-003: Transport — Fatigue management type required */
export function getFatigueManagementType(hoursPerWeek: number): "standard" | "bfm" | "afm" {
  if (hoursPerWeek <= 36) return "standard";
  if (hoursPerWeek <= 60) return "bfm"; // Basic Fatigue Management
  return "afm"; // Advanced Fatigue Management
}

/** SEC-004: Healthcare — Clinical governance requirements */
export function getClinicalGovernanceRequirements(): string[] {
  return [
    "Clinical governance framework",
    "Credentialing and scope of practice",
    "Clinical audit and monitoring",
    "Incident management and reporting",
    "Consumer feedback and complaints",
    "Open disclosure",
    "Clinical handover",
    "Deteriorating patient response",
  ];
}

/** SEC-005: Aged Care — Care minute requirements */
export function getMinimumCareMinutes(): { registered: number; total: number } {
  return { registered: 44, total: 215 }; // per resident per day
}

/** SEC-006: Construction — SWMS required for high-risk work */
export function requiresSWMS(activityDescription: string): boolean {
  const highRiskActivities = [
    "height", "trench", "demolition", "asbestos",
    "confined space", "electrical", "pressurised",
    "structural alteration", "telecommunication tower",
    "diving", "explosive",
  ];
  const lower = activityDescription.toLowerCase();
  return highRiskActivities.some(a => lower.includes(a));
}

// ============================================================================
// TIER / FEATURE GATING RULES
// ============================================================================

/** TIER-001: Maximum sectors per tier */
export function getMaxSectors(tier: "starter" | "professional" | "enterprise"): number {
  const limits = { starter: 1, professional: 3, enterprise: 6 };
  return limits[tier];
}

/** TIER-002: Monthly AI agent call limits */
export function getAgentCallLimit(tier: "starter" | "professional" | "enterprise"): number {
  const limits = { starter: 100, professional: 500, enterprise: Infinity };
  return limits[tier];
}

/** TIER-003: Feature availability */
export function isFeatureAvailable(
  tier: "starter" | "professional" | "enterprise",
  feature: "audit_reports" | "api_access" | "custom_playbooks" | "bulk_analysis" | "webhooks"
): boolean {
  const access: Record<string, ("starter" | "professional" | "enterprise")[]> = {
    audit_reports: ["professional", "enterprise"],
    api_access: ["enterprise"],
    custom_playbooks: ["enterprise"],
    bulk_analysis: ["professional", "enterprise"],
    webhooks: ["enterprise"],
  };
  return (access[feature] ?? []).includes(tier);
}
