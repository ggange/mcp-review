import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { syncRegistry } from '@/lib/mcp-registry'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerTabs } from '@/components/server/server-tabs'
import type { ServerWithRatings } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
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
  page: number = 1
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

  const where: any = { source: 'registry' }

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
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers,
    total,
    page,
    totalPages,
  }
}

async function getUserServers(
  search?: string,
  category?: string,
  page: number = 1
): Promise<PaginatedServers> {
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = { source: 'user' }

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
    }),
    prisma.server.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    servers,
    total,
    page,
    totalPages,
  }
}

async function getCategoryCounts(source: 'registry' | 'user', search?: string): Promise<Record<string, number>> {
  const baseWhere: any = { source }
  
  if (search) {
    baseWhere.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { organization: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  const [total, ...categoryCounts] = await Promise.all([
    prisma.server.count({ where: baseWhere }),
    prisma.server.count({ where: { ...baseWhere, category: 'database' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'search' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'code' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'web' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'ai' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'data' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'tools' } }),
    prisma.server.count({ where: { ...baseWhere, category: 'other' } }),
  ])

  return {
    total,
    database: categoryCounts[0],
    search: categoryCounts[1],
    code: categoryCounts[2],
    web: categoryCounts[3],
    ai: categoryCounts[4],
    data: categoryCounts[5],
    tools: categoryCounts[6],
    other: categoryCounts[7],
  }
}

async function ServerTabsWrapper({ 
  search, 
  category, 
  page 
}: { 
  search?: string
  category?: string
  page: number
}) {
  const [registryData, userData, registryCounts, userCounts] = await Promise.all([
    getRegistryServers(search, category, page),
    getUserServers(search, category, page),
    getCategoryCounts('registry', search),
    getCategoryCounts('user', search),
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
          <ServerTabsWrapper search={q} category={category} page={page} />
        </Suspense>
      </div>
    </div>
  )
}
