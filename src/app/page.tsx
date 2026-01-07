import { Suspense } from 'react'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerTabs } from '@/components/server/server-tabs'
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
  }>
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
  // Ensure servers exist (sync if empty)
  await ensureServersExist()

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
  }

  // Fetch registry and user servers in parallel using shared query logic
  const [registryData, userData, registryCounts, userCounts] = await Promise.all([
    queryServers({ ...queryOptions, source: 'registry', limit: 12 }),
    queryServers({ ...queryOptions, source: 'user', limit: 20 }),
    getCategoryCounts('registry', { search, minRating, maxRating, dateFrom, dateTo }),
    getCategoryCounts('user', { search, minRating, maxRating, dateFrom, dateTo }),
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
          Discover, rate, and review Model Context Protocol servers. <br /> Find the best MCP servers for your AI workflows.
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
