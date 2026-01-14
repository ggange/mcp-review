import { NextResponse } from 'next/server'

/**
 * Set public cache headers for CDN caching
 * @param response - NextResponse to add headers to
 * @param maxAge - Maximum age in seconds for edge cache (default: 60)
 * @returns Response with cache headers
 */
export function setPublicCacheHeaders(
  response: NextResponse,
  maxAge: number = 60
): NextResponse {
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 5}`
  )
  return response
}

/**
 * Set private cache headers (no edge caching)
 * @param response - NextResponse to add headers to
 * @returns Response with cache headers
 */
export function setPrivateCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, s-maxage=0, must-revalidate')
  return response
}

/**
 * Set no-cache headers
 * @param response - NextResponse to add headers to
 * @returns Response with cache headers
 */
export function setNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return response
}
