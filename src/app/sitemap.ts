import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

  // MCP server categories for SEO
  const categories = [
    'database',
    'search',
    'code',
    'web',
    'ai',
    'data',
    'tools',
    'other',
  ]

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // Category routes for better SEO coverage
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/?category=${category}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Source filter routes
  const sourceRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/?source=official`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?source=user`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
  ]

  try {
    // Get all servers for dynamic routes
    const servers = await prisma.server.findMany({
      select: {
        id: true,
        syncedAt: true,
        createdAt: true,
        source: true,
      },
      take: 2000, // Increased limit for better coverage
      orderBy: {
        totalRatings: 'desc', // Prioritize most-reviewed servers
      },
    })

    const serverRoutes: MetadataRoute.Sitemap = servers.map((server) => ({
      url: `${baseUrl}/servers/${encodeURIComponent(server.id)}`,
      lastModified: server.syncedAt || server.createdAt,
      changeFrequency: 'weekly' as const,
      // Official servers get slightly higher priority
      priority: server.source === 'official' ? 0.8 : 0.7,
    }))

    return [...staticRoutes, ...categoryRoutes, ...sourceRoutes, ...serverRoutes]
  } catch (error) {
    // If database query fails, return at least static routes
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to generate sitemap:', error instanceof Error ? error.message : 'Unknown error')
    }
    return [...staticRoutes, ...categoryRoutes, ...sourceRoutes]
  }
}
