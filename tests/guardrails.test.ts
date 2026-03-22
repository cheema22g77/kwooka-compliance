// ============================================================================
// TESTS: Guardrail Pipeline — L1 Schema, L2 Grounding, L3 Business Rules, L4 Safety
// Pure logic tests — no external services needed
// Run: npx vitest run tests/guardrails.test.ts
// ============================================================================
import { describe, it, expect } from "vitest";
import { runGuardrails } from "../src/guardrails";
import { validateAnalysisOutput } from "../src/guardrails/validate-analysis";

// ── L1: Schema Validation ──

describe("L1: Schema Validation", () => {
  it("passes valid JSON object", async () => {
    const result = await runGuardrails(
      '{"findings": [], "summary": "All compliant"}',
      { agentName: "compliance-analyser" },
    );
    expect(result.passed).toBe(true);
  });

  it("passes JSON wrapped in code blocks", async () => {
    const raw = '```json\n{"findings": [], "summary": "ok"}\n```';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });

  it("rejects non-object JSON for structured agents", async () => {
    const result = await runGuardrails('"just a string"', {
      agentName: "compliance-analyser",
    });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("schema");
  });

  it("rejects analysis without findings or summary", async () => {
    const result = await runGuardrails('{"score": 50}', {
      agentName: "compliance-analyser",
    });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("schema");
    expect(result.reason).toContain("findings or summary");
  });

  it("rejects analysis with out-of-range score", async () => {
    const result = await runGuardrails(
      '{"findings": [], "summary": "ok", "score": 150}',
      { agentName: "compliance-analyser" },
    );
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("schema");
    expect(result.reason).toContain("Score must be");
  });

  it("rejects policy without content or sections", async () => {
    const result = await runGuardrails('{"title": "Policy"}', {
      agentName: "policy-generator",
    });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("schema");
  });

  it("passes plain text for copilot agent", async () => {
    const result = await runGuardrails("Here is some compliance advice.", {
      agentName: "copilot",
    });
    expect(result.passed).toBe(true);
  });

  it("passes plain text for onboarding agent", async () => {
    const result = await runGuardrails("Welcome to Kwooka!", {
      agentName: "onboarding",
    });
    expect(result.passed).toBe(true);
  });
});

// ── L2: Grounding Check ──

