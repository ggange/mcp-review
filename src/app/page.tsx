import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { syncRegistry } from '@/lib/mcp-registry'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerTabs } from '@/components/server/server-tabs'
import type { ServerWithRatings } from '@/types'
import type { Prisma } from '@prisma/client'

type ServerWhereInput = Prisma.ServerWhereInput
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

interface HomePageProps {
  searchParams: Promise<{ 
    q?: string
    category?: string
    page?: string
    sort?: string
    minRating?: string
    maxRating?: string
    dateFrom?: string
    dateTo?: string
  }>
}

interface PaginatedServers {
  servers: ServerWithRatings[]
  total: number
  page: number
  totalPages: number
}

async function getRegistryServers(
  search?: string,
  category?: string,
  page: number = 1,
  sort: SortOption = 'most-reviewed',
  minRating: number = 0,
  maxRating?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginatedServers> {
  // Check if database is empty and sync if needed
  const serverCount = await prisma.server.count()
  if (serverCount === 0) {
    console.log('Database is empty, triggering initial sync from MCP registry...')
    try {
      await syncRegistry()
      console.log('Initial sync completed')
    } catch (error) {
      console.error('Failed to sync from MCP registry:', error)
      // Continue even if sync fails - user can manually trigger sync later
    }
  }

  const limit = 20
  const skip = (page - 1) * limit

  const where: ServerWhereInput = { source: 'registry' }

  // Add search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { organization: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
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
    })

    // Sort by combined average rating (trustworthiness + usefulness) / 2
    type ServerType = typeof allServers[0]
    const sorted = allServers.sort((a: ServerType, b: ServerType) => {
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

    return {
      servers: paginated.map(server => ({
        ...server,
        source: server.source as 'registry' | 'user',
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Handle trending sort separately
  if (sort === 'trending') {
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

    return {
      servers: paginated.map((serverWithRatings: ServerWithRecentRatings) => ({
        id: serverWithRatings.id,
        name: serverWithRatings.name,
        description: serverWithRatings.description,
        organization: serverWithRatings.organization,
        repository: serverWithRatings.repository,
        homepage: serverWithRatings.homepage,
        category: serverWithRatings.category,
        source: serverWithRatings.source as 'registry' | 'user',
        avgTrustworthiness: serverWithRatings.avgTrustworthiness,
        avgUsefulness: serverWithRatings.avgUsefulness,
        totalRatings: serverWithRatings.totalRatings,
        createdAt: serverWithRatings.createdAt,
        updatedAt: serverWithRatings.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where,
      orderBy: getOrderBy(sort),
      skip,
      take: limit,
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers: servers.map(server => ({
      ...server,
      source: server.source as 'registry' | 'user',
    })),
    total,
    page,
    totalPages,
  }
}

async function getUserServers(
  search?: string,
  category?: string,
  page: number = 1,
  sort: SortOption = 'most-reviewed',
  minRating: number = 0,
  maxRating?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginatedServers> {
  const limit = 20
  const skip = (page - 1) * limit

  const where: ServerWhereInput = { source: 'user' }

  // Add search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { organization: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
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
    })

    // Sort by combined average rating (trustworthiness + usefulness) / 2
    type ServerType = typeof allServers[0]
    const sorted = allServers.sort((a: ServerType, b: ServerType) => {
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

    return {
      servers: paginated.map(server => ({
        ...server,
        source: server.source as 'registry' | 'user',
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Handle trending sort separately
  if (sort === 'trending') {
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

    return {
      servers: paginated.map((serverWithRatings: ServerWithRecentRatings) => ({
        id: serverWithRatings.id,
        name: serverWithRatings.name,
        description: serverWithRatings.description,
        organization: serverWithRatings.organization,
        repository: serverWithRatings.repository,
        homepage: serverWithRatings.homepage,
        category: serverWithRatings.category,
        source: serverWithRatings.source as 'registry' | 'user',
        avgTrustworthiness: serverWithRatings.avgTrustworthiness,
        avgUsefulness: serverWithRatings.avgUsefulness,
        totalRatings: serverWithRatings.totalRatings,
        createdAt: serverWithRatings.createdAt,
        updatedAt: serverWithRatings.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where,
      orderBy: getOrderBy(sort),
      skip,
      take: limit,
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers: servers.map(server => ({
      ...server,
      source: server.source as 'registry' | 'user',
    })),
    total,
    page,
    totalPages,
  }
}

async function getCategoryCounts(
  source: 'registry' | 'user',
  search?: string,
  minRating?: number,
  maxRating?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<Record<string, number>> {
  const baseWhere: ServerWhereInput = { source }
  
  if (search) {
    baseWhere.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { organization: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  // Add rating range filter
  if (minRating !== undefined && minRating > 0 || maxRating !== undefined) {
    if (minRating !== undefined && minRating > 0 && maxRating !== undefined) {
      baseWhere.avgTrustworthiness = { gte: minRating, lte: maxRating }
    } else if (minRating !== undefined && minRating > 0) {
      baseWhere.avgTrustworthiness = { gte: minRating }
    } else if (maxRating !== undefined) {
      baseWhere.avgTrustworthiness = { lte: maxRating }
    }
  }

  // Add date range filter
  if (dateFrom || dateTo) {
    baseWhere.createdAt = {}
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      baseWhere.createdAt.gte = fromDate
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      baseWhere.createdAt.lte = toDate
    }
  }

  // Use groupBy to get all category counts in a single query
  const [total, categoryResults] = await Promise.all([
    prisma.server.count({ where: baseWhere }),
    prisma.server.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: true,
    }),
  ])

  // Transform groupBy results into the expected format
  const counts: Record<string, number> = {
    total,
    database: 0,
    search: 0,
    code: 0,
    web: 0,
    ai: 0,
    data: 0,
    tools: 0,
    other: 0,
  }

  for (const result of categoryResults) {
    const category = result.category || 'other'
    if (category in counts) {
      counts[category] = result._count
    }
  }

  return counts
}

async function ServerTabsWrapper({ 
  search, 
  category, 
  page,
  sort,
  minRating,
  maxRating,
  dateFrom,
  dateTo
}: { 
  search?: string
  category?: string
  page: number
  sort: SortOption
  minRating: number
  maxRating?: number
  dateFrom?: string
  dateTo?: string
}) {
  const [registryData, userData, registryCounts, userCounts] = await Promise.all([
    getRegistryServers(search, category, page, sort, minRating, maxRating, dateFrom, dateTo),
    getUserServers(search, category, page, sort, minRating, maxRating, dateFrom, dateTo),
    getCategoryCounts('registry', search, minRating, maxRating, dateFrom, dateTo),
    getCategoryCounts('user', search, minRating, maxRating, dateFrom, dateTo),
  ])

  return (
    <ServerTabs
      registryData={registryData}
      userData={userData}
      registryCounts={registryCounts}
      userCounts={userCounts}
    />
  )
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const q = params.q
  const category = params.category || 'all'
  const page = Math.max(1, parseInt(params.page || '1'))
  const sort = (params.sort || 'most-reviewed') as SortOption
  const minRating = parseFloat(params.minRating || '0')
  const maxRating = params.maxRating ? parseFloat(params.maxRating) : undefined
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          MCP Review
          </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows.
          </p>
        </div>

      {/* Search */}
      <div className="mx-auto mb-8 max-w-xl">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Server Tabs */}
      <div className="mb-12">
        <Suspense fallback={<ServerGridSkeleton />}>
          <ServerTabsWrapper 
            search={q} 
            category={category} 
            page={page} 
            sort={sort} 
            minRating={minRating}
            maxRating={maxRating}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </Suspense>
      </div>
    </div>
  )
}
