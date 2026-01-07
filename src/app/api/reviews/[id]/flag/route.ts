import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to flag a review' } },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(session.user.id, 'flags')
    const { allowed, resetIn } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.flags.limit,
      RATE_LIMITS.flags.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many flag attempts. Please try again later.' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          }
        }
      )
    }

    const { id } = await params

    // Check if rating exists
    const rating = await prisma.rating.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!rating) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      )
    }

    // Prevent flagging own reviews
    if (rating.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You cannot flag your own review' } },
        { status: 403 }
      )
    }

    // Threshold: number of unique flags required to auto-flag a review
    const FLAG_THRESHOLD = 3

    // Check if user has already flagged this review
    const existingFlag = await (prisma as any).reviewFlag.findUnique({
      where: {
        ratingId_userId: {
          ratingId: id,
          userId: session.user.id,
        },
      },
    })

    if (existingFlag) {
      return NextResponse.json(
        { error: { code: 'ALREADY_FLAGGED', message: 'You have already flagged this review' } },
        { status: 400 }
      )
    }

    // Create the flag and update the count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the flag entry
      await (tx as any).reviewFlag.create({
        data: {
          ratingId: id,
          userId: session.user.id,
        },
      })

      // Count total flags for this review
      const flagCount = await (tx as any).reviewFlag.count({
        where: { ratingId: id },
      })

      // Update the rating's flag count and potentially its status
      const updatedRating = await tx.rating.update({
        where: { id },
        data: {
          flagCount,
          // Only auto-flag if threshold is reached and status is still approved
          ...(flagCount >= FLAG_THRESHOLD && { status: 'flagged' }),
        } as {
          flagCount: number
          status?: string
        },
        select: {
          status: true,
          flagCount: true,
        } as {
          status: boolean
          flagCount: boolean
        },
      })

      return updatedRating as { status: string; flagCount: number }
    })

    return NextResponse.json({
      data: { 
        success: true,
        flagCount: result.flagCount,
        statusChanged: result.status === 'flagged',
      },
    })
  } catch (error) {
    console.error('Flag error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to flag review' } },
      { status: 500 }
    )
  }
}


