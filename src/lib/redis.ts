import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Get Redis client instance (singleton pattern)
 * Uses REDIS_URL from environment variables
 * Falls back to in-memory warning in development if REDIS_URL is not set
 */
export function getRedisClient(): Redis {
  if (redisClient) return redisClient

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is required in production')
    }
    // Development fallback - throw error to make it clear Redis is needed
    throw new Error(
      'REDIS_URL is not set. Please set REDIS_URL in your .env file for local development (e.g., redis://localhost:6379)'
    )
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    // Enable keep-alive for serverless environments
    keepAlive: 30000,
    // Connection timeout
    connectTimeout: 10000,
    // Lazy connect - don't connect until first command
    lazyConnect: true,
  })

  // Handle connection errors
  redisClient.on('error', (error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Redis connection error:', error)
    }
  })

  // Handle successful connection
  redisClient.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Redis connected successfully')
    }
  })

  return redisClient
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.ping()
    return true
  } catch {
    return false
  }
}

/**
 * Close Redis connection (useful for cleanup in tests)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
