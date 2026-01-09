import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ratingSchema } from '@/lib/validations'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'

export async function POST(request: Request) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to rate' } },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(session.user.id, 'ratings')
    const { allowed, resetIn } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.ratings.limit,
      RATE_LIMITS.ratings.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
            'Retry-After': String(Math.ceil(resetIn / 1000)),
          }
        }
      )
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = ratingSchema.safeParse(body)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      const firstIssue = issues[0]
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input' 
          } 
        },
        { status: 400 }
      )
    }

    const { serverId, trustworthiness, usefulness, text } = validationResult.data

    // Check if server exists
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        source: true,
        userId: true,
      },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    // Prevent users from rating their own servers
    if (server.source === 'user' && server.userId && server.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You cannot rate your own server' } },
        { status: 403 }
      )
    }

    // Upsert rating
    const rating = await prisma.rating.upsert({
      where: {
        serverId_userId: {
          serverId,
          userId: session.user.id,
        },
      },
      create: {
        serverId,
        userId: session.user.id,
        trustworthiness,
        usefulness,
        text: text || null,
        status: 'approved', // Auto-approve reviews
      },
      update: {
        trustworthiness,
        usefulness,
        text: text || null,
        status: 'approved', // Re-approve on update
      },
    })

    // Update server aggregates including combined score for efficient sorting
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [aggregates, recentCount] = await Promise.all([
      prisma.rating.aggregate({
        where: { serverId },
        _avg: {
          trustworthiness: true,
          usefulness: true,
        },
        _count: true,
      }),
      prisma.rating.count({
        where: {
          serverId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ])

    const avgTrust = aggregates._avg.trustworthiness || 0
    const avgUse = aggregates._avg.usefulness || 0
    const combinedScore = (avgTrust + avgUse) / 2

    await prisma.server.update({
      where: { id: serverId },
      data: {
        avgTrustworthiness: avgTrust,
        avgUsefulness: avgUse,
        totalRatings: aggregates._count,
        combinedScore,
        recentRatingsCount: recentCount,
      } as {
        avgTrustworthiness: number
        avgUsefulness: number
        totalRatings: number
        combinedScore: number
        recentRatingsCount: number
      },
    })

    return NextResponse.json({ data: rating })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Rating error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit rating' } },
      { status: 500 }
    )
  }
}

