import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getAvatarColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RatingDisplay } from '@/components/rating/rating-display'
import { RatingForm } from '@/components/rating/rating-form'
import { ReviewCard } from '@/components/rating/review-card'

interface ServerPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ServerPageProps): Promise<Metadata> {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  
  const server = await prisma.server.findUnique({
    where: { id: decodedId },
    select: {
      name: true,
      description: true,
      organization: true,
    },
  })

  if (!server) {
    return {
      title: 'Server Not Found - MCP Review',
      description: 'The requested MCP server could not be found',
    }
  }

  return {
    title: `${server.name} - MCP Review`,
    description: server.description || `Rate and review ${server.name} MCP server by ${server.organization}`,
  }
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  
  const session = await auth()
  
  const server = await prisma.server.findUnique({
    where: { id: decodedId },
    include: {
      ratings: {
        where: {
          status: 'approved', // Only show approved reviews
        },
        include: {
          user: {
            select: { name: true, image: true },
          },
          reviewVotes: session?.user?.id
            ? {
                where: {
                  userId: session.user.id,
                },
                select: {
                  helpful: true,
                },
                take: 1,
              }
            : false,
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      },
    },
  })

  if (!server) {
    notFound()
  }

  // Get user's existing rating if logged in
  let userRating = null
  if (session?.user?.id) {
    userRating = await prisma.rating.findUnique({
      where: {
        serverId_userId: {
          serverId: server.id,
          userId: session.user.id,
        },
      },
    })
  }

  const avatarColor = getAvatarColor(server.name)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to servers
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <div
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor}`}
                >
                  <span className="text-3xl font-bold text-white">
                    {server.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-card-foreground">{server.name}</h1>
                      <p className="mt-1 text-muted-foreground">by {server.organization}</p>
                    </div>
                    <div className="flex gap-2">
                      {server.version && (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          v{server.version}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {server.repositoryUrl && (
                    <a
                      href={server.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      View Repository
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {server.description ? (
                <div className="text-card-foreground whitespace-pre-wrap break-words leading-relaxed text-base">
                  {server.description}
                </div>
              ) : (
                <p className="text-muted-foreground/70 italic">No description available</p>
              )}
            </CardContent>
          </Card>

          {/* Technical Details */}
          {(server.packages || server.remotes) && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {server.packages && Array.isArray(server.packages) && server.packages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Packages</h4>
                    <div className="space-y-2">
                      {(server.packages as Array<{ registryType?: string; identifier?: string }>).map((pkg, idx) => (
                        <div key={idx} className="rounded bg-muted p-3">
                          <code className="text-sm text-card-foreground">
                            {pkg.registryType}: {pkg.identifier}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {server.remotes && Array.isArray(server.remotes) && server.remotes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Remote Endpoints</h4>
                    <div className="space-y-2">
                      {(server.remotes as Array<{ type?: string; url?: string }>).map((remote, idx) => (
                        <div key={idx} className="rounded bg-muted p-3">
                          <span className="text-xs text-muted-foreground/70">{remote.type}</span>
                          <code className="block text-sm text-card-foreground break-all">{remote.url}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rating Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingDisplay
                trustworthiness={server.avgTrustworthiness}
                usefulness={server.avgUsefulness}
                totalRatings={server.totalRatings}
              />
            </CardContent>
          </Card>

          {/* Rating Form - only show if user hasn't rated yet or isn't logged in */}
          {!userRating && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">
                  Rate This Server
                </CardTitle>
              </CardHeader>
              <CardContent>
                {session?.user ? (
                  <RatingForm serverId={server.id} />
                ) : (
                  <div className="text-center">
                    <p className="mb-4 text-sm text-muted-foreground">
                      Sign in to rate this server
                    </p>
                    <Link href="/auth/signin">
                      <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                        Sign in
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {server.ratings.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {server.ratings.map((rating: (typeof server.ratings)[0]) => {
                    const userVote =
                      rating.reviewVotes && Array.isArray(rating.reviewVotes) && rating.reviewVotes.length > 0
                        ? { helpful: rating.reviewVotes[0].helpful }
                        : null

                    return (
                      <ReviewCard
                        key={rating.id}
                        review={{
                          id: rating.id,
                          trustworthiness: rating.trustworthiness,
                          usefulness: rating.usefulness,
                          text: rating.text,
                          status: rating.status,
                          helpfulCount: rating.helpfulCount,
                          notHelpfulCount: rating.notHelpfulCount,
                          createdAt: rating.createdAt,
                          updatedAt: rating.updatedAt,
                          userId: rating.userId,
                          user: {
                            name: rating.user.name,
                            image: rating.user.image,
                          },
                          userVote,
                        }}
                        currentUserId={session?.user?.id}
                        serverId={server.id}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

