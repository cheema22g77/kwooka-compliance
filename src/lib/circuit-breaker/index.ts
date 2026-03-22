// ============================================================================
// LIB: Circuit Breaker — protects external calls
// States: closed → open (after N failures) → half_open (after timeout) → closed
// Pattern: Gold's circuit breaker with Vercel cold-start resilience
// ============================================================================

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly options: CircuitBreakerOptions;
  readonly serviceName: string;

  constructor(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
    this.serviceName = serviceName;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Get current state */
  getState(): CircuitState {
    // Auto-transition from open → half_open after timeout
    if (
      this.state === "open" &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs
    ) {
      this.state = "half_open";
      this.halfOpenAttempts = 0;
    }
    return this.state;
  }

  /** Check if a call is allowed */
  canCall(): boolean {
    const currentState = this.getState();
    if (currentState === "closed") return true;
    if (currentState === "half_open") {
      return this.halfOpenAttempts < this.options.halfOpenMaxAttempts;
    }
    return false; // open
  }

  /** Record a successful call */
  recordSuccess(): void {
    if (this.state === "half_open") {
      // Half-open success → reset to closed
      this.state = "closed";
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else {
      this.failureCount = 0;
    }
  }

  /** Record a failed call */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      // Half-open failure → back to open
      this.state = "open";
      this.halfOpenAttempts = 0;
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = "open";
    }
  }

  /**
   * Execute a function with circuit breaker protection.
   * Throws CircuitOpenError if circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canCall()) {
      throw new Error(
        `Circuit breaker open for ${this.serviceName}. ` +
        `Failures: ${this.failureCount}. ` +
        `Retry after: ${new Date(this.lastFailureTime + this.options.resetTimeoutMs).toISOString()}`
      );
    }

    if (this.state === "half_open") {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /** Get metrics for health checks */
  getMetrics(): {
    serviceName: string;
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
  } {
    return {
      serviceName: this.serviceName,
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /** Reset (for testing) */
  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}

// === Pre-configured breakers for common services ===
export const llmBreaker = new CircuitBreaker("anthropic-llm", {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 1,
});

export const dbBreaker = new CircuitBreaker("supabase-db", {
  failureThreshold: 5,
  resetTimeoutMs: 15_000,
  halfOpenMaxAttempts: 2,
});

export const emailBreaker = new CircuitBreaker("resend-email", {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});
