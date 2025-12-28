import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)

    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      include: {
        ratings: {
          select: {
            id: true,
            trustworthiness: true,
            usefulness: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              },
            },
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

    return NextResponse.json({ data: server })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch server' } },
      { status: 500 }
    )
  }
}

