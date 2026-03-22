// ============================================================================
// INTELLIGENCE: Quality Monitor — tracks response quality metrics per org
// Pattern: Immigration's quality tracking
// ============================================================================
import type { CopilotIntent, QualityMetrics } from "./types";

interface QualityRecord {
  totalResponses: number;
  guardrailPasses: number;
  totalResponseLength: number;
  intentCounts: Record<CopilotIntent, number>;
  lastUpdated: string;
}

/**
 * In-memory quality monitor that tracks copilot response metrics per org.
 * Use for dashboards, alerting, and quality improvement.
 */
export class QualityMonitor {
  private records: Map<string, QualityRecord> = new Map();

  /** Record a completed copilot response */
  recordResponse(params: {
    orgId: string;
    intent: CopilotIntent;
    responseLength: number;
    guardrailsPassed: boolean;
  }): void {
    const existing = this.records.get(params.orgId) ?? {
      totalResponses: 0,
      guardrailPasses: 0,
      totalResponseLength: 0,
      intentCounts: { analysis: 0, explanation: 0, recommendation: 0, general: 0 },
      lastUpdated: "",
    };

    existing.totalResponses++;
    existing.totalResponseLength += params.responseLength;
    existing.intentCounts[params.intent]++;
    if (params.guardrailsPassed) existing.guardrailPasses++;
    existing.lastUpdated = new Date().toISOString();

    this.records.set(params.orgId, existing);
  }

  /** Get quality metrics for an org */
  getMetrics(orgId: string): QualityMetrics | null {
    const record = this.records.get(orgId);
    if (!record) return null;

    return {
      orgId,
      totalResponses: record.totalResponses,
      guardrailPassRate:
        record.totalResponses > 0
          ? record.guardrailPasses / record.totalResponses
          : 1,
      avgResponseLength:
        record.totalResponses > 0
          ? Math.round(record.totalResponseLength / record.totalResponses)
          : 0,
      intentDistribution: { ...record.intentCounts },
      lastUpdated: record.lastUpdated,
    };
  }

  /** Check if guardrail pass rate is below threshold (degraded quality) */
  isQualityDegraded(orgId: string, threshold = 0.8): boolean {
    const metrics = this.getMetrics(orgId);
    if (!metrics || metrics.totalResponses < 5) return false;
    return metrics.guardrailPassRate < threshold;
  }

  /** Reset metrics for an org (for testing) */
  reset(orgId?: string): void {
    if (orgId) {
      this.records.delete(orgId);
    } else {
      this.records.clear();
    }
  }
}

// Singleton
export const qualityMonitor = new QualityMonitor();
