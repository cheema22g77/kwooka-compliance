/**
 * /api/audit-report — One-Click Audit-Ready Compliance Pack
 * 
 * Generates a comprehensive PDF report containing:
 *   - Executive summary with compliance score
 *   - Findings breakdown by severity
 *   - Evidence coverage map per sector
 *   - Action plan with priorities
 *   - Regulatory references
 * 
 * Uses: Ring architecture auth + Supabase for data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, getServiceClient } from '@/adapters/database/auth';
import { SECTORS, isValidSector, type SectorId } from '@/core/value-objects/sectors';

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { sector } = body;
    const supabase = getServiceClient();

    // Fetch all data in parallel
    const [analysesResult, findingsResult, docsResult] = await Promise.all([
      supabase
        .from('compliance_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('sector', sector || 'ndis')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('findings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('documents')
        .select('id, title, category, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const analyses = analysesResult.data || [];
    const findings = findingsResult.data || [];
    const documents = docsResult.data || [];

    const sectorId = (sector || 'ndis') as SectorId;
    const sectorConfig = isValidSector(sectorId) ? SECTORS[sectorId] : SECTORS.ndis;

    // Calculate stats
    const avgScore = analyses.length > 0
      ? Math.round(analyses.reduce((s, a) => s + (a.overall_score || 0), 0) / analyses.length)
      : 0;

    const openFindings = findings.filter(f => f.status !== 'resolved');
    const criticalFindings = openFindings.filter(f => f.severity === 'critical');
    const highFindings = openFindings.filter(f => f.severity === 'high');
    const resolvedFindings = findings.filter(f => f.status === 'resolved');

    // Build evidence coverage
    const evidenceCoverage = sectorConfig.keyAreas.map(area => {
      const matchingAnalyses = analyses.filter(a => {
        const byArea = a.compliance_by_area || [];
        return byArea.some((ca: any) =>
          ca.area?.toLowerCase().includes(area.toLowerCase()) ||
          area.toLowerCase().includes(ca.area?.toLowerCase() || '')
        );
      });

      const scores = matchingAnalyses.flatMap(a =>
        (a.compliance_by_area || [])
          .filter((ca: any) =>
            ca.area?.toLowerCase().includes(area.toLowerCase()) ||
            area.toLowerCase().includes(ca.area?.toLowerCase() || '')
          )
          .map((ca: any) => ca.score || 0)
      );

      const avgAreaScore = scores.length > 0
        ? Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length)
        : 0;

      return {
        area,
        score: avgAreaScore,
        status: scores.length === 0 ? 'No Evidence' : avgAreaScore >= 70 ? 'Covered' : 'Partial',
        documentCount: matchingAnalyses.length,
      };
    });

    const coveredCount = evidenceCoverage.filter(e => e.status === 'Covered').length;
    const totalAreas = evidenceCoverage.length;
    const coveragePercent = totalAreas > 0 ? Math.round((coveredCount / totalAreas) * 100) : 0;

    // Generate report data (client will render with jsPDF)
    const reportData = {
      generatedAt: new Date().toISOString(),
      sector: {
        id: sectorId,
        name: sectorConfig.name,
        fullName: sectorConfig.fullName,
        authority: sectorConfig.authority,
        regulations: sectorConfig.regulations,
      },
      summary: {
        averageScore: avgScore,
        totalAnalyses: analyses.length,
        totalDocuments: documents.length,
        coveragePercent,
        riskLevel: criticalFindings.length > 0 ? 'CRITICAL' :
                   highFindings.length > 0 ? 'HIGH' :
                   openFindings.length > 0 ? 'MEDIUM' : 'LOW',
      },
      findings: {
        total: findings.length,
        open: openFindings.length,
        critical: criticalFindings.length,
        high: highFindings.length,
        medium: openFindings.filter(f => f.severity === 'medium').length,
        low: openFindings.filter(f => f.severity === 'low').length,
        resolved: resolvedFindings.length,
        items: openFindings.slice(0, 20).map(f => ({
          title: f.title,
          severity: f.severity,
          category: f.category,
          status: f.status,
          description: f.description,
          due_date: f.due_date,
        })),
      },
      evidenceCoverage,
      actionPlan: analyses[0]?.raw_analysis?.actionPlan || [],
      recentAnalyses: analyses.slice(0, 10).map(a => ({
        documentName: a.document_name,
        score: a.overall_score,
        status: a.overall_status,
        date: a.created_at,
      })),
    };

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Audit report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
