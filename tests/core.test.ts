// ============================================================================
// TESTS: Core Domain — Entities, Value Objects, Business Rules
// Pattern: Gold's phase1.test.ts + Green's core.test.ts
// Run: npm run test:core
// ============================================================================
import { describe, it, expect } from "vitest";

// Value Objects
import {
  createABN, isValidABN, isValidSector, isValidRiskLevel,
  canTransitionFinding, complianceStatusPriority, riskLevelToNumber,
  canApprove,
} from "../src/core/value-objects";

// Entities
import {
  createOrganisation, addSector, changeTier,
  createAssessment, completeAssessment, failAssessment,
  createFinding, transitionFinding, assignFinding, linkEvidence,
  createProgram, addProgramVersion, approveProgram, getProgramVersionAtDate,
  createDocument, canDeleteDocument, isDocumentExpiring,
  createNotification, markRead,
  calculateOverallRisk, calculateComplianceScore,
} from "../src/core/entities";

// Rules
import {
  requiresEscalation, aggregateRiskLevel, overallComplianceStatus,
  calculateScore, getReportingDeadlineDays, isProgramRenewalDue,
  requiresWorkerScreening, getScreeningType, requiresSWMS,
  getFatigueManagementType, getMaxSectors, getAgentCallLimit,
  isFeatureAvailable, getRequiredDocumentCategories,
} from "../src/core/rules";

// Errors
import {
  ValidationError, StateTransitionError, NotFoundError,
} from "../src/core/errors";

// ── VALUE OBJECTS ──

describe("ABN", () => {
  it("creates valid ABN", () => {
    const abn = createABN("51 824 753 556");
    expect(abn.value).toBe("51824753556");
  });

  it("rejects invalid ABN length", () => {
    expect(() => createABN("1234")).toThrow("must be 11 digits");
  });

  it("rejects invalid check digit", () => {
    expect(() => createABN("11111111111")).toThrow("check digit failed");
  });

  it("isValidABN returns boolean", () => {
    expect(isValidABN("51 824 753 556")).toBe(true);
    expect(isValidABN("00000000000")).toBe(false);
  });
});

describe("Sector validation", () => {
  it("validates known sectors", () => {
    expect(isValidSector("ndis")).toBe(true);
    expect(isValidSector("transport")).toBe(true);
    expect(isValidSector("fake_sector")).toBe(false);
  });
});

describe("Finding transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionFinding("open", "in_progress")).toBe(true);
    expect(canTransitionFinding("in_progress", "remediated")).toBe(true);
    expect(canTransitionFinding("remediated", "closed")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionFinding("closed", "remediated")).toBe(false);
    expect(canTransitionFinding("open", "remediated")).toBe(false);
  });
});

describe("Governance roles", () => {
  it("owner and admin can approve", () => {
    expect(canApprove("owner")).toBe(true);
    expect(canApprove("admin")).toBe(true);
    expect(canApprove("compliance_officer")).toBe(true);
  });

  it("viewer cannot approve", () => {
    expect(canApprove("viewer")).toBe(false);
    expect(canApprove("manager")).toBe(false);
  });
});

// ── ENTITIES ──

describe("Organisation", () => {
  it("creates with defaults", () => {
    const org = createOrganisation({ id: "org_1" as any, name: "Test Org" });
    expect(org.name).toBe("Test Org");
    expect(org.tier).toBe("starter");
    expect(org.sectors).toEqual([]);
  });

  it("rejects empty name", () => {
    expect(() => createOrganisation({ id: "org_1" as any, name: "  " })).toThrow();
  });

  it("adds sector", () => {
    const org = createOrganisation({ id: "org_1" as any, name: "Test" });
    const updated = addSector(org, "ndis");
    expect(updated.sectors).toContain("ndis");
  });

  it("deduplicates sectors", () => {
    const org = createOrganisation({ id: "org_1" as any, name: "Test", sectors: ["ndis"] });
    const updated = addSector(org, "ndis");
    expect(updated.sectors.length).toBe(1);
  });
});

describe("ComplianceAssessment", () => {
  it("creates in pending state", () => {
    const a = createAssessment({
      id: "asmt_1" as any, orgId: "org_1" as any,
      userId: "user_1" as any, sector: "ndis",
    });
    expect(a.status).toBe("pending");
    expect(a.score).toBeNull();
  });

  it("completes with results", () => {
    const a = createAssessment({
      id: "asmt_1" as any, orgId: "org_1" as any,
      userId: "user_1" as any, sector: "ndis",
    });
    const completed = completeAssessment(a, {
      riskLevel: "medium", overallStatus: "partial",
      score: 72, findingCount: 5, summary: "Good", agentRunId: "run_1",
    });
    expect(completed.status).toBe("completed");
    expect(completed.score).toBe(72);
    expect(completed.completedAt).toBeTruthy();
  });

  it("clamps score to 0-100", () => {
    const a = createAssessment({
      id: "asmt_1" as any, orgId: "org_1" as any,
      userId: "user_1" as any, sector: "ndis",
    });
    const completed = completeAssessment(a, {
      riskLevel: "low", overallStatus: "compliant",
      score: 150, findingCount: 0, summary: "Over", agentRunId: "run_1",
    });
    expect(completed.score).toBe(100);
  });
});

