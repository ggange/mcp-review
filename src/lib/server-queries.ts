/**
 * Shared server query utilities
 * 
 * This module contains the shared logic for querying servers,
 * used by both the API routes and server components.
 */

import { prisma } from './db'
import { syncRegistry } from './mcp-registry'
import type { Prisma } from '@prisma/client'
import type { ServerWithRatings } from '@/types'

type ServerWhereInput = Prisma.ServerWhereInput
export type SortOption = 'most-reviewed' | 'top-rated' | 'newest' | 'trending'

export interface PaginatedServers {
  servers: ServerWithRatings[]
  total: number
  page: number
  totalPages: number
}

export interface ServerQueryOptions {
  search?: string
  category?: string
  page?: number
  sort?: SortOption
  minRating?: number
  maxRating?: number
  dateFrom?: string
  dateTo?: string
  source?: 'registry' | 'user' | 'official' | 'all'
  limit?: number
  hasGithub?: boolean
}


/**
 * Get order by clause for sorting
 */
export function getOrderBy(sort: SortOption, prioritizeSourceOrder: boolean = false) {
  // Base ordering for most-reviewed (default)
  const mostReviewedOrder = [
    { totalRatings: 'desc' as const },
    { combinedScore: 'desc' as const },
    { name: 'asc' as const },
  ]

  switch (sort) {
    case 'most-reviewed':
      // When prioritizing source order: user > official > registry
      // We'll handle this with raw SQL in queryServers function
      if (prioritizeSourceOrder) {
        // Return null to indicate we need custom ordering
        return null as any
      }
      return mostReviewedOrder
    case 'top-rated':
      return [
        { combinedScore: 'desc' as const },
        { totalRatings: 'desc' as const },
        { name: 'asc' as const },
      ]
    case 'newest':
      return [{ createdAt: 'desc' as const }, { name: 'asc' as const }]
    case 'trending':
      return [
        { recentRatingsCount: 'desc' as const },
        { combinedScore: 'desc' as const },
        { name: 'asc' as const },
      ]
    default:
      return mostReviewedOrder
  }
}

/**
 * Build the where clause for server queries
 */
