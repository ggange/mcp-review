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
import { JsonLdScript } from '@/components/json-ld-script'
import { 
  queryServers, 
  getCategoryCounts, 
  ensureServersExist,
  getHotServers,
  getTopRatedServers,
  type SortOption 
} from '@/lib/server-queries'
import { HeroServerCard } from '@/components/server/hero-server-card'
import { auth } from '@/lib/auth'
import type { ServerWithRatings } from '@/types'

// Enable ISR with 60 second revalidation for better TTFB
export const revalidate = 60

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'Open Source MCP Server Directory - Discover, Rate & Review Model Context Protocol Servers',
  description: 'Find the best MCP servers for Claude, Cursor, and AI workflows. Community-driven ratings and reviews from developers. Browse 100+ Model Context Protocol servers. Free to use, open-source, MIT licensed.',
  openGraph: {
    title: 'MCP Review - Open Source MCP Server Directory & Community Reviews',
    description: 'Find the best MCP servers for your AI workflows. Community-driven ratings and reviews from developers. Free to use, open-source, and transparent.',
    url: baseUrl,
    type: 'website',
  },
  twitter: {
    title: 'MCP Review - Open Source MCP Server Directory',
    description: 'Find the best MCP servers for Claude & AI workflows. Community-driven ratings & reviews. Free to use & open-source. ⭐ Star us on GitHub!',
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

// Generate dummy servers for development testing
function generateDummyServers(count: number, type: 'hot' | 'top'): ServerWithRatings[] {
  const serverNames = [
    'Datadog', 'Unity', 'Firecrawl', 'Serena', 'PostgreSQL', 'MongoDB', 
    'Redis', 'Elasticsearch', 'GitHub', 'Slack', 'Discord', 'Twitter',
    'OpenAI', 'Anthropic', 'Google', 'AWS', 'Azure', 'GCP', 'Vercel',
    'Netlify', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins'
  ]
  
  const organizations = [
    'Datadog-MCP', 'CoplayDev', 'firecrawl', 'oraios', 'postgres', 'mongodb',
    'redis-labs', 'elastic', 'github', 'slack', 'discord', 'twitter',
    'openai', 'anthropic', 'google', 'aws', 'microsoft', 'google-cloud',
    'vercel', 'netlify', 'docker', 'kubernetes', 'hashicorp', 'redhat', 'jenkins'
  ]

  // Generate servers: user servers first, then official servers
  // Both sorted by date (newest first within each category)
  const baseDate = new Date()
  const servers: ServerWithRatings[] = []
  
  // Generate user servers (first half, newest first)
  // Use deterministic values instead of Math.random() to prevent hydration mismatches
  const userCount = Math.ceil(count / 2)
  for (let i = 0; i < userCount; i++) {
    const nameIndex = i % serverNames.length
    const orgIndex = i % organizations.length
    const hasRatings = type === 'top' && i < 15
    // Use deterministic pseudo-random values based on index to prevent hydration mismatch
    const pseudoRandom1 = ((i * 17 + 23) % 100) / 100 // Deterministic "random" between 0-1
    const pseudoRandom2 = ((i * 31 + 47) % 100) / 100
    const avgRating = hasRatings ? 3.5 + (pseudoRandom1 * 1.5) : 0
    const totalRatings = hasRatings ? Math.floor(pseudoRandom2 * 50) + 5 : 0
    
    servers.push({
      id: `dummy-${type}-user-${i}`,
      name: serverNames[nameIndex] + (i >= serverNames.length ? ` ${Math.floor(i / serverNames.length) + 1}` : ''),
      organization: organizations[orgIndex],
      description: `Dummy user server ${i + 1} for testing`,
      version: '1.0.0',
      repositoryUrl: `https://github.com/${organizations[orgIndex]}/${serverNames[nameIndex].toLowerCase()}`,
      packages: null,
      remotes: null,
      avgRating: hasRatings ? avgRating : 0,
      totalRatings,
      category: ['database', 'search', 'code', 'web', 'ai', 'data', 'tools', 'other'][i % 8] as string,
      createdAt: new Date(baseDate.getTime() - i * 60000), // Newest first (decreasing time)
      syncedAt: new Date(baseDate.getTime() - i * 60000),
      source: 'user',
      iconUrl: null,
      tools: null,
      usageTips: null,
      userId: null,
      authorUsername: organizations[orgIndex],
      hasManyTools: false,
      completeToolsUrl: null,
    })
  }
  
  // Generate official servers (second half, newest first)
  const officialCount = count - userCount
  for (let i = 0; i < officialCount; i++) {
    const nameIndex = (userCount + i) % serverNames.length
    const orgIndex = (userCount + i) % organizations.length
    const hasRatings = type === 'top' && (userCount + i) < 15
    // Use deterministic pseudo-random values based on index to prevent hydration mismatch
    const index = userCount + i
    const pseudoRandom1 = ((index * 17 + 23) % 100) / 100 // Deterministic "random" between 0-1
    const pseudoRandom2 = ((index * 31 + 47) % 100) / 100
    const avgRating = hasRatings ? 3.5 + (pseudoRandom1 * 1.5) : 0
    const totalRatings = hasRatings ? Math.floor(pseudoRandom2 * 50) + 5 : 0
    
    servers.push({
      id: `dummy-${type}-official-${i}`,
      name: serverNames[nameIndex] + ((userCount + i) >= serverNames.length ? ` ${Math.floor((userCount + i) / serverNames.length) + 1}` : ''),
      organization: organizations[orgIndex],
      description: `Dummy official server ${i + 1} for testing`,
      version: '1.0.0',
      repositoryUrl: `https://github.com/${organizations[orgIndex]}/${serverNames[nameIndex].toLowerCase()}`,
      packages: null,
      remotes: null,
      avgRating: hasRatings ? avgRating : 0,
      totalRatings,
      category: ['database', 'search', 'code', 'web', 'ai', 'data', 'tools', 'other'][(userCount + i) % 8] as string,
      createdAt: new Date(baseDate.getTime() - (userCount + i) * 60000), // Newest first (decreasing time)
      syncedAt: new Date(baseDate.getTime() - (userCount + i) * 60000),
      source: 'official',
      iconUrl: null,
      tools: null,
      usageTips: null,
      userId: null,
      authorUsername: null,
      hasManyTools: false,
      completeToolsUrl: null,
    })
  }
  
  return servers
}

// Streamed component for hot servers (official + user, most recent first)
async function HotServers({ submitServerHref }: { submitServerHref: string }) {
  // In development, use dummy data to test column filling
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hotServers = isDevelopment 
    ? generateDummyServers(8, 'hot')
    : await getHotServers(8)
  
  if (hotServers.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No servers yet
        </p>
        <Link href={submitServerHref} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
          Be the first to upload your server!
        </Link>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col divide-y divide-border/30">
      {hotServers.map((server) => (
        <HeroServerCard key={server.id} server={server} />
      ))}
    </div>
  )
}

// Streamed component for top rated servers
async function TopRatedServers() {
  // In development, use dummy data to test column filling
  const isDevelopment = process.env.NODE_ENV === 'development'
  const topRatedServers = isDevelopment
    ? generateDummyServers(8, 'top')
    : await getTopRatedServers(8)
  
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

  // Determine source filter: 'all', 'registry', 'user', or 'official'
  const sourceFilter: 'all' | 'registry' | 'user' | 'official' = 
    source === 'registry' || source === 'user' || source === 'official' ? source : 'all'

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
    alternateName: ['MCP Server Directory', 'Model Context Protocol Review'],
    description: 'The open-source directory for Model Context Protocol (MCP) servers. Community-driven ratings and reviews for AI developers.',
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
    sourceOrganization: {
      '@type': 'Organization',
      name: 'MCP Review Community',
      url: 'https://github.com/ggange/mcp-review',
    },
  }

  // FAQ Schema for common questions about MCP
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is MCP (Model Context Protocol)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Model Context Protocol (MCP) is an open standard developed by Anthropic that enables AI assistants like Claude to connect with external data sources and tools. MCP servers provide capabilities that extend what AI models can do.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is MCP Review?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MCP Review is an open-source, community-driven platform where developers can discover, rate, and review Model Context Protocol servers. It helps developers find trusted MCP servers for their AI workflows.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is MCP Review free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! MCP Review is completely free and open-source under the MIT license. You can browse servers, leave reviews, and even contribute to the codebase on GitHub.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I submit my MCP server?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sign in with your GitHub account and click "Submit a Server". You can upload your MCP server in under 2 minutes. Add a description, tools, and usage tips to help other developers.',
        },
      },
    ],
  }

  // ItemList Schema for server collection
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'MCP Server Directory',
    description: 'Browse community-rated Model Context Protocol servers for AI development',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: '100+',
  }

  return (
    <>
      <JsonLdScript data={websiteSchema} id="website-schema" />
      <JsonLdScript data={faqSchema} id="faq-schema" />
      <JsonLdScript data={itemListSchema} id="itemlist-schema" />
      <div className="container mx-auto px-4 py-8">
      {/* Hero Section - Static shell renders immediately, data streams in */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 pt-8 pb-12 lg:pt-12 lg:pb-16">
        {/* Left: Title, subtitle, badge, buttons */}
        <div className="flex flex-col justify-center text-center lg:text-left">
          <Badge variant="secondary" className="w-fit mx-auto lg:mx-0 mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
            Open Source MCP Community Hub
          </Badge>
          <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Discover, Rate & Review{' '}
            <span className="text-violet-600 dark:text-violet-400">MCP Servers</span>
          </h1>
          <p className="mb-8 max-w-lg mx-auto lg:mx-0 text-lg text-muted-foreground leading-relaxed">
            The <strong>open-source directory</strong> for <abbr title="Model Context Protocol">MCP</abbr> servers. 
            Find trusted tools for <strong>Claude, Cursor</strong>, and AI workflows. 
            Community-driven ratings by developers, for developers.
          </p>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 justify-center lg:justify-start">
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
            <div className="flex flex-col gap-1.5 items-center sm:items-start">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hot servers */}
          <div className="flex flex-col">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hot
            </h3>
            <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-2">
                <Suspense fallback={<HeroCardsSkeleton />}>
                  <HotServers submitServerHref={defaultSubmitHref} />
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
