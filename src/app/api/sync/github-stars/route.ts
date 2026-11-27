import { NextResponse } from 'next/server'
import { syncGitHubStars } from '@/lib/github-stars'
import { isCronAuthorized } from '@/lib/cron-auth'
import { checkRateLimit, getIpRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

export const maxDuration = 60

// Called daily by the Vercel cron in vercel.json to refresh GitHub star counts
// of user-uploaded and official servers.
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
      { status: 401 }
    )
  }

  const rateLimitKey = getIpRateLimitKey(getClientIp(request), 'github-stars-sync')
  const { allowed, resetIn } = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.githubStarsSync.limit,
    RATE_LIMITS.githubStarsSync.windowMs
  )

  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Sync already in progress or rate limited.' } },
      {
        status: 429,
        headers: {
          'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          'Retry-After': String(Math.ceil(resetIn / 1000)),
        },
      }
    )
  }

  try {
    const startTime = Date.now()
    const result = await syncGitHubStars()

    return NextResponse.json({
      success: true,
      ...result,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GitHub stars sync error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'SYNC_FAILED', message: 'Failed to sync GitHub stars' } },
      { status: 500 }
    )
  }
}

// Vercel cron jobs invoke this endpoint with GET and an "Authorization: Bearer $CRON_SECRET" header
export async function GET(request: Request) {
  return POST(request)
}
