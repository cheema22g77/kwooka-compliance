// ============================================================================
// RING 6: GUARDRAIL PIPELINE
// Chains: L1 Schema → L2 Grounding → L3 Business Rules → L4 Safety
// Short-circuits on first failure
// Pattern: Gold's 4-layer guardrail pipeline
// ============================================================================

export interface GuardrailResult {
  passed: boolean;
  layer: string;
  reason: string;
}

function pass(layer: string): GuardrailResult {
  return { passed: true, layer, reason: "ok" };
}

function fail(layer: string, reason: string): GuardrailResult {
  return { passed: false, layer, reason };
}

// ── L1: SCHEMA VALIDATION ──
// Validates JSON structure of agent output
function validateSchema(raw: string, agentName: string): GuardrailResult {
  // Extract JSON if wrapped in code blocks
  let jsonText = raw;
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

  try {
    const parsed = JSON.parse(jsonText.trim());
    if (typeof parsed !== "object" || parsed === null) {
      return fail("schema", "Response is not a JSON object");
    }

    // Agent-specific schema checks
    if (agentName === "compliance-analyser") {
      if (!parsed.findings && !parsed.summary) {
        return fail("schema", "Analysis must contain findings or summary");
      }
      if (parsed.score !== undefined && (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 100)) {
        return fail("schema", "Score must be a number 0-100");
      }
    }

    if (agentName === "policy-generator") {
      if (!parsed.content && !parsed.sections) {
        return fail("schema", "Policy must contain content or sections");
      }
    }

    return pass("schema");
  } catch (_err) {
    // If agent output is plain text (like copilot), schema check passes
    if (agentName === "copilot" || agentName === "onboarding") {
      return pass("schema");
    }
    return fail("schema", "Invalid JSON in agent response");
  }
}

// ── L2: GROUNDING CHECK ──
// Checks that claims reference real Australian regulations
function validateGrounding(raw: string, context: Record<string, unknown>): GuardrailResult {
  const lower = raw.toLowerCase();

  // Check for obviously fabricated regulation names
  const fabricatedPatterns = [
    /compliance regulation act \d{4}/i,
    /australian compliance standard \d+/i,
    /federal compliance code/i,
    /national compliance regulation/i,
  ];

  for (const pattern of fabricatedPatterns) {
    if (pattern.test(raw)) {
      return fail("grounding", `Potentially fabricated regulation: ${raw.match(pattern)?.[0]}`);
    }
  }

  // Check for hallucinated section numbers in known formats
  // Real Australian acts use formats like "Section 123", "Part 4A", "Schedule 2"
  // Hallucinated ones often use "Section 999" or very high numbers
  const sectionMatches = raw.matchAll(/section\s+(\d+)/gi);
  for (const match of sectionMatches) {
    const sectionNum = parseInt(match[1]!, 10);
    if (sectionNum > 500) {
      return fail("grounding", `Suspiciously high section number: Section ${sectionNum}`);
    }
  }

  return pass("grounding");
}

// ── L3: BUSINESS RULES ──
// Validates against sector-specific compliance rules
function validateBusinessRules(raw: string, context: Record<string, unknown>): GuardrailResult {
  const sector = context.sector as string | undefined;

  // Risk level consistency check
  const riskMatch = raw.match(/"riskLevel"\s*:\s*"(\w+)"/);
  const scoreMatch = raw.match(/"score"\s*:\s*(\d+)/);
  if (riskMatch && scoreMatch) {
    const risk = riskMatch[1];
    const score = parseInt(scoreMatch[1]!, 10);

    // Score and risk should be consistent
    if (risk === "low" && score < 30) {
      return fail("business_rules", `Inconsistent: risk "low" but score ${score} (should be >70)`);
    }
    if (risk === "critical" && score > 50) {
      return fail("business_rules", `Inconsistent: risk "critical" but score ${score} (should be <30)`);
    }
  }

  // Severity must be valid values
  const severityMatches = raw.matchAll(/"severity"\s*:\s*"(\w+)"/g);
  const validSeverities = ["critical", "high", "medium", "low", "info"];
  for (const match of severityMatches) {
    if (!validSeverities.includes(match[1]!)) {
      return fail("business_rules", `Invalid severity: "${match[1]}"`);
    }
  }

  // Status must be valid values
  const statusMatches = raw.matchAll(/"status"\s*:\s*"(\w+)"/g);
  const validStatuses = ["compliant", "partial", "gap", "not_addressed", "critical"];
  for (const match of statusMatches) {
    if (!validStatuses.includes(match[1]!)) {
      return fail("business_rules", `Invalid compliance status: "${match[1]}"`);
    }
  }

  return pass("business_rules");
}

// ── L4: SAFETY CHECK ──
// Compliance-specific safety: no legal advice, no fabricated authorities
function validateSafety(raw: string, context: Record<string, unknown>): GuardrailResult {
  const lower = raw.toLowerCase();

  // Must not give legal advice
  const legalAdvicePatterns = [
    "you should sue",
    "take legal action",
    "i am your lawyer",
    "legal guarantee",
    "legally binding advice",
  ];
  for (const pattern of legalAdvicePatterns) {
    if (lower.includes(pattern)) {
      return fail("safety", "Response contains inappropriate legal advice");
    }
  }

  // Must not claim to be a regulator
  const regulatorClaims = [
    "as the ndis commission",
    "as worksafe",
    "as the regulator",
    "we are issuing",
    "enforcement action will be taken",
  ];
  for (const claim of regulatorClaims) {
    if (lower.includes(claim)) {
      return fail("safety", "Response impersonates a regulatory authority");
    }
  }

  // Must not dismiss safety concerns
  const dismissalPatterns = [
    "don't worry about compliance",
    "you can ignore this requirement",
    "this regulation doesn't apply",
    "compliance is optional",
  ];
  for (const pattern of dismissalPatterns) {
    if (lower.includes(pattern)) {
      return fail("safety", "Response inappropriately dismisses compliance requirements");
    }
  }

  return pass("safety");
}

// ── PIPELINE ──
/**
 * Run all 4 guardrail layers. Short-circuits on first failure.
 * Used by all agents via BaseAgent constructor injection.
 */
export async function runGuardrails(
  raw: string,
  context: Record<string, unknown>
): Promise<GuardrailResult> {
  const agentName = (context.agentName as string) ?? "";

  // L1: Schema
  const l1 = validateSchema(raw, agentName);
  if (!l1.passed) return l1;

  // L2: Grounding
  const l2 = validateGrounding(raw, context);
  if (!l2.passed) return l2;

  // L3: Business Rules
  const l3 = validateBusinessRules(raw, context);
  if (!l3.passed) return l3;

  // L4: Safety
  const l4 = validateSafety(raw, context);
  if (!l4.passed) return l4;

  return pass("all");
}
