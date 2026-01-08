import { Suspense } from 'react'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerList } from '@/components/server/server-tabs'
import { 
  queryServers, 
  getCategoryCounts, 
  ensureServersExist,
  type SortOption 
} from '@/lib/server-queries'

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
    hasGithub?: string
    source?: string
  }>
}

async function ServerListWrapper({ 
  search, 
  category, 
  page,
  sort,
  minRating,
  maxRating,
  dateFrom,
  dateTo,
  hasGithub,
  source
}: { 
  search?: string
  category?: string
  page: number
  sort: SortOption
  minRating: number
  maxRating?: number
  dateFrom?: string
  dateTo?: string
  hasGithub?: boolean
  source?: string
}) {
  // Ensure servers exist (sync if empty)
  await ensureServersExist()

  // Determine source filter: 'all', 'registry', or 'user'
  const sourceFilter: 'all' | 'registry' | 'user' = source === 'registry' || source === 'user' ? source : 'all'

  // Common query options
  const queryOptions = {
    search,
    category,
    page,
    sort,
    minRating,
    maxRating,
    dateFrom,
    dateTo,
    hasGithub,
    source: sourceFilter,
  }

  // Fetch servers and category counts together
  const [serverData, categoryCounts] = await Promise.all([
    queryServers({ ...queryOptions, limit: 20 }),
    getCategoryCounts(sourceFilter, { search, minRating, maxRating, dateFrom, dateTo, hasGithub }),
  ])

  return (
    <ServerList
      data={serverData}
      categoryCounts={categoryCounts}
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
  const hasGithub = params.hasGithub === 'true'
  const source = params.source

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          MCP Review
          </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Discover, rate, and review Model Context Protocol servers. <br /> Find the best MCP servers for your AI workflows.
          </p>
        </div>

      {/* Search */}
      <div className="mx-auto mb-8 max-w-xl">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Server List */}
      <div className="mb-12">
        <Suspense fallback={<ServerGridSkeleton />}>
          <ServerListWrapper 
            search={q} 
            category={category} 
            page={page} 
            sort={sort} 
            minRating={minRating}
            maxRating={maxRating}
            dateFrom={dateFrom}
            dateTo={dateTo}
            hasGithub={hasGithub}
            source={source}
          />
        </Suspense>
      </div>
    </div>
  )
}