describe("Finding", () => {
  it("creates in open state", () => {
    const f = createFinding({
      id: "f_1" as any, assessmentId: "a_1" as any,
      orgId: "org_1" as any, sector: "ndis",
      title: "Missing policy", description: "No incident policy",
      severity: "high",
    });
    expect(f.status).toBe("open");
    expect(f.evidenceIds).toEqual([]);
  });

  it("transitions to in_progress", () => {
    const f = createFinding({
      id: "f_1" as any, assessmentId: "a_1" as any,
      orgId: "org_1" as any, sector: "ndis",
      title: "Gap", description: "Desc", severity: "medium",
    });
    const updated = transitionFinding(f, "in_progress");
    expect(updated.status).toBe("in_progress");
  });

  it("throws on invalid transition", () => {
    const f = createFinding({
      id: "f_1" as any, assessmentId: "a_1" as any,
      orgId: "org_1" as any, sector: "ndis",
      title: "Gap", description: "Desc", severity: "medium",
    });
    expect(() => transitionFinding(f, "remediated")).toThrow();
  });
});

describe("ComplianceProgram versioning", () => {
  it("creates with version 1", () => {
    const p = createProgram({
      id: "prog_1" as any, orgId: "org_1" as any,
      sector: "ndis", title: "NDIS Program",
      content: "Initial content", createdBy: "user_1",
    });
    expect(p.currentVersion).toBe(1);
    expect(p.versions.length).toBe(1);
    expect(p.status).toBe("draft");
  });

  it("adds versions immutably", () => {
    const p = createProgram({
      id: "prog_1" as any, orgId: "org_1" as any,
      sector: "ndis", title: "NDIS Program",
      content: "V1", createdBy: "user_1",
    });
    const v2 = addProgramVersion(p, "V2 content", "user_1", "Updated section 3");
    expect(v2.currentVersion).toBe(2);
    expect(v2.versions.length).toBe(2);
    expect(p.currentVersion).toBe(1); // Original unchanged
  });

  it("approves program", () => {
    const p = createProgram({
      id: "prog_1" as any, orgId: "org_1" as any,
      sector: "ndis", title: "Test", content: "C", createdBy: "u1",
    });
    const approved = approveProgram(p, "admin_1" as any);
    expect(approved.status).toBe("active");
    expect(approved.approvedBy).toBe("admin_1");
  });
});

// ── BUSINESS RULES ──

describe("Assessment rules", () => {
  const criticalFinding = createFinding({
    id: "f_1" as any, assessmentId: "a_1" as any,
    orgId: "org_1" as any, sector: "ndis",
    title: "Critical gap", description: "D", severity: "critical",
  });

  const mediumFinding = createFinding({
    id: "f_2" as any, assessmentId: "a_1" as any,
    orgId: "org_1" as any, sector: "ndis",
    title: "Medium gap", description: "D", severity: "medium",
  });

  it("escalates when critical finding exists", () => {
    expect(requiresEscalation([criticalFinding])).toBe(true);
    expect(requiresEscalation([mediumFinding])).toBe(false);
  });

  it("calculates aggregate risk", () => {
    expect(aggregateRiskLevel([criticalFinding])).toBe("critical");
    expect(aggregateRiskLevel([mediumFinding])).toBe("medium");
    expect(aggregateRiskLevel([])).toBe("low");
  });
});

describe("Sector-specific rules", () => {
  it("NDIS/aged care require worker screening", () => {
    expect(requiresWorkerScreening("ndis")).toBe(true);
    expect(requiresWorkerScreening("aged_care")).toBe(true);
    expect(requiresWorkerScreening("construction")).toBe(false);
  });

  it("returns screening type per sector", () => {
    expect(getScreeningType("ndis")).toContain("NDIS Worker Screening");
    expect(getScreeningType("construction")).toBeNull();
  });

  it("SWMS required for high-risk construction work", () => {
    expect(requiresSWMS("Working at height")).toBe(true);
    expect(requiresSWMS("Office paperwork")).toBe(false);
  });

  it("fatigue management types", () => {
    expect(getFatigueManagementType(30)).toBe("standard");
    expect(getFatigueManagementType(50)).toBe("bfm");
    expect(getFatigueManagementType(70)).toBe("afm");
  });
});

describe("Tier rules", () => {
  it("sector limits per tier", () => {
    expect(getMaxSectors("starter")).toBe(1);
    expect(getMaxSectors("professional")).toBe(3);
    expect(getMaxSectors("enterprise")).toBe(6);
  });

  it("agent call limits per tier", () => {
    expect(getAgentCallLimit("starter")).toBe(100);
    expect(getAgentCallLimit("enterprise")).toBe(Infinity);
  });

  it("feature gating", () => {
    expect(isFeatureAvailable("starter", "audit_reports")).toBe(false);
    expect(isFeatureAvailable("professional", "audit_reports")).toBe(true);
    expect(isFeatureAvailable("starter", "api_access")).toBe(false);
    expect(isFeatureAvailable("enterprise", "api_access")).toBe(true);
  });
});

// ── ERRORS ──

describe("Domain errors", () => {
  it("ValidationError has code", () => {
    const err = new ValidationError("Bad input");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.name).toBe("ValidationError");
  });

  it("StateTransitionError captures from/to", () => {
    const err = new StateTransitionError("Finding", "open", "closed");
    expect(err.context?.from).toBe("open");
    expect(err.context?.to).toBe("closed");
  });

  it("NotFoundError captures entity and id", () => {
    const err = new NotFoundError("Assessment", "asmt_123");
    expect(err.message).toContain("asmt_123");
  });
});
