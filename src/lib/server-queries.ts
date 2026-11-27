/**
 * Shared server query utilities
 * 
 * This module contains the shared logic for querying servers,
 * used by both the API routes and server components.
 */

import { prisma } from './db'
import { syncRegistry } from './mcp-registry'
import {
  getCache,
  setCache,
  getCacheKey,
  getOrSetCache,
  serverDetailCacheKey,
  serverReviewsCacheKey,
  SERVER_LIST_CACHE_NAMESPACE,
} from './cache'
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
  githubStars: true,
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

/**
 * Lean select for public listings (homepage grid, hot, top rated, badge search).
 * Cards only show a tool count, so the heavy detail-only fields (packages,
 * remotes, usage tips) are not loaded; toListServer fills them with null.
 */
export const serverListSelectFields = {
  id: true,
  name: true,
  organization: true,
  description: true,
  version: true,
  repositoryUrl: true,
  githubStars: true,
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
  userId: true,
  authorUsername: true,
  hasManyTools: true,
} as const

export type ListServerRow = Prisma.ServerGetPayload<{ select: typeof serverListSelectFields }>

export function toListServer(server: ListServerRow): ServerWithRatings {
  return {
    ...server,
    packages: null,
    remotes: null,
    usageTips: null,
    completeToolsUrl: null,
    source: server.source as ServerWithRatings['source'],
    tools: server.tools as ServerWithRatings['tools'],
  }
}

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
    const segmentQueries: Promise<ListServerRow[]>[] = []
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
            select: serverListSelectFields,
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
      servers: paginatedServers.map(toListServer),
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
      select: serverListSelectFields,
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers: servers.map(toListServer),
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
  // User servers first, then official servers, newest first within each.
  // Two small queries instead of loading 100 full rows to keep `limit` of them.
  const userServers = await prisma.server.findMany({
    where: { source: 'user' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: serverListSelectFields,
  })
  const officialServers = userServers.length < limit
    ? await prisma.server.findMany({
        where: { source: 'official' },
        orderBy: { createdAt: 'desc' },
        take: limit - userServers.length,
        select: serverListSelectFields,
      })
    : []

  return [...userServers, ...officialServers].map(toListServer)
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
    select: serverListSelectFields,
  })

  return servers.map(toListServer)
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

// ---------------------------------------------------------------------------
// Server detail (cached per server, invalidated by invalidateServerCache)
// ---------------------------------------------------------------------------

const SERVER_DETAIL_CACHE_TTL = 600
// Unknown IDs (typos, scrapers, random badge URLs) are remembered briefly so
// repeated requests for them don't each reach the database
const SERVER_DETAIL_MISS_TTL = 60

const serverDetailSelect = {
  id: true,
  name: true,
  description: true,
  organization: true,
  iconUrl: true,
  version: true,
  repositoryUrl: true,
  githubStars: true,
  source: true,
  userId: true,
  authorUsername: true,
  tools: true,
  packages: true,
  remotes: true,
  usageTips: true,
  avgRating: true,
  totalRatings: true,
  category: true,
  hasManyTools: true,
  completeToolsUrl: true,
  createdAt: true,
  syncedAt: true,
} as const satisfies Prisma.ServerSelect

export interface ServerDetail {
  id: string
  name: string
  description: string | null
  organization: string | null
  iconUrl: string | null
  version: string | null
  repositoryUrl: string | null
  githubStars: number | null
  source: string
  userId: string | null
  authorUsername: string | null
  tools: Array<{ name: string; description: string }> | null
  packages: Array<{ registryType?: string; identifier?: string }> | null
  remotes: Array<{ type?: string; url?: string }> | null
  usageTips: string | null
  avgRating: number
  totalRatings: number
  category: string | null
  hasManyTools: boolean
  completeToolsUrl: string | null
  createdAt: Date
  syncedAt: Date
}

/**
 * Public data for one server, shared by the detail page, OG image, badge and API
 */
export async function getServerDetail(serverId: string): Promise<ServerDetail | null> {
  const server = await getOrSetCache(
    serverDetailCacheKey(serverId),
    SERVER_DETAIL_CACHE_TTL,
    () => prisma.server.findUnique({ where: { id: serverId }, select: serverDetailSelect }),
    { missTtl: SERVER_DETAIL_MISS_TTL }
  )
  if (!server) return null

  return {
    ...server,
    tools: server.tools as ServerDetail['tools'],
    packages: server.packages as ServerDetail['packages'],
    remotes: server.remotes as ServerDetail['remotes'],
    // Dates come back from Redis as strings
    createdAt: new Date(server.createdAt),
    syncedAt: new Date(server.syncedAt),
  }
}

export const SERVER_REVIEWS_LIMIT = 12

export interface PublicReview {
  id: string
  rating: number
  text: string | null
  status: string
  helpfulCount: number
  notHelpfulCount: number
  createdAt: string
  updatedAt: string
  userId: string
  user: { name: string | null; image: string | null }
}

/**
 * Most recent approved reviews for a server. Viewer-independent, so it can be
 * cached; the viewer's own votes are loaded separately (getUserVotes).
 */
export async function getApprovedReviews(serverId: string): Promise<PublicReview[]> {
  return getOrSetCache(serverReviewsCacheKey(serverId), SERVER_DETAIL_CACHE_TTL, async () => {
    const ratings = await prisma.rating.findMany({
      where: { serverId, status: 'approved' },
      select: {
        id: true,
        rating: true,
        text: true,
        status: true,
        helpfulCount: true,
        notHelpfulCount: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: SERVER_REVIEWS_LIMIT,
    })
    return ratings.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  })
}

/**
 * The viewer's helpful/not-helpful votes on the given reviews, keyed by rating ID
 */
export async function getUserVotes(userId: string, ratingIds: string[]): Promise<Record<string, boolean>> {
  if (ratingIds.length === 0) return {}
  const votes = await prisma.reviewVote.findMany({
    where: { userId, ratingId: { in: ratingIds } },
    select: { ratingId: true, helpful: true },
  })
  return Object.fromEntries(votes.map((v) => [v.ratingId, v.helpful]))
}

// ---------------------------------------------------------------------------
// Query-param normalization (keeps cache keys bounded, rejects junk input)
// ---------------------------------------------------------------------------

export const MAX_PAGE = 500
const MAX_SEARCH_LENGTH = 100
const MIN_SEARCH_LENGTH = 2
const SORT_OPTIONS: readonly SortOption[] = ['most-reviewed', 'top-rated', 'newest', 'trending']

/** Page number from a query param: 1 for missing/invalid values, capped at MAX_PAGE */
export function parsePage(value: string | null | undefined): number {
  const page = parseInt(value ?? '', 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, MAX_PAGE)
}

/** Sort option from a query param, falling back to the default */
export function parseSort(value: string | null | undefined): SortOption {
  return SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : 'most-reviewed'
}

/**
 * Search term from a query param: trimmed, lowercased (matching is
 * case-insensitive anyway, so this only merges cache keys), length-capped.
 * Terms shorter than MIN_SEARCH_LENGTH are ignored: they match nearly every row.
 */
export function normalizeSearch(value: string | null | undefined): string | undefined {
  const term = (value ?? '').trim().toLowerCase().slice(0, MAX_SEARCH_LENGTH)
  return term.length >= MIN_SEARCH_LENGTH ? term : undefined
}

/** Rating bound from a query param, clamped to 0-5; undefined if missing/invalid */
export function parseRatingBound(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(5, Math.max(0, n))
}

/** Date filter from a query param: only YYYY-MM-DD is accepted */
export function parseDateParam(value: string | null | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}
