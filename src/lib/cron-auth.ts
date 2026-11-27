import { timingSafeEqual } from 'crypto'

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8')
    const bufB = Buffer.from(b, 'utf8')
    // timingSafeEqual requires same length buffers
    if (bufA.length !== bufB.length) {
      // Still perform comparison to maintain constant time
      timingSafeEqual(bufA, bufA)
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Check that a request comes from the cron runner.
 * Requires "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
 * Without CRON_SECRET, requests are only allowed outside production.
 */
export function isCronAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  if (cronSecret && authHeader) {
    return secureCompare(authHeader, `Bearer ${cronSecret}`)
  }
  return !cronSecret && !isProduction
}
