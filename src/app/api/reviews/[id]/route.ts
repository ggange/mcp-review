import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reviewUpdateSchema, reviewIdParamSchema } from '@/lib/validations'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import { deleteCache, getCacheKey } from '@/lib/cache'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to delete a review' } },
        { status: 401 }
      )
    }

    // Rate limiting (reuse ratings limit for review mutations)
    const rateLimitKey = getRateLimitKey(session.user.id, 'ratings')
    const { allowed, resetIn } = await checkRateLimit(
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

    const { id } = await params

    // Validate route parameter
    const paramValidation = reviewIdParamSchema.safeParse({ id })
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid review ID format' } },
        { status: 400 }
      )
    }

    // Check if rating exists and user owns it
    const rating = await prisma.rating.findUnique({
      where: { id: paramValidation.data.id },
      select: { userId: true, serverId: true },
    })

    if (!rating) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (rating.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own reviews' } },
        { status: 403 }
      )
    }

    // Delete the rating (this will cascade delete votes)
    await prisma.rating.delete({
      where: { id: paramValidation.data.id },
    })

    // Recalculate server aggregates including combined score
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [aggregates, recentCount] = await Promise.all([
      prisma.rating.aggregate({
        where: { serverId: rating.serverId },
        _avg: {
          trustworthiness: true,
          usefulness: true,
        },
        _count: true,
      }),
      prisma.rating.count({
        where: {
          serverId: rating.serverId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ])

    const avgTrust = aggregates._avg.trustworthiness || 0
    const avgUse = aggregates._avg.usefulness || 0
    const combinedScore = (avgTrust + avgUse) / 2

    await prisma.server.update({
      where: { id: rating.serverId },
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

    // Invalidate user caches
    await Promise.all([
      deleteCache(getCacheKey('dashboard', rating.userId)),
      deleteCache(getCacheKey('user', rating.userId)),
      deleteCache(getCacheKey('user', rating.userId, 'ratings')),
    ])

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Review delete error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to update a review' } },
        { status: 401 }
      )
    }

    // Rate limiting (reuse ratings limit for review mutations)
    const rateLimitKey = getRateLimitKey(session.user.id, 'ratings')
    const { allowed, resetIn } = await checkRateLimit(
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

    const { id } = await params
    const body = await request.json()

    // Validate route parameter
    const paramValidation = reviewIdParamSchema.safeParse({ id })
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid review ID format' } },
        { status: 400 }
      )
    }

    // Validate input
    const validationResult = reviewUpdateSchema.safeParse(body)
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

    // Check if rating exists and user owns it
    const rating = await prisma.rating.findUnique({
      where: { id: paramValidation.data.id },
      select: { userId: true, serverId: true },
    })

    if (!rating) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    if (rating.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only edit your own reviews' } },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: {
      text?: string | null
      trustworthiness?: number
      usefulness?: number
    } = {}

    if (validationResult.data.text !== undefined) {
      updateData.text = validationResult.data.text || null
    }
    if (validationResult.data.trustworthiness !== undefined) {
      updateData.trustworthiness = validationResult.data.trustworthiness
    }
    if (validationResult.data.usefulness !== undefined) {
      updateData.usefulness = validationResult.data.usefulness
    }

    // Update the rating
    const updatedRating = await prisma.rating.update({
      where: { id: paramValidation.data.id },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    })

    // Recalculate server aggregates including combined score
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [aggregates, recentCount] = await Promise.all([
      prisma.rating.aggregate({
        where: { serverId: rating.serverId },
        _avg: {
          trustworthiness: true,
          usefulness: true,
        },
        _count: true,
      }),
      prisma.rating.count({
        where: {
          serverId: rating.serverId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ])

    const avgTrust = aggregates._avg.trustworthiness || 0
    const avgUse = aggregates._avg.usefulness || 0
    const combinedScore = (avgTrust + avgUse) / 2

    await prisma.server.update({
      where: { id: rating.serverId },
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

    // Invalidate user caches
    await Promise.all([
      deleteCache(getCacheKey('dashboard', rating.userId)),
      deleteCache(getCacheKey('user', rating.userId)),
      deleteCache(getCacheKey('user', rating.userId, 'ratings')),
    ])

    return NextResponse.json({ data: updatedRating })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Review update error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update review' } },
      { status: 500 }
    )
  }
}


