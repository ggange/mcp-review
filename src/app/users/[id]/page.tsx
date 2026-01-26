import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarColor } from '@/lib/utils'
import { ServerCard } from '@/components/server/server-card'
import type { ServerWithRatings } from '@/types'
import { getCache, setCache, getCacheKey } from '@/lib/cache'
import type { Prisma } from '@prisma/client'
import { JsonLdScript } from '@/components/json-ld-script'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

interface UserProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { id } = await params
  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      image: true,
    },
  })

  if (!user) {
    return {
      title: 'User Not Found - MCP Review',
      description: 'The requested user profile could not be found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const userName = user.name || 'Anonymous User'
  const userUrl = `${baseUrl}/users/${id}`

  return {
    title: `${userName} - MCP Review`,
    description: `View ${userName}'s profile and ratings on MCP Review. See their reviews and ratings of Model Context Protocol servers.`,
    openGraph: {
      title: `${userName} - MCP Review`,
      description: `View ${userName}'s profile and ratings on MCP Review.`,
      url: userUrl,
      type: 'profile',
      images: user.image ? [
        {
          url: user.image,
          width: 400,
          height: 400,
          alt: `${userName}'s profile picture`,
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${userName} - MCP Review`,
      description: `View ${userName}'s profile and ratings on MCP Review.`,
      images: user.image ? [user.image] : undefined,
    },
    alternates: {
      canonical: userUrl,
    },
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { id } = await params

  // Try to get cached user data
  const cacheKey = getCacheKey('user', id)
  let user = await getCache<{
    id: string
    name: string | null
    image: string | null
    createdAt: Date
  }>(cacheKey)

  if (!user) {
    // Fetch user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
      },
    })

    if (!dbUser) {
      notFound()
    }

    user = dbUser
    // Cache user data for 1 hour
    await setCache(cacheKey, user, 3600)
  }

  // Fetch GitHub account to get providerAccountId for profile link
  const githubAccountCacheKey = getCacheKey('user', id, 'github')
  let githubAccount = await getCache<{
    providerAccountId: string
    access_token: string | null
  }>(githubAccountCacheKey)

  if (!githubAccount) {
    githubAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'github',
      },
      select: {
        providerAccountId: true,
        access_token: true,
      },
    })
    if (githubAccount) {
      // Cache GitHub account for 1 hour
      await setCache(githubAccountCacheKey, githubAccount, 3600)
    }
  }

  // Try to get GitHub username
  let githubProfileUrl: string | null = null
  let githubUsername: string | null = null

  if (githubAccount?.access_token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubAccount.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      })

      if (response.ok) {
        const githubUser = await response.json()
        githubUsername = githubUser.login
        githubProfileUrl = `https://github.com/${githubUsername}`
      }
    } catch (error) {
      // Silently fail - we'll just not show the profile link
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to fetch GitHub username:', error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  // Try to get cached data, otherwise fetch from database
  const ratingsCacheKey = getCacheKey('user', id, 'ratings')
  const serversCacheKey = getCacheKey('user', id, 'servers')
  
  type RatingType = Array<{
    id: string
    rating: number
    text: string | null
    updatedAt: Date
    server: {
      id: string
      name: string
      organization: string | null
    }
  }>
  
  type ServerType = Awaited<ReturnType<typeof prisma.server.findMany<{
    where: { userId: string; source: 'user' }
    orderBy: { createdAt: 'desc' }
    take: number
  }>>>

  const cachedRatings = await getCache<RatingType>(ratingsCacheKey)
  const cachedServers = await getCache<ServerType>(serversCacheKey)
  
  let ratings: RatingType | null = cachedRatings ? (cachedRatings as unknown as RatingType) : null
  let uploadedServersRaw: ServerType | null = cachedServers

  if (!ratings || !uploadedServersRaw) {
    // Parallelize database queries for better performance
    const [fetchedRatings, fetchedServers] = await Promise.all([
      // Fetch user's public ratings
      (prisma.rating.findMany({
        where: {
          userId: user.id,
          status: 'approved',
        },
        select: {
          id: true,
          rating: true,
          text: true,
          updatedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              organization: true,
            },
          },
        } satisfies Prisma.RatingFindManyArgs['select'],
        orderBy: { updatedAt: 'desc' },
      }) as unknown) as Promise<Array<{
        id: string
        rating: number
        text: string | null
        updatedAt: Date
        server: {
          id: string
          name: string
          organization: string | null
        }
      }>>,
      // Fetch user's uploaded servers
      prisma.server.findMany({
        where: {
          userId: user.id,
          source: 'user',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    ratings = fetchedRatings as RatingType
    uploadedServersRaw = fetchedServers

    // Cache for 5 minutes (user data changes more frequently than public data)
    await Promise.all([
      setCache(ratingsCacheKey, ratings, 300),
      setCache(serversCacheKey, uploadedServersRaw, 300),
    ])
  }

  // Cast source field to the expected union type
  const uploadedServers: ServerWithRatings[] = (uploadedServersRaw ?? []).map((server) => {
    const serverWithRating = server as typeof server & { avgRating: number; totalRatings: number }
    const mapped: ServerWithRatings = {
      id: server.id,
      name: server.name,
      organization: server.organization,
      description: server.description,
      version: server.version,
      repositoryUrl: server.repositoryUrl,
      packages: server.packages,
      remotes: server.remotes,
      avgRating: serverWithRating.avgRating,
      totalRatings: serverWithRating.totalRatings,
      category: server.category,
      createdAt: server.createdAt,
      syncedAt: server.syncedAt,
      source: server.source as 'registry' | 'user' | 'official',
      iconUrl: server.iconUrl,
      tools: server.tools as Array<{ name: string; description: string }> | null,
      usageTips: server.usageTips,
      userId: server.userId,
      authorUsername: server.authorUsername,
      hasManyTools: server.hasManyTools,
      completeToolsUrl: server.completeToolsUrl,
    }
    return mapped
  })

  // Format member since date
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  const avatarColor = getAvatarColor(user.name || 'U')

  // Build Person schema for structured data
  const userUrl = `${baseUrl}/users/${id}`
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.name || 'Anonymous User',
    url: userUrl,
    image: user.image || undefined,
    memberOf: {
      '@type': 'Organization',
      name: 'MCP Review Community',
      url: baseUrl,
    },
    sameAs: githubProfileUrl ? [githubProfileUrl] : undefined,
  }

  // Remove undefined fields
  if (!personSchema.image) {
    delete personSchema.image
  }
  if (!personSchema.sameAs || personSchema.sameAs.length === 0) {
    delete personSchema.sameAs
  }

  return (
    <>
      <JsonLdScript data={personSchema} id="person-schema" />
      <div className="container mx-auto px-4 py-8">
      {/* Profile Header Section */}
      <Card className="mb-8 border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || undefined} alt={user.name || ''} />
                <AvatarFallback className={`text-lg ${avatarColor}`}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-card-foreground">
                    {user.name || 'Anonymous User'}
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Member since: </span>
                    <span className="font-medium text-card-foreground">{memberSince}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total ratings: </span>
                    <span className="font-medium text-card-foreground">{ratings?.length ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uploaded servers: </span>
                    <span className="font-medium text-card-foreground">{uploadedServers.length}</span>
                  </div>
                </div>
              </div>
            </div>
            {githubAccount && githubProfileUrl && (
              <div className="flex-shrink-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <a
                    href={githubProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    View Profile on GitHub
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Servers Section */}
      {uploadedServers.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-foreground">Uploaded Servers</h1>
            <p className="mt-2 text-muted-foreground">
              Servers uploaded by {user.name || 'this user'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uploadedServers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        </div>
      )}

      {/* Ratings Section */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground">Ratings by {user.name || 'this user'}</h1>
          <p className="mt-2 text-muted-foreground">
            All public ratings and reviews
          </p>
        </div>

      {!ratings || ratings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <div className="mb-4 inline-block rounded-full bg-muted p-4">
              <svg
                className="h-8 w-8 text-muted-foreground/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-card-foreground">No ratings yet</h3>
            <p className="mt-1 text-muted-foreground/70">
              This user hasn&apos;t left any public ratings
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ratings.map((rating: typeof ratings[0]) => (
            <Link key={rating.id} href={`/servers/${encodeURIComponent(rating.server.id)}`}>
              <Card className="h-full cursor-pointer border-border bg-card transition-all hover:border-border hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-card-foreground">
                    {rating.server.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    by {rating.server.organization}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <span className="font-medium text-card-foreground">
                        {rating.rating}/5
                      </span>
                    </div>
                  </div>
                  {rating.text && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      &ldquo;{rating.text}&rdquo;
                    </p>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground/70">
                    Updated {rating.updatedAt.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
    </>
  )
}

