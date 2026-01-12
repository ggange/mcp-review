import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { SearchBar } from '@/components/search-bar'
import { ServerGridSkeleton } from '@/components/server/server-card-skeleton'
import { ServerList } from '@/components/server/server-tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  queryServers, 
  getCategoryCounts, 
  ensureServersExist,
  getLatestUserServers,
  getTopRatedServers,
  type SortOption 
} from '@/lib/server-queries'
import { HeroServerCard } from '@/components/server/hero-server-card'
import { auth } from '@/lib/auth'

// Enable ISR with 60 second revalidation for better TTFB
export const revalidate = 60

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'Open Source MCP Server Directory - Discover, Rate, and Review',
  description: 'Open-source platform to discover, rate, and review Model Context Protocol servers. Community-driven ratings and reviews. Free, transparent, and MIT licensed. Contribute on GitHub!',
  openGraph: {
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'Open-source platform to discover, rate, and review MCP servers. Community-driven, free, and transparent. Built by developers for developers.',
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'Open-source platform to discover, rate, and review MCP servers. Community-driven, free, and transparent. ⭐ Star us on GitHub!',
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

// Hero server cards skeleton for streaming
function HeroCardsSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border/30">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Streamed component for latest user servers
async function LatestUserServers({ submitServerHref }: { submitServerHref: string }) {
  const latestUserServers = await getLatestUserServers(4)
  
  if (latestUserServers.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No community uploads yet
        </p>
        <Link href={submitServerHref} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
          Be the first to upload your server!
        </Link>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col divide-y divide-border/30">
      {latestUserServers.map((server) => (
        <HeroServerCard key={server.id} server={server} />
      ))}
    </div>
  )
}

// Streamed component for top rated servers
async function TopRatedServers() {
  const topRatedServers = await getTopRatedServers(4)
  
  if (topRatedServers.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground text-center">
        No rated servers yet
      </p>
    )
  }
  
  return (
    <div className="flex flex-col divide-y divide-border/30">
      {topRatedServers.map((server) => (
        <HeroServerCard key={server.id} server={server} />
      ))}
    </div>
  )
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

// Streamed submit button that depends on auth
async function SubmitServerButton() {
  const session = await auth()
  const submitServerHref = session?.user 
    ? '/dashboard?upload=true' 
    : '/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard?upload=true')
  
  return (
    <Link href={submitServerHref}>
      <Button size="lg" className="h-11 px-6 text-base font-semibold bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600 shadow-sm transition-all hover:scale-105">
        Submit a Server
      </Button>
    </Link>
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

  // Default href for non-auth contexts (will be replaced by streamed component)
  const defaultSubmitHref = '/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard?upload=true')

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MCP Review',
    description: 'Open-source platform to discover, rate, and review Model Context Protocol servers. Community-driven, free, and transparent.',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    maintainer: {
      '@type': 'Person',
      name: 'ggange',
      url: 'https://github.com/ggange',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <div className="container mx-auto px-4 py-8">
      {/* Hero Section - Static shell renders immediately, data streams in */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 pt-8 pb-12 lg:pt-12 lg:pb-16">
        {/* Left: Title, subtitle, badge, buttons */}
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="w-fit mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
            The Community Hub for MCP
          </Badge>
          <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Discover, Rate, and Review{' '}
            <span className="text-violet-600 dark:text-violet-400">MCP Servers</span>
          </h1>
          <p className="mb-8 max-w-lg text-lg text-muted-foreground leading-relaxed">
            Find the best Model Context Protocol servers for your AI workflows.
            Join the community to share and review the best products.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-11 px-6 text-base font-medium"
              asChild
            >
              <Link href="#servers">
                Browse Collection
              </Link>
            </Button>
            <div className="flex flex-col gap-1.5">
              <Suspense fallback={
                <Link href={defaultSubmitHref}>
                  <Button size="lg" className="h-11 px-6 text-base font-semibold bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600 shadow-sm transition-all hover:scale-105">
                    Submit a Server
                  </Button>
                </Link>
              }>
                <SubmitServerButton />
              </Suspense>
              <span className="inline-flex items-center gap-0.5 text-sm font-medium text-violet-600 dark:text-violet-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Under 2 min with GitHub
              </span>
            </div>
          </div>
        </div>

        {/* Right: Server columns - Stream in after initial paint */}
        <div className="grid grid-cols-2 gap-4">
          {/* Fresh from community */}
          <div className="flex flex-col">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fresh from our community
            </h3>
            <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-2">
                <Suspense fallback={<HeroCardsSkeleton />}>
                  <LatestUserServers submitServerHref={defaultSubmitHref} />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Top Picks */}
          <div className="flex flex-col">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Picks
            </h3>
            <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-2">
                <Suspense fallback={<HeroCardsSkeleton />}>
                  <TopRatedServers />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
