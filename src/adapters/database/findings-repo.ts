/**
 * Findings Repository
 * 
 * FIXES THE FATAL BUG: Analysis findings were stored as JSONB blobs
 * in compliance_analyses but never written to the findings table.
 * 
 * This adapter bridges that gap — when an analysis completes,
 * each finding becomes a trackable item in the findings table.
 */

import { getServiceClient } from './auth';

export interface FindingRecord {
  user_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  document_id?: string;
  due_date?: string;
  analysis_id?: string;
}

/**
 * Save analysis findings to the findings table.
 * Called after a successful analysis to create trackable action items.
 */
export async function saveAnalysisFindings(
  userId: string,
  analysisId: string,
  findings: any[],
  sector: string,
  documentName?: string
): Promise<number> {
  if (!findings || findings.length === 0) return 0;

  const supabase = getServiceClient();
  
  // Map AI findings to findings table format
  const records: FindingRecord[] = findings
    .filter((f: any) => f.status !== 'COMPLIANT') // Only save non-compliant findings
    .map((f: any) => ({
      user_id: userId,
      title: f.title || 'Untitled Finding',
      description: buildDescription(f, documentName),
      severity: mapSeverity(f.severity),
      category: f.area || sector,
      status: 'open' as const,
    }));

  if (records.length === 0) return 0;

  const { data, error } = await supabase
    .from('findings')
    .insert(records)
    .select('id');

  if (error) {
    console.error('Failed to save findings:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

function buildDescription(finding: any, documentName?: string): string {
  let desc = finding.description || '';
  
  if (finding.regulation) {
    desc += `\n\nRegulation: ${finding.regulation}`;
  }
  if (finding.recommendation) {
    desc += `\n\nRecommendation: ${finding.recommendation}`;
  }
  if (documentName) {
    desc += `\n\nSource: ${documentName}`;
  }
  
  return desc.trim();
}

function mapSeverity(aiSeverity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
    'CRITICAL': 'critical',
    'HIGH': 'high',
    'MEDIUM': 'medium',
    'LOW': 'low',
    'INFO': 'info',
  };
  return map[aiSeverity?.toUpperCase()] || 'medium';
}

/**
 * Get finding counts for dashboard
 */
export async function getFindingCounts(userId: string) {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from('findings')
    .select('severity, status')
    .eq('user_id', userId);

  if (error || !data) {
    return { total: 0, open: 0, critical: 0, high: 0, overdue: 0, resolved: 0 };
  }

  return {
    total: data.length,
    open: data.filter(f => f.status === 'open' || f.status === 'in_progress').length,
    critical: data.filter(f => f.severity === 'critical' && f.status !== 'resolved').length,
    high: data.filter(f => f.severity === 'high' && f.status !== 'resolved').length,
    overdue: 0, // Would need due_date check
    resolved: data.filter(f => f.status === 'resolved').length,
  };
}
