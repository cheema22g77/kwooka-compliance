/**
 * Ring 6: Analysis Output Guardrail
 * 
 * Validates that AI analysis output is safe to show to users.
 * This is critical for a compliance tool — we can't show hallucinated
 * regulations or invalid risk levels.
 * 
 * Replaces: raw JSON.parse() with no validation in analyze/route.ts
 */

// Sector validation available if needed in future
// import { isValidSector, type SectorId } from '@/core/value-objects/sectors';

const VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const VALID_STATUSES = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'CRITICAL'] as const;
const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const VALID_FINDING_STATUSES = ['COMPLIANT', 'GAP', 'PARTIAL', 'NOT_ADDRESSED'] as const;

export interface ValidationResult {
  valid: boolean;
  data: any;
  warnings: string[];
  fixes: string[];
}

/**
 * Parse and validate AI analysis output.
 * Fixes what can be fixed, warns about issues, rejects garbage.
 */
export function validateAnalysisOutput(rawText: string, sector: string): ValidationResult {
  const warnings: string[] = [];
  const fixes: string[] = [];

  // 1. Extract JSON
  let jsonText = rawText;
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
    fixes.push('Extracted JSON from code block');
  }

  // 2. Parse JSON
  let data: any;
  try {
    data = JSON.parse(jsonText.trim());
  } catch {
    return {
      valid: false,
      data: null,
      warnings: ['AI response was not valid JSON'],
      fixes: [],
    };
  }

  // 3. Validate and fix overallScore
  if (typeof data.overallScore !== 'number') {
    data.overallScore = 50;
    fixes.push('overallScore was not a number, defaulted to 50');
  } else if (data.overallScore < 0) {
    data.overallScore = 0;
    fixes.push('overallScore was negative, clamped to 0');
  } else if (data.overallScore > 100) {
    data.overallScore = 100;
    fixes.push('overallScore exceeded 100, clamped to 100');
  }
  data.overallScore = Math.round(data.overallScore);

  // 4. Validate overallStatus
  if (!VALID_STATUSES.includes(data.overallStatus)) {
    // Derive from score
    if (data.overallScore >= 80) data.overallStatus = 'COMPLIANT';
    else if (data.overallScore >= 50) data.overallStatus = 'PARTIAL';
    else if (data.overallScore >= 25) data.overallStatus = 'NON_COMPLIANT';
    else data.overallStatus = 'CRITICAL';
    fixes.push(`overallStatus was invalid, derived from score: ${data.overallStatus}`);
  }

  // 5. Validate riskLevel
  if (!VALID_RISK_LEVELS.includes(data.riskLevel)) {
    if (data.overallScore >= 80) data.riskLevel = 'LOW';
    else if (data.overallScore >= 50) data.riskLevel = 'MEDIUM';
    else if (data.overallScore >= 25) data.riskLevel = 'HIGH';
    else data.riskLevel = 'CRITICAL';
    fixes.push(`riskLevel was invalid, derived from score: ${data.riskLevel}`);
  }

  // 6. Validate summary
  if (!data.summary || typeof data.summary !== 'string') {
    data.summary = 'Analysis completed.';
    fixes.push('summary was missing, added placeholder');
  } else if (data.summary.length < 10) {
    warnings.push('summary is very short');
  }

  // 7. Validate findings array
  if (!Array.isArray(data.findings)) {
    data.findings = [];
    fixes.push('findings was not an array, defaulted to empty');
  } else {
    data.findings = data.findings.map((f: any, i: number) => {
      const fixed = { ...f };
      
      // Ensure required fields
      if (!fixed.title) {
        fixed.title = `Finding ${i + 1}`;
        fixes.push(`Finding ${i + 1}: missing title`);
      }
      
      if (!VALID_SEVERITIES.includes(fixed.severity)) {
        fixed.severity = 'MEDIUM';
        fixes.push(`Finding "${fixed.title}": invalid severity, defaulted to MEDIUM`);
      }
      
      if (!VALID_FINDING_STATUSES.includes(fixed.status)) {
        fixed.status = 'GAP';
      }
      
      if (!fixed.recommendation || fixed.recommendation.length < 5) {
        warnings.push(`Finding "${fixed.title}": recommendation is too short or missing`);
      }

      // Ensure ID
      if (!fixed.id) fixed.id = i + 1;
      
      return fixed;
    });
  }

  // 8. Score-findings consistency check
  const criticalCount = data.findings.filter((f: any) => f.severity === 'CRITICAL').length;
  const highCount = data.findings.filter((f: any) => f.severity === 'HIGH').length;

  if (criticalCount > 0 && data.overallScore > 60) {
    warnings.push(
      `Score is ${data.overallScore} but there are ${criticalCount} critical findings — score may be too high`
    );
  }
  if (criticalCount === 0 && highCount === 0 && data.overallScore < 40) {
    warnings.push(
      `Score is ${data.overallScore} but no critical/high findings — score may be too low`
    );
  }

  // 9. Ensure optional arrays exist
  if (!Array.isArray(data.strengths)) data.strengths = [];
  if (!Array.isArray(data.criticalGaps)) data.criticalGaps = [];
  if (!Array.isArray(data.actionPlan)) data.actionPlan = [];
  if (!Array.isArray(data.complianceByArea)) data.complianceByArea = [];
  if (!Array.isArray(data.regulatoryReferences)) data.regulatoryReferences = [];
  if (!Array.isArray(data.nextAuditFocus)) data.nextAuditFocus = [];

  // 10. Add metadata
  data.analyzedAt = new Date().toISOString();
  data.sector = sector;
  data._validation = {
    warnings: warnings.length,
    fixes: fixes.length,
    validated: true,
  };

  return {
    valid: true,
    data,
    warnings,
    fixes,
  };
}
