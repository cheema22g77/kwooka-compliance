interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    // If no entry or expired, create new one
    if (!entry || entry.resetTime < now) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: config.windowMs
      }
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now
      }
    }

    // Increment count
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: entry.resetTime - now
    }
  }

  // Consume a request (returns false if rate limited)
  consume(key: string, config: RateLimitConfig): boolean {
    return this.check(key, config).allowed
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Pre-configured rate limits for different endpoints
export const RATE_LIMITS = {
  chat: { windowMs: 60 * 1000, maxRequests: 20 },        // 20 per minute
  search: { windowMs: 60 * 1000, maxRequests: 60 },      // 60 per minute
  analyze: { windowMs: 60 * 1000, maxRequests: 10 },     // 10 per minute
  generatePolicy: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  ingest: { windowMs: 60 * 1000, maxRequests: 5 },       // 5 per minute
} as const

// Helper middleware function
export function checkRateLimit(
  identifier: string,
  endpoint: keyof typeof RATE_LIMITS
): { allowed: boolean; headers: Record<string, string> } {
  const config = RATE_LIMITS[endpoint]
  const result = rateLimiter.check(identifier, config)

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  }

  return { allowed: result.allowed, headers }
}

// Get identifier from request (IP or user ID)
export function getRateLimitKey(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return `ip:${ip}`
}
