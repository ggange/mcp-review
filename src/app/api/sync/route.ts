import { NextResponse } from 'next/server'
import { syncRegistry } from '@/lib/mcp-registry'
import { checkRateLimit, getIpRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

// This endpoint is meant to be called by a cron job
// In production, CRON_SECRET must be set for proper authentication

export async function POST(request: Request) {
  // Verify the request has proper authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In production, require CRON_SECRET
  // In development, allow without secret for easier testing
  const isProduction = process.env.NODE_ENV === 'production'
  const isAuthorized = cronSecret 
    ? authHeader === `Bearer ${cronSecret}`
    : !isProduction // Only allow without secret in non-production

  if (!isAuthorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
      { status: 401 }
    )
  }

  // Rate limiting to prevent abuse
  const clientIp = getClientIp(request)
  const rateLimitKey = getIpRateLimitKey(clientIp, 'sync')
  const { allowed, resetIn } = checkRateLimit(
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
        }
      }
    )
  }

  try {
     
    console.log('Starting registry sync...')
    const startTime = Date.now()
    
    const result = await syncRegistry()
    
    const duration = Date.now() - startTime
     
    console.log(`Sync completed in ${duration}ms: ${result.synced} servers synced, ${result.errors.length} errors`)

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      duration,
    })
  } catch (error) {
     
    console.error('Sync error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'SYNC_FAILED', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      },
      { status: 500 }
    )
  }
}

// Also support GET for easier testing (but should be disabled in production)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST in production' } },
      { status: 405 }
    )
  }
  
  return POST(request)
}


