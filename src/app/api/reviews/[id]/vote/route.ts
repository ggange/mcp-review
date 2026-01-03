import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reviewVoteSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to vote' } },
        { status: 401 }
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

    // Get existing vote to determine count changes
    const existingVote = await prisma.reviewVote.findUnique({
      where: {
        ratingId_userId: {
          ratingId: id,
          userId: session.user.id,
        },
      },
    })

    // Upsert vote
    await prisma.reviewVote.upsert({
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

    // Update vote counts
    const helpfulCount = await prisma.reviewVote.count({
      where: {
        ratingId: id,
        helpful: true,
      },
    })

    const notHelpfulCount = await prisma.reviewVote.count({
      where: {
        ratingId: id,
        helpful: false,
      },
    })

    await prisma.rating.update({
      where: { id },
      data: {
        helpfulCount,
        notHelpfulCount,
      },
    })

    return NextResponse.json({
      data: {
        helpfulCount,
        notHelpfulCount,
      },
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit vote' } },
      { status: 500 }
    )
  }
}


