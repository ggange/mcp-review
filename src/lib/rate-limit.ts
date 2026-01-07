/**
 * Simple in-memory rate limiter for API endpoints
 * 
 * Note: In production with multiple server instances, consider using
 * Redis or a similar distributed store for rate limiting.
 */

interface RateLimitRecord {
  count: number
  timestamp: number
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.timestamp > windowMs) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Check if a request is within rate limits
 * 
 * @param key - Unique identifier for the rate limit (e.g., `${userId}:${endpoint}`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  
  // Periodically clean up old entries
  cleanupExpiredEntries(windowMs)
  
  const record = rateLimitStore.get(key)
  
  // First request or window expired
  if (!record || now - record.timestamp > windowMs) {
    rateLimitStore.set(key, { count: 1, timestamp: now })
    return { 
      allowed: true, 
      remaining: limit - 1, 
      resetIn: windowMs 
    }
  }
  
  // Within window, check count
  if (record.count >= limit) {
    const resetIn = windowMs - (now - record.timestamp)
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn 
    }
  }
  
  // Increment count
  record.count++
  const resetIn = windowMs - (now - record.timestamp)
  return { 
    allowed: true, 
    remaining: limit - record.count, 
    resetIn 
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Ratings: 10 per minute per user (generous for normal use)
  ratings: { limit: 10, windowMs: 60 * 1000 },
  
  // Server uploads: 5 per hour per user
  serverUpload: { limit: 5, windowMs: 60 * 60 * 1000 },
  
  // Votes: 30 per minute per user (allow quick voting on multiple reviews)
  votes: { limit: 30, windowMs: 60 * 1000 },
  
  // Flags: 10 per hour per user (prevent flag spam)
  flags: { limit: 10, windowMs: 60 * 60 * 1000 },
  
  // Sync: 1 per minute (for cron jobs)
  sync: { limit: 1, windowMs: 60 * 1000 },
} as const

/**
 * Get rate limit key for a user and endpoint
 */
export function getRateLimitKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`
}

/**
 * Get rate limit key for an IP address and endpoint (for unauthenticated endpoints)
 */
export function getIpRateLimitKey(ip: string, endpoint: string): string {
  return `ip:${ip}:${endpoint}`
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to a generic identifier
  return 'unknown'
}

