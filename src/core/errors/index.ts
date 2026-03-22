// ============================================================================
// RING 1: DOMAIN ERRORS — ZERO IMPORTS OUTSIDE CORE
// Pattern: Green's error hierarchy
// ============================================================================

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", { entity, id });
    this.name = "NotFoundError";
  }
}

export class UnauthorisedError extends DomainError {
  constructor(message = "Unauthorised") {
    super(message, "UNAUTHORISED");
    this.name = "UnauthorisedError";
  }
}

export class StateTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super(
      `Invalid ${entity} transition: ${from} → ${to}`,
      "INVALID_TRANSITION",
      { entity, from, to }
    );
    this.name = "StateTransitionError";
  }
}

export class RetentionError extends DomainError {
  constructor(documentId: string, retentionEnd: string) {
    super(
      `Cannot delete document ${documentId}: retention until ${retentionEnd}`,
      "RETENTION_BLOCK",
      { documentId, retentionEnd }
    );
    this.name = "RetentionError";
  }
}

export class AgentError extends DomainError {
  constructor(agentName: string, message: string) {
    super(`Agent ${agentName}: ${message}`, "AGENT_ERROR", { agentName });
    this.name = "AgentError";
  }
}

export class GuardrailError extends DomainError {
  constructor(layer: string, reason: string) {
    super(`Guardrail ${layer}: ${reason}`, "GUARDRAIL_REJECTION", { layer, reason });
    this.name = "GuardrailError";
  }
}

export class RateLimitError extends DomainError {
  constructor(resource: string, retryAfterMs?: number) {
    super(`Rate limit exceeded for ${resource}`, "RATE_LIMIT", { resource, retryAfterMs });
    this.name = "RateLimitError";
  }
}

export class CircuitOpenError extends DomainError {
  constructor(service: string) {
    super(`Circuit breaker open for ${service}`, "CIRCUIT_OPEN", { service });
    this.name = "CircuitOpenError";
  }
}
