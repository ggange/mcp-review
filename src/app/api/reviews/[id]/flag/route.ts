import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to flag a review' } },
        { status: 401 }
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

    // Update review status to flagged
    await prisma.rating.update({
      where: { id },
      data: {
        status: 'flagged',
      },
    })

    return NextResponse.json({
      data: { success: true },
    })
  } catch (error) {
    console.error('Flag error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to flag review' } },
      { status: 500 }
    )
  }
}


