import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UploadServerDialog } from '@/components/server/upload-server-dialog'
import { ServerCardWithActions } from '@/components/server/server-card-with-actions'
import { UploadOfficialServerDialog } from '@/components/server/upload-official-server-dialog'
import { GitHubProfileLink } from '@/components/github-profile-link'
import { getCache, setCache, getCacheKey } from '@/lib/cache'
import type { ServerWithRatings } from '@/types'

export const metadata: Metadata = {
  title: 'Dashboard - MCP Review',
  description: 'Manage your MCP servers and ratings',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Try to get cached dashboard data
  const dashboardCacheKey = getCacheKey('dashboard', session.user.id)
  const cachedData = await getCache<{
    user: { createdAt: Date; role: string } | null
    githubAccount: { providerAccountId: string; access_token: string | null } | null
    ratings: Array<{
      id: string
      trustworthiness: number
      usefulness: number
      text: string | null
      updatedAt: Date
      server: { id: string; name: string; organization: string | null }
    }>
    userServersRaw: Array<{
      id: string
      name: string
      organization: string | null
      source: string
      tools: unknown
      [key: string]: unknown
    }>
  }>(dashboardCacheKey)

  let user: { createdAt: Date; role: string } | null
  let githubAccount: { providerAccountId: string; access_token: string | null } | null
  let ratings: Array<{
    id: string
    trustworthiness: number
    usefulness: number
    text: string | null
    updatedAt: Date
    server: { id: string; name: string; organization: string | null }
  }>
  let userServersRaw: Array<{
    id: string
    name: string
    organization: string | null
    source: string
    tools: unknown
    [key: string]: unknown
  }>

  if (!cachedData) {
    // Parallelize all database queries for better performance
    const [fetchedUser, fetchedGithubAccount, fetchedRatings, fetchedUserServersRaw] = await Promise.all([
      // Fetch user data including createdAt and role
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          createdAt: true,
          role: true,
        },
      }),
      // Fetch GitHub account to get access token and providerAccountId for profile link
      prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: 'github',
        },
        select: {
          providerAccountId: true,
          access_token: true,
        },
      }),
      // Fetch ratings
      prisma.rating.findMany({
        where: { userId: session.user.id },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              organization: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Fetch user's own servers
      prisma.server.findMany({
        where: {
          userId: session.user.id,
          source: 'user',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    user = fetchedUser
    githubAccount = fetchedGithubAccount
    ratings = fetchedRatings
    userServersRaw = fetchedUserServersRaw as typeof userServersRaw

    // Cache dashboard data for 2 minutes (user-specific, changes frequently)
    await setCache(dashboardCacheKey, {
      user,
      githubAccount,
      ratings,
      userServersRaw,
    }, 120)
  } else {
    user = cachedData.user
    githubAccount = cachedData.githubAccount
    ratings = cachedData.ratings
    userServersRaw = cachedData.userServersRaw
  }

  // Check if user is admin
  const userIsAdmin = user?.role === 'admin'

  // Cast source field to the expected union type
  const userServers: ServerWithRatings[] = userServersRaw.map((server) => {
    const mapped: ServerWithRatings = {
      id: String(server.id),
      name: String(server.name),
      organization: server.organization as string | null,
      description: server.description as string | null,
      version: server.version as string | null,
      repositoryUrl: server.repositoryUrl as string | null,
      packages: server.packages,
      remotes: server.remotes,
      avgTrustworthiness: Number(server.avgTrustworthiness),
      avgUsefulness: Number(server.avgUsefulness),
      totalRatings: Number(server.totalRatings),
      category: server.category as string | null,
      createdAt: server.createdAt instanceof Date ? server.createdAt : new Date(server.createdAt as string),
      syncedAt: server.syncedAt instanceof Date ? server.syncedAt : new Date(server.syncedAt as string),
      source: server.source as 'registry' | 'user' | 'official',
      iconUrl: server.iconUrl as string | null,
      tools: server.tools as Array<{ name: string; description: string }> | null,
      usageTips: server.usageTips as string | null,
      userId: server.userId as string | null,
      authorUsername: server.authorUsername as string | null,
      hasManyTools: Boolean(server.hasManyTools),
      completeToolsUrl: server.completeToolsUrl as string | null,
    }
    return mapped
  })

  // Fetch official servers (admin only) - cache separately
  let officialServersRaw: typeof userServersRaw = []
  if (userIsAdmin) {
    const officialServersCacheKey = getCacheKey('dashboard', 'official')
    const cachedOfficialServers = await getCache<typeof userServersRaw>(officialServersCacheKey)
    
    if (cachedOfficialServers) {
      officialServersRaw = cachedOfficialServers
    } else {
      officialServersRaw = await prisma.server.findMany({
        where: {
          source: 'official',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      // Cache official servers for 5 minutes
      await setCache(officialServersCacheKey, officialServersRaw, 300)
    }
  }
  
  // Cast source field to the expected union type
  const officialServers: ServerWithRatings[] = officialServersRaw.map((server) => {
    const mapped: ServerWithRatings = {
      id: String(server.id),
      name: String(server.name),
      organization: server.organization as string | null,
      description: server.description as string | null,
      version: server.version as string | null,
      repositoryUrl: server.repositoryUrl as string | null,
      packages: server.packages,
      remotes: server.remotes,
      avgTrustworthiness: Number(server.avgTrustworthiness),
      avgUsefulness: Number(server.avgUsefulness),
      totalRatings: Number(server.totalRatings),
      category: server.category as string | null,
      createdAt: server.createdAt instanceof Date ? server.createdAt : new Date(server.createdAt as string),
      syncedAt: server.syncedAt instanceof Date ? server.syncedAt : new Date(server.syncedAt as string),
      source: server.source as 'registry' | 'user' | 'official',
      iconUrl: server.iconUrl as string | null,
      tools: server.tools as Array<{ name: string; description: string }> | null,
      usageTips: server.usageTips as string | null,
      userId: server.userId as string | null,
      authorUsername: server.authorUsername as string | null,
      hasManyTools: Boolean(server.hasManyTools),
      completeToolsUrl: server.completeToolsUrl as string | null,
    }
    return mapped
  })

  // GitHub profile URL will be fetched client-side to avoid blocking page render

  // Format member since date
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header Section */}
      <Card className="mb-8 border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
                <AvatarFallback className="bg-muted text-lg text-muted-foreground">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-card-foreground">
                    {session.user.name || 'User'}
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-6 text-sm">
                  {memberSince && (
                    <div>
                      <span className="text-muted-foreground">Member since: </span>
                      <span className="font-medium text-card-foreground">{memberSince}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Total ratings: </span>
                    <span className="font-medium text-card-foreground">{ratings.length}</span>
                  </div>
                </div>
              </div>
            </div>
            <GitHubProfileLink
              hasGitHubAccount={!!githubAccount}
              accessToken={githubAccount?.access_token || null}
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin: Official Servers Section */}
      {userIsAdmin && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Official Servers</h1>
            </div>
            <UploadOfficialServerDialog />
          </div>

          {officialServers.length === 0 ? (
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
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground">No official servers yet</h3>
                <p className="mt-1 text-muted-foreground/70">
                  Upload your first official server to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {officialServers.map((server) => (
                <ServerCardWithActions key={server.id} server={server} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Servers Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Servers</h1>
          </div>
          <UploadServerDialog />
        </div>

        {userServers.length === 0 ? (
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
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-card-foreground">No servers yet</h3>
              <p className="mt-1 text-muted-foreground/70">
                Upload your first server to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userServers.map((server) => (
              <ServerCardWithActions key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>

      {/* My Ratings Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Ratings</h1>
          </div>
        </div>

        {ratings.length === 0 ? (
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
                Start by exploring servers and leaving your first rating
              </p>
              <Link
                href="/"
                className="mt-4 inline-block text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Browse servers →
              </Link>
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
                        <span className="text-muted-foreground">Trustworthiness</span>
                        <span className="font-medium text-card-foreground">
                          {rating.trustworthiness}/5
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Usefulness</span>
                        <span className="font-medium text-card-foreground">
                          {rating.usefulness}/5
                        </span>
                      </div>
                    </div>
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
  )
}
