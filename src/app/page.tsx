import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerList } from '@/components/server/server-tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  queryServers, 
  getCategoryCounts, 
  ensureServersExist,
  type SortOption 
} from '@/lib/server-queries'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'Discover, Rate, and Review Model Context Protocol Servers',
  description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows with community-driven ratings and reviews. Upload your own servers and get feedback from the community.',
  openGraph: {
    title: 'MCP Review - Discover, Rate, and Review Model Context Protocol Servers',
    description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows with community-driven ratings and reviews.',
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    title: 'MCP Review - Discover, Rate, and Review Model Context Protocol Servers',
    description: 'Discover, rate, and review Model Context Protocol servers. Find the best MCP servers for your AI workflows.',
  },
  alternates: {
    canonical: baseUrl,
  },
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
    queryServers({ ...queryOptions, limit: 12 }),
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

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MCP Review',
    description: 'Discover, rate, and review Model Context Protocol servers',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-8 pb-12 text-center lg:pt-12 lg:pb-20">
        <Badge variant="secondary" className="mb-8 px-4 py-1.5 text-sm font-medium rounded-full">
          The Community Hub for MCP
        </Badge>
        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
          Discover, Rate, and Review <br className="hidden sm:inline" />
          <span className="text-foreground">MCP Servers</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground leading-relaxed">
          Find the best Model Context Protocol servers for your AI workflows.
          <br className="hidden sm:inline" /> Join the community to share and review the best products.
        </p>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signin" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600 shadow-sm transition-all hover:scale-105">
              Submit a Server
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto h-12 px-8 text-base font-medium"
            asChild
          >
            <Link href="#servers">
              Browse Collection
            </Link>
          </Button>
        </div>
      </section>

      {/* Top Picks of the Week */}
      <Card className="mb-12">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-left text-base font-semibold text-foreground">
              Top Picks of the Week
            </h2>
            <Badge variant="outline" className="text-xs">
              Coming soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mx-auto mb-8 max-w-xl">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Server List */}
      <div id="servers" className="mb-12 scroll-mt-24">
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
    </>
  )
}
