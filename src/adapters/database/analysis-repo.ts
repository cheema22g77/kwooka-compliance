/**
 * Ring 4: Analysis Repository
 * 
 * Extracts the Supabase save logic from analyze/route.ts.
 * All compliance_analyses table operations go through here.
 */

import { getServiceClient } from './auth';

export interface AnalysisRecord {
  user_id: string;
  sector: string;
  document_type: string;
  document_name: string;
  overall_score: number;
  overall_status: string;
  risk_level: string;
  summary: string;
  findings: any[];
  strengths: any[];
  critical_gaps: string[];
  action_plan: any[];
  compliance_by_area: any[];
  raw_analysis: any;
}

export async function saveAnalysis(record: AnalysisRecord): Promise<{ id: string } | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('compliance_analyses')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save analysis:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Analysis save error:', error);
    return null;
  }
}

export async function getAnalysesByUser(
  userId: string,
  options?: { sector?: string; limit?: number }
) {
  const supabase = getServiceClient();
  let query = supabase
    .from('compliance_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.sector) {
    query = query.eq('sector', options.sector);
  }

  query = query.limit(options?.limit ?? 50);

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch analyses:', error.message);
    return [];
  }
  return data ?? [];
}
