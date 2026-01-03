import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)
    const session = await auth()

    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      include: {
        ratings: {
          where: {
            status: 'approved', // Only show approved reviews
          },
          select: {
            id: true,
            trustworthiness: true,
            usefulness: true,
            text: true,
            status: true,
            helpfulCount: true,
            notHelpfulCount: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            reviewVotes: session?.user?.id
              ? {
                  where: {
                    userId: session.user.id,
                  },
                  select: {
                    helpful: true,
                  },
                  take: 1,
                }
              : false,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
      )
    }

    // Transform ratings to include user vote
    const ratingsWithVotes = server.ratings.map((rating) => {
      const userVote =
        rating.reviewVotes && rating.reviewVotes.length > 0
          ? { helpful: rating.reviewVotes[0].helpful }
          : null

      const { reviewVotes, ...ratingWithoutVotes } = rating

      return {
        ...ratingWithoutVotes,
        userVote,
      }
    })

    return NextResponse.json({
      data: {
        ...server,
        ratings: ratingsWithVotes,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch server' } },
      { status: 500 }
    )
  }
}

