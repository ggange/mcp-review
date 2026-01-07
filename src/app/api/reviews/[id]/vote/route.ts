import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reviewVoteSchema } from '@/lib/validations'
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
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to vote' } },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(session.user.id, 'votes')
    const { allowed, resetIn } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.votes.limit,
      RATE_LIMITS.votes.windowMs
    )

    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many votes. Please try again later.' } },
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
    const body = await request.json()

    // Validate input
    const validationResult = reviewVoteSchema.safeParse(body)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      const firstIssue = issues[0]
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_INPUT',
            message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input',
          },
        },
        { status: 400 }
      )
    }

    const { helpful } = validationResult.data

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

    // Prevent voting on own reviews
    if (rating.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You cannot vote on your own review' } },
        { status: 403 }
      )
    }

    // Use a transaction to upsert vote and update counts in a single database round-trip
    const result = await prisma.$transaction(async (tx) => {
      // Upsert vote
      await tx.reviewVote.upsert({
        where: {
          ratingId_userId: {
            ratingId: id,
            userId: session.user.id,
          },
        },
        create: {
          ratingId: id,
          userId: session.user.id,
          helpful,
        },
        update: {
          helpful,
        },
      })

      // Get vote counts using groupBy (single query instead of two count queries)
      const voteCounts = await tx.reviewVote.groupBy({
        by: ['helpful'],
        where: { ratingId: id },
        _count: true,
      })

      // Parse the grouped counts
      const helpfulCount = voteCounts.find(v => v.helpful === true)?._count ?? 0
      const notHelpfulCount = voteCounts.find(v => v.helpful === false)?._count ?? 0

      // Update the rating with new counts
      await tx.rating.update({
        where: { id },
        data: {
          helpfulCount,
          notHelpfulCount,
        },
      })

      return { helpfulCount, notHelpfulCount }
    })

    return NextResponse.json({
      data: result,
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit vote' } },
      { status: 500 }
    )
  }
}