export function buildWhereClause(options: ServerQueryOptions): ServerWhereInput {
  const where: ServerWhereInput = {}
  
  // Source filter
  if (options.source && options.source !== 'all') {
    where.source = options.source
  }

  // Search filter
  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' as const } },
      { organization: { contains: options.search, mode: 'insensitive' as const } },
      { description: { contains: options.search, mode: 'insensitive' as const } },
    ]
  }

  // Category filter
  if (options.category && options.category !== 'all') {
    where.category = options.category
  }

  // Rating range filter
  const minRating = options.minRating ?? 0
  if (minRating > 0 || options.maxRating !== undefined) {
    if (minRating > 0 && options.maxRating !== undefined) {
      where.avgTrustworthiness = { gte: minRating, lte: options.maxRating }
    } else if (minRating > 0) {
      where.avgTrustworthiness = { gte: minRating }
    } else if (options.maxRating !== undefined) {
      where.avgTrustworthiness = { lte: options.maxRating }
    }
  }

  // Date range filter
  if (options.dateFrom || options.dateTo) {
    where.createdAt = {}
    if (options.dateFrom) {
      const fromDate = new Date(options.dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      where.createdAt.gte = fromDate
    }
    if (options.dateTo) {
      const toDate = new Date(options.dateTo)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  // GitHub repository filter
  if (options.hasGithub === true) {
    where.repositoryUrl = { not: null }
  }

  return where
}

/**
 * Select fields for server queries
 */
export const serverSelectFields = {
  id: true,
  name: true,
  organization: true,
  description: true,
  version: true,
  repositoryUrl: true,
  packages: true,
  remotes: true,
  avgTrustworthiness: true,
  avgUsefulness: true,
  totalRatings: true,
  combinedScore: true,
  recentRatingsCount: true,
  category: true,
  createdAt: true,
  syncedAt: true,
  source: true,
  iconUrl: true,
  tools: true,
  usageTips: true,
  userId: true,
  authorUsername: true,
} as const

/**
 * Query servers with pagination and filters
 */
/**
 * Get source priority for custom ordering (user=1, official=2, registry=3)
 */
function getSourcePriority(source: string): number {
  switch (source) {
    case 'user': return 1
    case 'official': return 2
    case 'registry': return 3
    default: return 4
  }
}

export async function queryServers(options: ServerQueryOptions): Promise<PaginatedServers> {
  const page = Math.max(1, options.page ?? 1)
  const limit = options.limit ?? 20
  const skip = (page - 1) * limit
  const sort = options.sort ?? 'most-reviewed'
  
  const where = buildWhereClause(options)
  
  // Prioritize source order (user > official > registry) when using default sort and source is 'all'
  const prioritizeSourceOrder = sort === 'most-reviewed' && (!options.source || options.source === 'all')
  const orderBy = getOrderBy(sort, prioritizeSourceOrder)

  // If we need custom source ordering, fetch all matching servers, sort, then paginate
  if (prioritizeSourceOrder && orderBy === null) {
    // Fetch all matching servers (we'll paginate after sorting)
    const allServers = await prisma.server.findMany({
      where,
      select: serverSelectFields,
    })

    // Sort by source priority, then by other criteria
    const sortedServers = allServers.sort((a, b) => {
      // First, sort by source priority (user > official > registry)
      const priorityA = getSourcePriority(a.source)
      const priorityB = getSourcePriority(b.source)
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // Then by totalRatings (desc)
      if (a.totalRatings !== b.totalRatings) {
        return b.totalRatings - a.totalRatings
      }
      
      // Then by combinedScore (desc)
      if (a.combinedScore !== b.combinedScore) {
        return b.combinedScore - a.combinedScore
      }
      
      // Finally by name (asc)
      return a.name.localeCompare(b.name)
    })

    // Paginate after sorting
    const total = sortedServers.length
    const totalPages = Math.ceil(total / limit)
    const paginatedServers = sortedServers.slice(skip, skip + limit)

    return {
      servers: paginatedServers.map(server => ({
        ...server,
        source: server.source as 'registry' | 'user' | 'official',
        tools: server.tools as Array<{ name: string; description: string }> | null,
      })),
      total,
      page,
      totalPages,
    }
  }

  // Standard Prisma query for other cases
  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where,
      orderBy: orderBy as any,
      skip,
      take: limit,
      select: serverSelectFields,
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers: servers.map(server => ({
      ...server,
      source: server.source as 'registry' | 'user' | 'official',
      tools: server.tools as Array<{ name: string; description: string }> | null,
    })),
    total,
    page,
    totalPages,
  }
}

/**
 * Ensure the database has servers (sync if empty)
 */
export async function ensureServersExist(): Promise<void> {
  const serverCount = await prisma.server.count()
  if (serverCount === 0) {
    try {
      await syncRegistry()
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to sync from MCP registry:', error instanceof Error ? error.message : 'Unknown error')
      }
      // Continue even if sync fails - user can manually trigger sync later
    }
  }
}

/**
 * Get category counts for servers
 */
/**
 * Get the latest user-uploaded servers (not from registry)
 */
export async function getLatestUserServers(limit: number = 4): Promise<ServerWithRatings[]> {
  const servers = await prisma.server.findMany({
    where: { source: 'user' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: serverSelectFields,
  })

  return servers.map(server => ({
    ...server,
    source: server.source as 'registry' | 'user' | 'official',
    tools: server.tools as Array<{ name: string; description: string }> | null,
  }))
}

/**
 * Get the latest official and user servers (hot servers - most recent first)
 */
export async function getHotServers(limit: number = 4): Promise<ServerWithRatings[]> {
  const servers = await prisma.server.findMany({
    where: { 
      source: { in: ['user', 'official'] }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: serverSelectFields,
  })

  return servers.map(server => ({
    ...server,
    source: server.source as 'registry' | 'user' | 'official',
    tools: server.tools as Array<{ name: string; description: string }> | null,
  }))
}

/**
 * Get the top rated servers
 */
export async function getTopRatedServers(limit: number = 4): Promise<ServerWithRatings[]> {
  const servers = await prisma.server.findMany({
    where: { totalRatings: { gt: 0 } },
    orderBy: [
      { combinedScore: 'desc' },
      { totalRatings: 'desc' },
      { name: 'asc' },
    ],
    take: limit,
    select: serverSelectFields,
  })

  return servers.map(server => ({
    ...server,
    source: server.source as 'registry' | 'user' | 'official',
    tools: server.tools as Array<{ name: string; description: string }> | null,
  }))
}

/**
 * Get category counts for servers
 */
export async function getCategoryCounts(
  source: 'registry' | 'user' | 'official' | 'all' = 'all',
  options?: Omit<ServerQueryOptions, 'source' | 'category' | 'page' | 'limit' | 'sort'>
): Promise<Record<string, number>> {
  const baseWhere = buildWhereClause({ ...options, source })

  const [total, categoryResults] = await Promise.all([
    prisma.server.count({ where: baseWhere }),
    prisma.server.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: true,
    }),
  ])

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

