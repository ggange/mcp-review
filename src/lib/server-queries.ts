/**
 * Shared server query utilities
 * 
 * This module contains the shared logic for querying servers,
 * used by both the API routes and server components.
 */

import { prisma } from './db'
import { syncRegistry } from './mcp-registry'
import { getCache, setCache, getCacheKey, SERVER_LIST_CACHE_NAMESPACE } from './cache'
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


type ServerOrderBy = Prisma.ServerOrderByWithRelationInput | Prisma.ServerOrderByWithRelationInput[]

/**
 * Get order by clause for sorting
 */
export function getOrderBy(sort: SortOption, prioritizeSourceOrder: boolean = false): ServerOrderBy | null {
  // Base ordering for most-reviewed (default)
  const mostReviewedOrder: Prisma.ServerOrderByWithRelationInput[] = [
    { totalRatings: 'desc' },
    { combinedScore: 'desc' },
    { name: 'asc' },
  ]

  switch (sort) {
    case 'most-reviewed':
      // When prioritizing source order: user > official > registry
      // We'll handle this with raw SQL in queryServers function
      if (prioritizeSourceOrder) {
        // Return null to indicate we need custom ordering
        return null
      }
      return mostReviewedOrder
    case 'top-rated':
      return [
        { combinedScore: 'desc' },
        { totalRatings: 'desc' },
        { name: 'asc' },
      ]
    case 'newest':
      return [{ createdAt: 'desc' }, { name: 'asc' }]
    case 'trending':
      return [
        { recentRatingsCount: 'desc' },
        { combinedScore: 'desc' },
        { name: 'asc' },
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
      where.avgRating = { gte: minRating, lte: options.maxRating }
    } else if (minRating > 0) {
      where.avgRating = { gte: minRating }
    } else if (options.maxRating !== undefined) {
      where.avgRating = { lte: options.maxRating }
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
  avgRating: true,
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
  hasManyTools: true,
  completeToolsUrl: true,
} as const

// Public listings change only when servers or ratings change (which
// invalidates them), so a short TTL keeps most page views off the database
const SERVER_LIST_CACHE_TTL = 300

/**
 * Read a server listing from Redis, or load and cache it.
 * JSON round-tripping turns Dates into strings, so they are revived here.
 */
async function withServerListCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cacheKey = getCacheKey(SERVER_LIST_CACHE_NAMESPACE, key)
  const cached = await getCache<T>(cacheKey)
  if (cached !== null) return reviveServerDates(cached)

  const value = await load()
  await setCache(cacheKey, value, SERVER_LIST_CACHE_TTL)
  return value
}

function reviveServerDates<T>(value: T): T {
  const revive = (server: ServerWithRatings) => {
    server.createdAt = new Date(server.createdAt)
    server.syncedAt = new Date(server.syncedAt)
  }
  if (Array.isArray(value)) value.forEach(revive)
  else if (value && typeof value === 'object' && 'servers' in value) {
    (value as unknown as PaginatedServers).servers.forEach(revive)
  }
  return value
}

// Source order for the default listing: user > official > registry
const PRIORITIZED_SOURCES = ['user', 'official', 'registry'] as const

/**
 * Query servers with pagination and filters
 */
export async function queryServers(options: ServerQueryOptions): Promise<PaginatedServers> {
  return withServerListCache(`list:${JSON.stringify(options)}`, () => queryServersUncached(options))
}

async function queryServersUncached(options: ServerQueryOptions): Promise<PaginatedServers> {
  const page = Math.max(1, options.page ?? 1)
  const limit = options.limit ?? 20
  const skip = (page - 1) * limit
  const sort = options.sort ?? 'most-reviewed'
  
  const where = buildWhereClause(options)
  
  // Prioritize source order (user > official > registry) when using default sort and source is 'all'
  const prioritizeSourceOrder = sort === 'most-reviewed' && (!options.source || options.source === 'all')
  const orderBy = getOrderBy(sort, prioritizeSourceOrder)

  // Custom source ordering (user > official > registry): paginate across one
  // query per source instead of loading every matching server into memory
  if (prioritizeSourceOrder && orderBy === null) {
    const sourceCounts = await prisma.server.groupBy({
      by: ['source'],
      where,
      _count: true,
    })
    const countBySource = new Map(sourceCounts.map((row) => [row.source, row._count]))

    const otherCount = sourceCounts
      .filter((row) => !PRIORITIZED_SOURCES.includes(row.source as typeof PRIORITIZED_SOURCES[number]))
      .reduce((sum, row) => sum + row._count, 0)
    const segments: Array<{ where: ServerWhereInput; count: number }> = [
      ...PRIORITIZED_SOURCES.map((source) => ({
        where: { ...where, source },
        count: countBySource.get(source) ?? 0,
      })),
      { where: { ...where, source: { notIn: [...PRIORITIZED_SOURCES] } }, count: otherCount },
    ]

    const segmentOrder = getOrderBy('most-reviewed') as Prisma.ServerOrderByWithRelationInput[]
    const segmentQueries: Promise<Array<Prisma.ServerGetPayload<{ select: typeof serverSelectFields }>>>[] = []
    let offset = 0
    let remaining = limit
    for (const segment of segments) {
      const segmentSkip = Math.max(0, skip - offset)
      if (remaining > 0 && segmentSkip < segment.count) {
        const take = Math.min(remaining, segment.count - segmentSkip)
        segmentQueries.push(
          prisma.server.findMany({
            where: segment.where,
            orderBy: segmentOrder,
            skip: segmentSkip,
            take,
            select: serverSelectFields,
          })
        )
        remaining -= take
      }
      offset += segment.count
    }

    const paginatedServers = (await Promise.all(segmentQueries)).flat()
    const total = offset
    const totalPages = Math.ceil(total / limit)

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
      orderBy: orderBy as Prisma.ServerOrderByWithRelationInput[],
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
let serversKnownToExist = false

export async function ensureServersExist(): Promise<void> {
  // Servers are never all deleted in normal operation, so skip the count
  // query once this instance has seen a non-empty table
  if (serversKnownToExist) return
  const serverCount = await prisma.server.count()
  if (serverCount > 0) {
    serversKnownToExist = true
    return
  }
  try {
    await syncRegistry()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to sync from MCP registry:', error instanceof Error ? error.message : 'Unknown error')
    }
    // Continue even if sync fails - user can manually trigger sync later
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
 * User servers are shown before official servers, sorted by date within each category
 */
export async function getHotServers(limit: number = 4): Promise<ServerWithRatings[]> {
  return withServerListCache(`hot:${limit}`, () => getHotServersUncached(limit))
}

async function getHotServersUncached(limit: number): Promise<ServerWithRatings[]> {
  // Fetch more servers than needed to ensure proper sorting
  const fetchLimit = Math.max(limit * 2, 100)
  const servers = await prisma.server.findMany({
    where: { 
      source: { in: ['user', 'official'] }
    },
    orderBy: { createdAt: 'desc' },
    take: fetchLimit,
    select: serverSelectFields,
  })

  // Sort: user servers first, then official servers, both sorted by date (newest first)
  const sortedServers = servers.sort((a, b) => {
    // First, prioritize user servers over official
    if (a.source === 'user' && b.source === 'official') return -1
    if (a.source === 'official' && b.source === 'user') return 1
    
    // Within the same source, sort by createdAt (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Take only the requested limit
  return sortedServers.slice(0, limit).map(server => ({
    ...server,
    source: server.source as 'registry' | 'user' | 'official',
    tools: server.tools as Array<{ name: string; description: string }> | null,
  }))
}

/**
 * Get the top rated servers
 */
export async function getTopRatedServers(limit: number = 4): Promise<ServerWithRatings[]> {
  return withServerListCache(`top:${limit}`, () => getTopRatedServersUncached(limit))
}

async function getTopRatedServersUncached(limit: number): Promise<ServerWithRatings[]> {
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
  return withServerListCache(`categories:${source}:${JSON.stringify(options ?? {})}`, () =>
    getCategoryCountsUncached(source, options)
  )
}

async function getCategoryCountsUncached(
  source: 'registry' | 'user' | 'official' | 'all',
  options?: Omit<ServerQueryOptions, 'source' | 'category' | 'page' | 'limit' | 'sort'>
): Promise<Record<string, number>> {
  const baseWhere = buildWhereClause({ ...options, source })

  const categoryResults = await prisma.server.groupBy({
    by: ['category'],
    where: baseWhere,
    _count: true,
  })

  const counts: Record<string, number> = {
    // Every matching server falls in exactly one group, so no separate count query is needed
    total: categoryResults.reduce((sum, result) => sum + result._count, 0),
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
