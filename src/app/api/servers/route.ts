import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    // Add search filter
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' as const } },
        { organization: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ]
    }

    // Add category filter
    if (category && category !== 'all') {
      where.category = category
    }

    // Fetch servers with offset-based pagination
    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        orderBy: [
          { totalRatings: 'desc' },
          { avgTrustworthiness: 'desc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
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
          category: true,
          syncedAt: true,
          source: true,
        },
      }),
      prisma.server.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: servers,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch servers' } },
      { status: 500 }
    )
  }
}

