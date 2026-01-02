import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serverUploadSchema } from '@/lib/validations'
import { categorizeServer } from '@/lib/server-categories'

type ServerWhereInput = Parameters<typeof prisma.server.findMany>[0]['where']

type SortOption = 'most-reviewed' | 'top-rated' | 'newest' | 'trending'

function getOrderBy(sort: SortOption) {
  switch (sort) {
    case 'most-reviewed':
      return [
        { totalRatings: 'desc' as const },
        { avgTrustworthiness: 'desc' as const },
        { name: 'asc' as const },
      ]
    case 'top-rated':
      // Handled separately with in-memory sorting for combined score
      return [
        { totalRatings: 'desc' as const },
        { name: 'asc' as const },
      ]
    case 'newest':
      return [{ createdAt: 'desc' as const }, { name: 'asc' as const }]
    case 'trending':
      // For trending, we'll sort by recent ratings count
      // This will be handled separately with a join
      return [
        { totalRatings: 'desc' as const },
        { avgTrustworthiness: 'desc' as const },
        { name: 'asc' as const },
      ]
    default:
      return [
        { totalRatings: 'desc' as const },
        { avgTrustworthiness: 'desc' as const },
        { name: 'asc' as const },
      ]
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const sort = (searchParams.get('sort') || 'most-reviewed') as SortOption
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const maxRating = searchParams.get('maxRating') ? parseFloat(searchParams.get('maxRating')!) : undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    // Build where clause
    const where: ServerWhereInput = {}
    
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

    // Add rating range filter
    if (minRating > 0 || maxRating !== undefined) {
      if (minRating > 0 && maxRating !== undefined) {
        where.avgTrustworthiness = { gte: minRating, lte: maxRating }
      } else if (minRating > 0) {
        where.avgTrustworthiness = { gte: minRating }
      } else if (maxRating !== undefined) {
        where.avgTrustworthiness = { lte: maxRating }
      }
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        where.createdAt.gte = fromDate
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    // Handle top-rated sort separately (needs combined score calculation)
    if (sort === 'top-rated') {
      const allServers = await prisma.server.findMany({
        where,
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
          createdAt: true,
          syncedAt: true,
          source: true,
        },
      })

      // Sort by combined average rating (trustworthiness + usefulness) / 2
      type ServerWithRatings = typeof allServers[0]
      const sorted = allServers.sort((a: ServerWithRatings, b: ServerWithRatings) => {
        const aCombined = (a.avgTrustworthiness + a.avgUsefulness) / 2
        const bCombined = (b.avgTrustworthiness + b.avgUsefulness) / 2
        
        if (aCombined !== bCombined) {
          return bCombined - aCombined // Descending order
        }
        
        // Tie-breaker: prefer servers with more ratings
        if (a.totalRatings !== b.totalRatings) {
          return b.totalRatings - a.totalRatings
        }
        
        return a.name.localeCompare(b.name)
      })

      const paginated = sorted.slice(skip, skip + limit)
      const total = sorted.length

      return NextResponse.json({
        data: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    }

    // Handle trending sort separately
    if (sort === 'trending') {
      // For trending, we need to calculate recent ratings count
      // We'll fetch all servers and sort in memory for now
      // TODO: Optimize with a computed field or raw query
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const serversWithRatings = await prisma.server.findMany({
        where,
        include: {
          ratings: {
            where: {
              createdAt: { gte: thirtyDaysAgo },
            },
            select: { id: true },
          },
        },
      })

      // Sort by recent ratings count, then by average rating
      type ServerWithRecentRatings = typeof serversWithRatings[0]
      const sorted = serversWithRatings.sort((a: ServerWithRecentRatings, b: ServerWithRecentRatings) => {
        const aRecentCount = a.ratings.length
        const bRecentCount = b.ratings.length
        
        if (aRecentCount !== bRecentCount) {
          return bRecentCount - aRecentCount
        }
        
        const aAvg = (a.avgTrustworthiness + a.avgUsefulness) / 2
        const bAvg = (b.avgTrustworthiness + b.avgUsefulness) / 2
        
        if (aAvg !== bAvg) {
          return bAvg - aAvg
        }
        
        return a.name.localeCompare(b.name)
      })

      const paginated = sorted.slice(skip, skip + limit)
      const total = sorted.length

      return NextResponse.json({
        data: paginated.map(({ ratings, ...server }: ServerWithRecentRatings) => ({
          ...server,
          recentRatingsCount: ratings.length,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    }

    // Fetch servers with offset-based pagination
    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        orderBy: getOrderBy(sort),
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
          createdAt: true,
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

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to upload servers' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = serverUploadSchema.safeParse(body)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      const firstIssue = issues[0]
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_INPUT', 
            message: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input' 
          } 
        },
        { status: 400 }
      )
    }

    const { name, organization, description, version, repositoryUrl } = validationResult.data

    // Generate server ID in format: organization/name
    const serverId = `${organization}/${name}`

    // Check if server already exists
    const existingServer = await prisma.server.findUnique({
      where: { id: serverId },
    })

    if (existingServer) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Server with this name and organization already exists' } },
        { status: 409 }
      )
    }

    // Categorize server based on description
    const category = categorizeServer(description || null)

    // Create server
    const server = await prisma.server.create({
      data: {
        id: serverId,
        name,
        organization,
        description: description || null,
        version: version || null,
        repositoryUrl: repositoryUrl || null,
        packages: null,
        remotes: null,
        category,
        source: 'user',
        syncedAt: new Date(),
      },
    })

    return NextResponse.json({ data: server }, { status: 201 })
  } catch (error) {
    console.error('Server upload error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload server' } },
      { status: 500 }
    )
  }
}

