import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build where clause for search
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { organization: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Fetch servers with cursor-based pagination
    const servers = await prisma.server.findMany({
      where,
      orderBy: [
        { totalRatings: 'desc' },
        { avgTrustworthiness: 'desc' },
        { name: 'asc' },
      ],
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      select: {
        id: true,
        name: true,
        organization: true,
        description: true,
        version: true,
        repositoryUrl: true,
        avgTrustworthiness: true,
        avgUsefulness: true,
        totalRatings: true,
        isOfficial: true,
        syncedAt: true,
      },
    })

    // Determine if there are more results
    let nextCursor: string | undefined
    if (servers.length > limit) {
      const nextItem = servers.pop()
      nextCursor = nextItem?.id
    }

    // Get total count for the query
    const total = await prisma.server.count({ where })

    return NextResponse.json({
      data: servers,
      nextCursor,
      total,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch servers' } },
      { status: 500 }
    )
  }
}

