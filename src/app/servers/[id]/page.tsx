import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { RatingDisplay } from '@/components/rating/rating-display'
import { ServerIcon } from '@/components/server/server-icon'
import { JsonLdScript } from '@/components/json-ld-script'
import { BadgeEmbed } from '@/components/server/badge-embed'
import {
  ServerViewerProvider,
  ViewerRatingForm,
  ViewerReviews,
  ViewerServerActions,
} from '@/components/server/server-viewer'
import { getApprovedReviews, getServerDetail } from '@/lib/server-queries'

interface ServerPageProps {
  params: Promise<{ id: string }>
}

// The page is identical for every visitor (viewer-specific parts load on the
// client), so it is cached as ISR. Data changes call invalidateServerPage(),
// which revalidates it immediately; this window is only a fallback.
export const revalidate = 600

// No pages are prebuilt; each server page is generated on first request
export function generateStaticParams() {
  return []
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

// Dedupe between generateMetadata and the page (backed by the Redis cache)
const getServer = cache(getServerDetail)
const getReviews = cache(getApprovedReviews)

export async function generateMetadata({ params }: ServerPageProps): Promise<Metadata> {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  
  const server = await getServer(decodedId)

  if (!server) {
    return {
      title: 'Server Not Found - MCP Review',
      description: 'The requested MCP server could not be found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const serverUrl = `${baseUrl}/servers/${encodeURIComponent(decodedId)}`
  const avgRating = server.totalRatings > 0 && server.avgRating != null ? Number(server.avgRating).toFixed(1) : null
  const ratingText = avgRating ? `Rated ${avgRating}/5 by ${server.totalRatings} ${server.totalRatings === 1 ? 'developer' : 'developers'}.` : 'Be the first to review!'
  const description = server.description 
    ? `${server.description.slice(0, 120)}${server.description.length > 120 ? '...' : ''} ${ratingText}`
    : `${server.name} MCP server by ${server.organization}. Community ratings and reviews for this Model Context Protocol server. ${ratingText}`

  // Dynamic OG image URL
  const ogImageUrl = `${baseUrl}/og?type=server&serverId=${encodeURIComponent(decodedId)}`
  const publishedTime = server.createdAt ? new Date(server.createdAt).toISOString() : undefined
  const modifiedTime = server.syncedAt ? new Date(server.syncedAt).toISOString() : publishedTime

  return {
    title: `${server.name} MCP Server - Reviews & Ratings`,
    description,
    keywords: [
      server.name,
      'MCP server',
      'Model Context Protocol',
      server.organization || '',
      'MCP reviews',
      'AI tools',
      'developer tools',
    ].filter(Boolean),
    openGraph: {
      title: `${server.name} - MCP Server Reviews & Ratings`,
      description,
      url: serverUrl,
      type: 'website',
      siteName: 'MCP Review',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${server.name} - MCP Server Reviews & Ratings`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${server.name} - MCP Server Reviews`,
      description,
      creator: '@ggange',
      site: '@ggange',
      images: [ogImageUrl],
    },
    alternates: {
      canonical: serverUrl,
    },
    other: {
      ...(publishedTime && { 'article:published_time': publishedTime }),
      ...(modifiedTime && { 'article:modified_time': modifiedTime }),
    },
  }
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  
  const server = await getServer(decodedId)

  if (!server) {
    notFound()
  }

  // After the server lookup, so unknown IDs stop at the (negatively cached) miss
  const reviewList = await getReviews(decodedId)

  const avgRating = server.totalRatings > 0 && server.avgRating != null ? server.avgRating : null

  // Review schema uses the 5 most recent of the reviews already loaded for the page
  const reviews = reviewList.slice(0, 5)

  // Build JSON-LD structured data
  const serverUrl = `${baseUrl}/servers/${encodeURIComponent(decodedId)}`
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: server.name,
    description: server.description || `MCP server by ${server.organization}`,
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'Model Context Protocol Server',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: server.totalRatings > 0 && avgRating != null ? {
      '@type': 'AggregateRating',
      ratingValue: Number(avgRating).toFixed(1),
      ratingCount: server.totalRatings,
      bestRating: '5',
      worstRating: '1',
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: server.organization || 'Unknown',
    },
    url: serverUrl,
    image: server.iconUrl || undefined,
    softwareVersion: server.version || undefined,
    isAccessibleForFree: true,
  }

  // BreadcrumbList for navigation
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'MCP Servers',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: server.name,
        item: serverUrl,
      },
    ],
  }

  // Review schema for individual reviews
  const reviewSchemas = reviews.map((review) => ({
    '@type': 'Review',
    '@id': `${serverUrl}#review-${review.id}`,
    author: {
      '@type': 'Person',
      name: review.user.name || 'Anonymous',
    },
    datePublished: review.createdAt,
    reviewBody: review.text || undefined,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: '5',
      worstRating: '1',
    },
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: server.name,
      url: serverUrl,
    },
  })).filter((review) => {
    // Remove reviews without text or with invalid data
    return review.reviewBody || review.reviewRating
  })

  // Remove undefined fields from productSchema
  if (!productSchema.aggregateRating) {
    delete productSchema.aggregateRating
  }
  if (!productSchema.image) {
    delete productSchema.image
  }
  if (!productSchema.softwareVersion) {
    delete productSchema.softwareVersion
  }

  return (
    <>
      <JsonLdScript data={productSchema} id="product-schema" />
      <JsonLdScript data={breadcrumbSchema} id="breadcrumb-schema" />
      {reviewSchemas.length > 0 && reviewSchemas.map((reviewSchema, index) => (
        <JsonLdScript key={index} data={reviewSchema} id={`review-schema-${index}`} />
      ))}
      <ServerViewerProvider
        serverId={server.id}
        ownerId={server.userId}
        source={server.source}
        reviewsKey={reviewList.map((r) => `${r.id}:${r.updatedAt}:${r.helpfulCount}:${r.notHelpfulCount}`).join('|')}
      >
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
        {/* Main content - LCP target: render this first */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card - Critical LCP element */}
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <ServerIcon 
                  iconUrl={server.iconUrl} 
                  name={server.name} 
                  size={80} 
                  className="rounded-xl"
                  priority
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-card-foreground">{server.name}</h1>
                        {server.source === 'official' && (
                          <Badge variant="outline" className="border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950">
                            Official
                          </Badge>
                        )}
                      </div>
                      {server.source === 'official' ? (
                        <p className="mt-1 text-muted-foreground">by {server.organization}</p>
                      ) : server.source === 'user' ? (
                        <p className="mt-1 text-muted-foreground">
                          {server.authorUsername && server.userId ? (
                            <Link
                              href={`/users/${server.userId}`}
                              className="ml-1 hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors"
                            >
                              @{server.authorUsername}
                            </Link>
                          ) : server.authorUsername ? (
                            <span className="ml-1">@{server.authorUsername}</span>
                          ) : null}
                          {server.organization 
                            ? ` (${server.organization})`
                            : ' '
                          }
                        </p>
                      ) : (
                        <p className="mt-1 text-muted-foreground">by {server.organization}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {server.version && (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          v{server.version}
                        </Badge>
                      )}
                      <ViewerServerActions serverId={server.id} />
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
                <div className="flex items-start gap-2">
                  <div className="text-card-foreground whitespace-pre-wrap break-words leading-relaxed text-base flex-1">
                    {server.description}
                  </div>
                  {server.source === 'registry' && (server.description.endsWith('...') || server.description.endsWith('…')) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-red-500 text-red-500 font-bold text-xs cursor-help shrink-0">!</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Complete description was not uploaded by the author on the original reference.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground/70 italic">No description available</p>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          {((server.tools && Array.isArray(server.tools) && server.tools.length > 0) || server.hasManyTools) && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Tools</CardTitle>
              </CardHeader>
              <CardContent>
                {server.tools && Array.isArray(server.tools) && server.tools.length > 0 ? (
                  <div className="space-y-4">
                    {(server.tools as Array<{ name: string; description: string }>).map((tool, idx) => (
                      <div key={idx} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <h4 className="text-base font-semibold text-card-foreground mb-1">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {server.hasManyTools && server.completeToolsUrl && (
                  <div className={server.tools && Array.isArray(server.tools) && server.tools.length > 0 ? "mt-4 pt-4 border-t border-border" : ""}>
                    <p className="text-sm text-muted-foreground mb-2">
                      This server has 5+ tools. View the complete list:
                    </p>
                    <a
                      href={server.completeToolsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 underline"
                    >
                      {server.completeToolsUrl}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Usage Tips */}
          {server.usageTips && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Usage Tips & Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-card-foreground whitespace-pre-wrap break-words leading-relaxed text-base">
                  {server.usageTips}
                </div>
              </CardContent>
            </Card>
          )}

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
          {/* Rating Card - renders immediately with cached server data */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingDisplay
                rating={server.avgRating ?? 0}
                totalRatings={server.totalRatings ?? 0}
              />
            </CardContent>
          </Card>

          {/* Viewer-specific: rating form state, own votes (loaded on the client) */}
          <ViewerRatingForm serverId={server.id} />
          <ViewerReviews serverId={server.id} reviews={reviewList} />

          {/* README badge embed (linked from /badges) */}
          <Card id="readme-badge" className="border-border bg-card scroll-mt-24">
            <CardHeader>
              <CardTitle className="text-card-foreground">README Badge</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeEmbed serverId={server.id} baseUrl={baseUrl} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
      </ServerViewerProvider>
    </>
  )
}
