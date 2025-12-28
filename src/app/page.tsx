import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { syncRegistry } from '@/lib/mcp-registry'
import { SearchBar } from '@/components/search-bar'
import { ServerGrid } from '@/components/server-grid'
import { ServerGridSkeleton } from '@/components/server-card-skeleton'
import type { ServerWithRatings } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ q?: string }>
}

async function getServers(search?: string): Promise<ServerWithRatings[]> {
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

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { organization: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const servers = await prisma.server.findMany({
    where,
    orderBy: [
      { totalRatings: 'desc' },
      { avgTrustworthiness: 'desc' },
      { name: 'asc' },
    ],
    take: 50,
  })

  return servers
}

async function ServerList({ search }: { search?: string }) {
  const servers = await getServers(search)
  return <ServerGrid servers={servers} />
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          MCP Server Marketplace
          </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400">
          Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows.
          </p>
        </div>

      {/* Search */}
      <div className="mx-auto mb-8 max-w-xl">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Server Grid */}
      <Suspense fallback={<ServerGridSkeleton />}>
        <ServerList search={q} />
      </Suspense>

      {/* Stats */}
      <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
        <p>
          Synced from the{' '}
          <a
            href="https://registry.modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300"
          >
            Official MCP Registry
          </a>
        </p>
        </div>
    </div>
  )
}
