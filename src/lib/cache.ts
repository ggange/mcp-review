/**
 * Server-side caching layer using Redis
 * For user-specific data that can't be cached at the edge
 */

import { getRedisClient, isRedisAvailable } from './redis'

const CACHE_PREFIX = 'cache:'
const DEFAULT_TTL = 3600 // 1 hour in seconds

/**
 * Get cached value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return null
    }

    const redis = getRedisClient()
    const redisKey = `${CACHE_PREFIX}${key}`
    const value = await redis.get(redisKey)

    if (!value) {
      return null
    }

    return JSON.parse(value) as T
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Cache get error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return null
  }
}

/**
 * Set cached value in Redis
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return
    }

    const redis = getRedisClient()
    const redisKey = `${CACHE_PREFIX}${key}`
    const serialized = JSON.stringify(value)

    await redis.setex(redisKey, ttl, serialized)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Cache set error:', error instanceof Error ? error.message : 'Unknown error')
    }
    // Don't throw - caching is best effort
  }
}

/**
 * Invalidate cache by key pattern
 * Note: This uses SCAN which can be slow on large datasets
 * For production, consider using cache tags or more specific invalidation
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return
    }

    const redis = getRedisClient()
    const fullPattern = `${CACHE_PREFIX}${pattern}*`
    const stream = redis.scanStream({
      match: fullPattern,
      count: 100,
    })

    const keys: string[] = []
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys)
    })

    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Cache invalidation error:', error instanceof Error ? error.message : 'Unknown error')
    }
    // Don't throw - invalidation is best effort
  }
}

/**
 * Delete a specific cache key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return
    }

    const redis = getRedisClient()
    const redisKey = `${CACHE_PREFIX}${key}`
    await redis.del(redisKey)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Cache delete error:', error instanceof Error ? error.message : 'Unknown error')
    }
    // Don't throw - deletion is best effort
  }
}

/**
 * Generate cache key with namespace
 */
export function getCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(':')}`
}
