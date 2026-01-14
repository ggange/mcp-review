/**
 * Redis-based rate limiter for API endpoints
 * 
 * Uses Redis for distributed rate limiting across multiple server instances.
 * Falls back to in-memory store if Redis is unavailable (development only).
 */

import { getRedisClient, isRedisAvailable } from './redis'

interface RateLimitRecord {
  count: number
  timestamp: number
}

// In-memory fallback store for rate limit tracking (development only)
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old entries periodically to prevent memory leaks (fallback only)
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
 * Check rate limit using Redis (with in-memory fallback)
 * 
 * @param key - Unique identifier for the rate limit (e.g., `${userId}:${endpoint}`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  // Try Redis first
  try {
    const redisAvailable = await isRedisAvailable()
    if (redisAvailable) {
      return await checkRateLimitRedis(key, limit, windowMs)
    }
  } catch (error) {
    // Fall through to in-memory fallback
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Redis unavailable, using in-memory rate limiting fallback:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Fallback to in-memory rate limiting
  return checkRateLimitInMemory(key, limit, windowMs)
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const redis = getRedisClient()
  const redisKey = `ratelimit:${key}`
  const windowSeconds = Math.ceil(windowMs / 1000)

  // Use Redis INCR to atomically increment the counter
  const count = await redis.incr(redisKey)
  
  // Set expiration on first request (only if key was just created)
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds)
  }

  // Get TTL to calculate reset time
  const ttl = await redis.ttl(redisKey)
  const resetIn = ttl > 0 ? ttl * 1000 : windowMs

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    }
  }

  return {
    allowed: true,
    remaining: limit - count,
    resetIn,
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitInMemory(
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
  
  // Icon uploads: 10 per hour per user
  iconUpload: { limit: 10, windowMs: 60 * 60 * 1000 },
  
  // Votes: 30 per minute per user (allow quick voting on multiple reviews)
  votes: { limit: 30, windowMs: 60 * 1000 },
  
  // Flags: 10 per hour per user (prevent flag spam)
  flags: { limit: 10, windowMs: 60 * 60 * 1000 },
  
  // Sync: 1 per minute (for cron jobs)
  sync: { limit: 1, windowMs: 60 * 1000 },
  
  // Read endpoints: 100 per minute per IP (prevent DoS on expensive queries)
  read: { limit: 100, windowMs: 60 * 1000 },
  
  // Server list: 60 per minute per IP (less restrictive for browsing)
  serverList: { limit: 60, windowMs: 60 * 1000 },
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
 * 
 * Security note: In a properly configured reverse proxy setup (like Vercel),
 * the proxy should overwrite these headers. For maximum security, prefer
 * platform-specific headers when available.
 */
export function getClientIp(request: Request): string {
  // Prefer Vercel's verified header (cannot be spoofed on Vercel)
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    // Vercel sets this to the actual client IP
    return vercelForwardedFor.split(',')[0].trim()
  }
  
  // Cloudflare's connecting IP header (if behind Cloudflare)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }
  
  // Standard x-forwarded-for - take the rightmost non-private IP
  // This is safer as proxies append IPs to the right
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    // In trusted proxy setups, the rightmost IP is the one added by the trusted proxy
    // For untrusted setups, this is still safer than taking the leftmost (which can be spoofed)
    // However, for simplicity with Vercel, we take the first since Vercel overwrites this header
    return ips[0] || 'unknown'
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  
  // Fallback to a generic identifier
  return 'unknown'
}

