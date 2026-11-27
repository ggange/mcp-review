import { NextResponse } from 'next/server'
import { syncRegistry } from '@/lib/mcp-registry'
import { checkRateLimit, getIpRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { isCronAuthorized } from '@/lib/cron-auth'

// This endpoint is meant to be called by a cron job
// In production, CRON_SECRET must be set for proper authentication

export async function POST(request: Request) {
  // Verify the request has proper authorization (CRON_SECRET required in production)
  const isAuthorized = isCronAuthorized(request)

  if (!isAuthorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
      { status: 401 }
    )
  }

  // Rate limiting to prevent abuse
  const clientIp = getClientIp(request)
  const rateLimitKey = getIpRateLimitKey(clientIp, 'sync')
  const { allowed, resetIn } = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.sync.limit,
    RATE_LIMITS.sync.windowMs
  )

  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Sync already in progress or rate limited.' } },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          'Retry-After': String(Math.ceil(resetIn / 1000)),
        }
      }
    )
  }

  try {
    const startTime = Date.now()
    
    const result = await syncRegistry()
    
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      duration,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Sync error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { 
        error: { 
          code: 'SYNC_FAILED', 
          message: 'Failed to sync registry' 
        } 
      },
      { status: 500 }
    )
  }
}

// Vercel cron jobs (vercel.json) invoke this endpoint with GET and an
// "Authorization: Bearer $CRON_SECRET" header, so GET must run the sync too.
// POST enforces the same authorization in every environment.
export async function GET(request: Request) {
  return POST(request)
}
