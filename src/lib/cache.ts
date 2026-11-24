/**
 * Server-side caching layer using Redis
 * For user-specific data that can't be cached at the edge
 */

import { getRedisClient } from './redis'

const CACHE_PREFIX = 'cache:'
const DEFAULT_TTL = 3600 // 1 hour in seconds

/**
 * Get cached value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
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

/**
 * Namespace for cached public server listings (homepage, hot, top rated)
 */
export const SERVER_LIST_CACHE_NAMESPACE = 'servers'

/**
 * Drop all cached server listings after servers or ratings change
 */
export async function invalidateServerListCache(): Promise<void> {
  await invalidateCache(`${SERVER_LIST_CACHE_NAMESPACE}:`)
}

/**
 * Read a value from Redis, or load it and cache it.
 * Values are stored in an envelope so a `null` result (e.g. "server not found")
 * can be cached too: with `missTtl`, lookups of nonexistent IDs stop reaching
 * the database for that long.
 */
export async function getOrSetCache<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
  options: { missTtl?: number } = {}
): Promise<T> {
  const cached = await getCache<{ v: T }>(key)
  if (cached !== null && typeof cached === 'object' && 'v' in cached) {
    return cached.v
  }

  const value = await load()
  if (value === null || value === undefined) {
    if (options.missTtl) await setCache(key, { v: value }, options.missTtl)
  } else {
    await setCache(key, { v: value }, ttl)
  }
  return value
}

/**
 * Namespace for cached per-server data (detail page, reviews, badge, OG)
 */
export const SERVER_DETAIL_CACHE_NAMESPACE = 'server'

export function serverDetailCacheKey(serverId: string): string {
  return getCacheKey(SERVER_DETAIL_CACHE_NAMESPACE, 'detail', serverId)
}

export function serverReviewsCacheKey(serverId: string): string {
  return getCacheKey(SERVER_DETAIL_CACHE_NAMESPACE, 'reviews', serverId)
}

/**
 * Drop one server's cached detail and reviews after it or its ratings change
 */
export async function invalidateServerCache(serverId: string): Promise<void> {
  await Promise.all([
    deleteCache(serverDetailCacheKey(serverId)),
    deleteCache(serverReviewsCacheKey(serverId)),
  ])
}
