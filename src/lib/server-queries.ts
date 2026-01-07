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
  source?: 'registry' | 'user' | 'all'
  limit?: number
}

/**
 * Get order by clause for sorting
 */
export function getOrderBy(sort: SortOption) {
  switch (sort) {
    case 'most-reviewed':
      return [
        { totalRatings: 'desc' as const },
        { combinedScore: 'desc' as const },
        { name: 'asc' as const },
      ]
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
      return [
        { totalRatings: 'desc' as const },
        { combinedScore: 'desc' as const },
        { name: 'asc' as const },
      ]
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
} as const

/**
 * Query servers with pagination and filters
 */
export async function queryServers(options: ServerQueryOptions): Promise<PaginatedServers> {
  const page = Math.max(1, options.page ?? 1)
  const limit = options.limit ?? 20
  const skip = (page - 1) * limit
  const sort = options.sort ?? 'most-reviewed'
  
  const where = buildWhereClause(options)
  const orderBy = getOrderBy(sort)

  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where,
      orderBy,
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
      source: server.source as 'registry' | 'user',
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
    console.log('Database is empty, triggering initial sync from MCP registry...')
    try {
      await syncRegistry()
      console.log('Initial sync completed')
    } catch (error) {
      console.error('Failed to sync from MCP registry:', error)
      // Continue even if sync fails - user can manually trigger sync later
    }
  }
}

/**
 * Get category counts for servers
 */
export async function getCategoryCounts(
  source: 'registry' | 'user',
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

