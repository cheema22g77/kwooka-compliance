// ============================================================================
// LIB: Audit Trail — Immutable audit logging
// Every significant action gets logged with who/what/when
// Pattern: Gold's audit trail
// ============================================================================

export interface AuditEntry {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly details: Record<string, unknown>;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
}

export type AuditAction =
  | "assessment.created"
  | "assessment.completed"
  | "assessment.failed"
  | "finding.created"
  | "finding.status_changed"
  | "finding.assigned"
  | "finding.escalated"
  | "evidence.uploaded"
  | "evidence.linked"
  | "document.uploaded"
  | "document.deleted"
  | "program.created"
  | "program.versioned"
  | "program.approved"
  | "report.generated"
  | "report.exported"
  | "playbook.item_completed"
  | "org.created"
  | "org.sector_added"
  | "org.tier_changed"
  | "user.login"
  | "user.logout"
  | "user.role_changed"
  | "billing.checkout"
  | "billing.subscription_changed"
  | "api.key_created"
  | "api.key_revoked";

/** Create an audit entry */
export function createAuditEntry(params: {
  orgId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): AuditEntry {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orgId: params.orgId,
    userId: params.userId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details ?? {},
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * In-memory buffer for batch audit writes.
 * Flush periodically or on threshold to reduce DB round-trips.
 */
export class AuditBuffer {
  private buffer: AuditEntry[] = [];
  private readonly maxSize: number;
  private flushFn: ((entries: AuditEntry[]) => Promise<void>) | null = null;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  /** Set the flush function (adapter injects this) */
  setFlushFn(fn: (entries: AuditEntry[]) => Promise<void>): void {
    this.flushFn = fn;
  }

  /** Add an entry to the buffer */
  async add(entry: AuditEntry): Promise<void> {
    this.buffer.push(entry);
    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  /** Flush all buffered entries to the database */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.flushFn) return;
    const entries = [...this.buffer];
    this.buffer = [];
    try {
      await this.flushFn(entries);
    } catch (err) {
      // Put entries back on failure
      this.buffer = [...entries, ...this.buffer];
      console.error("[AuditBuffer] Flush failed:", err);
    }
  }

  /** Get pending count (for health checks) */
  getPendingCount(): number {
    return this.buffer.length;
  }
}

// Singleton buffer
export const auditBuffer = new AuditBuffer();