describe("L2: Grounding Check", () => {
  it("passes references to real Australian legislation", async () => {
    const raw = '{"findings": [{"regulation": "NDIS Act 2013 Section 73"}], "summary": "ok"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });

  it("rejects fabricated regulation names", async () => {
    const raw = '{"findings": [], "summary": "Under the Compliance Regulation Act 2024"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("grounding");
    expect(result.reason).toContain("fabricated regulation");
  });

  it("rejects Australian Compliance Standard pattern", async () => {
    const raw = '{"findings": [], "summary": "Australian Compliance Standard 123"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("grounding");
  });

  it("rejects suspiciously high section numbers", async () => {
    const raw = '{"findings": [], "summary": "Refer to Section 999 of the Act"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("grounding");
    expect(result.reason).toContain("Section 999");
  });

  it("allows reasonable section numbers", async () => {
    const raw = '{"findings": [], "summary": "See Section 47 of the WHS Act"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });
});

// ── L3: Business Rules ──

describe("L3: Business Rules", () => {
  it("rejects low risk with low score (inconsistent)", async () => {
    const raw = '{"findings": [], "summary": "ok", "riskLevel": "low", "score": 20}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("business_rules");
    expect(result.reason).toContain("Inconsistent");
  });

  it("rejects critical risk with high score (inconsistent)", async () => {
    const raw = '{"findings": [], "summary": "ok", "riskLevel": "critical", "score": 80}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("business_rules");
  });

  it("passes consistent risk and score", async () => {
    const raw = '{"findings": [], "summary": "ok", "riskLevel": "high", "score": 35}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });

  it("rejects invalid severity values", async () => {
    const raw = '{"findings": [{"severity": "extreme"}], "summary": "ok"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("business_rules");
    expect(result.reason).toContain("Invalid severity");
  });

  it("passes valid severity values", async () => {
    const raw = '{"findings": [{"severity": "critical"}, {"severity": "low"}], "summary": "ok"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });

  it("rejects invalid compliance status values", async () => {
    const raw = '{"findings": [{"status": "good"}], "summary": "ok"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("business_rules");
    expect(result.reason).toContain("Invalid compliance status");
  });
});

// ── L4: Safety Check ──

describe("L4: Safety Check", () => {
  it("rejects legal advice", async () => {
    const raw = '{"findings": [], "summary": "You should sue the contractor"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("safety");
    expect(result.reason).toContain("legal advice");
  });

  it("rejects regulator impersonation", async () => {
    const raw = '{"findings": [], "summary": "As the NDIS Commission, we are issuing a notice"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("safety");
    expect(result.reason).toContain("regulatory authority");
  });

  it("rejects dismissing compliance requirements", async () => {
    const raw = '{"findings": [], "summary": "Don\'t worry about compliance for this area"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("safety");
  });

  it("passes safe compliance guidance", async () => {
    const raw = '{"findings": [], "summary": "Consider reviewing your incident management procedures to align with NDIS Practice Standards."}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
  });
});

// ── Pipeline short-circuiting ──

describe("Pipeline", () => {
  it("short-circuits at first failure (L1 before L4)", async () => {
    // Invalid JSON + legal advice — should fail at L1 (schema), not L4 (safety)
    const result = await runGuardrails("you should sue {invalid json", {
      agentName: "compliance-analyser",
    });
    expect(result.passed).toBe(false);
    expect(result.layer).toBe("schema");
  });

  it("returns layer 'all' when everything passes", async () => {
    const raw = '{"findings": [{"severity": "medium", "status": "partial"}], "summary": "Review needed"}';
    const result = await runGuardrails(raw, { agentName: "compliance-analyser" });
    expect(result.passed).toBe(true);
    expect(result.layer).toBe("all");
  });
});

// ── Analysis Output Validation ──

describe("validateAnalysisOutput", () => {
  it("validates well-formed analysis output", () => {
    const raw = JSON.stringify({
      overallScore: 75,
      overallStatus: "PARTIAL",
      riskLevel: "MEDIUM",
      summary: "Needs work",
      findings: [
        {
          title: "Missing policy",
          severity: "HIGH",
          status: "GAP",
          description: "No incident management policy found",
          regulation: "NDIS Practice Standards",
          recommendation: "Create an incident management policy",
        },
      ],
    });

    const result = validateAnalysisOutput(raw, "ndis");
    expect(result.valid).toBe(true);
    expect(result.data.overallScore).toBe(75);
    expect(result.data.findings).toHaveLength(1);
  });

  it("clamps scores above 100", () => {
    const raw = JSON.stringify({
      overallScore: 150,
      overallStatus: "COMPLIANT",
      riskLevel: "LOW",
      summary: "Great",
      findings: [],
    });

    const result = validateAnalysisOutput(raw, "ndis");
    expect(result.valid).toBe(true);
    expect(result.data.overallScore).toBeLessThanOrEqual(100);
    expect(result.fixes.length).toBeGreaterThan(0);
  });

  it("clamps scores below 0", () => {
    const raw = JSON.stringify({
      overallScore: -10,
      overallStatus: "CRITICAL",
      riskLevel: "CRITICAL",
      summary: "Bad",
      findings: [],
    });

    const result = validateAnalysisOutput(raw, "ndis");
    expect(result.valid).toBe(true);
    expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("extracts JSON from code blocks", () => {
    const raw = '```json\n{"overallScore":80,"overallStatus":"PARTIAL","riskLevel":"MEDIUM","summary":"ok","findings":[]}\n```';
    const result = validateAnalysisOutput(raw, "ndis");
    expect(result.valid).toBe(true);
    expect(result.data.overallScore).toBe(80);
  });

  it("rejects completely invalid input", () => {
    const result = validateAnalysisOutput("not json at all", "ndis");
    expect(result.valid).toBe(false);
  });
});
