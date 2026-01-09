import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UploadServerDialog } from '@/components/server/upload-server-dialog'
import { ServerCardWithActions } from '@/components/server/server-card-with-actions'

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

  // Fetch user data including createdAt
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      createdAt: true,
    },
  })

  // Fetch GitHub account to get access token and providerAccountId for profile link
  const githubAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: 'github',
    },
    select: {
      providerAccountId: true,
      access_token: true,
    },
  })

  const ratings = await prisma.rating.findMany({
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
  })

  // Fetch user's own servers
  const userServersRaw = await prisma.server.findMany({
    where: {
      userId: session.user.id,
      source: 'user',
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  
  // Cast source field to the expected union type
  const userServers = userServersRaw.map(server => ({
    ...server,
    source: server.source as 'registry' | 'user',
    tools: server.tools as Array<{ name: string; description: string }> | null,
  }))

  // Construct GitHub profile URL
  // Try to fetch username from GitHub API using access token
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

  // Fallback: if we couldn't get username from API, try extracting from avatar URL
  if (!githubProfileUrl && session.user.image) {
    const avatarMatch = session.user.image.match(/avatars\.githubusercontent\.com\/u\/(\d+)/)
    if (avatarMatch && githubAccount) {
      // We have GitHub account but couldn't get username, show GitHub icon without specific link
      githubProfileUrl = null // Will show icon but link to github.com
    }
  }

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
                  {session.user.name?.charAt(0).toUpperCase() || githubUsername?.charAt(0).toUpperCase() || 'U'}
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
