import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to rate' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { serverId, trustworthiness, usefulness } = body

    // Validate input
    if (!serverId || typeof serverId !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Server ID is required' } },
        { status: 400 }
      )
    }

    if (
      typeof trustworthiness !== 'number' ||
      trustworthiness < 1 ||
      trustworthiness > 5
    ) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Trustworthiness must be 1-5' } },
        { status: 400 }
      )
    }

    if (
      typeof usefulness !== 'number' ||
      usefulness < 1 ||
      usefulness > 5
    ) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Usefulness must be 1-5' } },
        { status: 400 }
      )
    }

    // Check if server exists
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    })

    if (!server) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Server not found' } },
        { status: 404 }
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
      },
      update: {
        trustworthiness,
        usefulness,
      },
    })

    // Update server aggregates
    const aggregates = await prisma.rating.aggregate({
      where: { serverId },
      _avg: {
        trustworthiness: true,
        usefulness: true,
      },
      _count: true,
    })

    await prisma.server.update({
      where: { id: serverId },
      data: {
        avgTrustworthiness: aggregates._avg.trustworthiness || 0,
        avgUsefulness: aggregates._avg.usefulness || 0,
        totalRatings: aggregates._count,
      },
    })

    return NextResponse.json({ data: rating })
  } catch (error) {
    console.error('Rating error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit rating' } },
      { status: 500 }
    )
  }
}

