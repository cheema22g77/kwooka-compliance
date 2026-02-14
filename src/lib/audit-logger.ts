import { createClient } from '@supabase/supabase-js'

export interface AuditLogEntry {
  userId?: string
  action: 'chat' | 'search' | 'analyze' | 'generate_policy' | 'rag_query' | 'document_upload' | 'login' | 'logout'
  sector?: string
  query?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  responseTime?: number
  success: boolean
  errorMessage?: string
}

class AuditLogger {
  private getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      console.warn('Supabase credentials not available for audit logging')
      return null
    }
    
    return createClient(url, key)
  }

  async log(entry: AuditLogEntry): Promise<void> {
    const supabase = this.getSupabase()
    
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry
      }))
    }

    if (!supabase) return

    try {
      await supabase.from('audit_logs').insert({
        user_id: entry.userId,
        action: entry.action,
        sector: entry.sector,
        query: entry.query?.substring(0, 1000), // Limit query length
        metadata: entry.metadata,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent?.substring(0, 500),
        response_time_ms: entry.responseTime,
        success: entry.success,
        error_message: entry.errorMessage?.substring(0, 500),
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to write audit log:', error)
      // Don't throw - audit logging should never break the main flow
    }
  }

  // Helper to measure response time
  startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }

  // Log a chat interaction
  async logChat(params: {
    userId?: string
    sector?: string
    query: string
    success: boolean
    responseTime?: number
    citationsCount?: number
    errorMessage?: string
  }) {
    await this.log({
      action: 'chat',
      userId: params.userId,
      sector: params.sector,
      query: params.query,
      success: params.success,
      responseTime: params.responseTime,
      errorMessage: params.errorMessage,
      metadata: {
        citationsCount: params.citationsCount,
      }
    })
  }

  // Log a search
  async logSearch(params: {
    userId?: string
    sector?: string
    query: string
    resultsCount: number
    searchMethod: string
    responseTime?: number
    success: boolean
  }) {
    await this.log({
      action: 'search',
      userId: params.userId,
      sector: params.sector,
      query: params.query,
      success: params.success,
      responseTime: params.responseTime,
      metadata: {
        resultsCount: params.resultsCount,
        searchMethod: params.searchMethod,
      }
    })
  }

  // Log document analysis
  async logAnalysis(params: {
    userId?: string
    sector: string
    documentName?: string
    documentType?: string
    overallScore?: number
    findingsCount?: number
    responseTime?: number
    success: boolean
    errorMessage?: string
  }) {
    await this.log({
      action: 'analyze',
      userId: params.userId,
      sector: params.sector,
      success: params.success,
      responseTime: params.responseTime,
      errorMessage: params.errorMessage,
      metadata: {
        documentName: params.documentName,
        documentType: params.documentType,
        overallScore: params.overallScore,
        findingsCount: params.findingsCount,
      }
    })
  }

  // Log policy generation
  async logPolicyGeneration(params: {
    userId?: string
    sector?: string
    policyType: string
    companyName: string
    responseTime?: number
    success: boolean
    errorMessage?: string
  }) {
    await this.log({
      action: 'generate_policy',
      userId: params.userId,
      sector: params.sector,
      success: params.success,
      responseTime: params.responseTime,
      errorMessage: params.errorMessage,
      metadata: {
        policyType: params.policyType,
        companyName: params.companyName,
      }
    })
  }
}

export const auditLogger = new AuditLogger()
