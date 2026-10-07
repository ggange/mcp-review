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
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
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
        totalRatings: true,
      },
      take: 2000, // Increased limit for better coverage
      orderBy: {
        totalRatings: 'desc', // Prioritize most-reviewed servers
      },
    })

    const serverRoutes: MetadataRoute.Sitemap = servers.map((server) => {
      // Use syncedAt if available, otherwise createdAt, fallback to current date
      const lastModified = server.syncedAt || server.createdAt || new Date()
      
      // Higher priority for official servers and highly-rated servers
      let priority = 0.7
      if (server.source === 'official') {
        priority = 0.8
      } else if (server.source === 'user') {
        priority = 0.75
      }
      // Boost priority for servers with many ratings
      if (server.totalRatings && server.totalRatings > 10) {
        priority = Math.min(priority + 0.05, 0.85)
      }

      // Change frequency based on source and activity
      let changeFreq: 'weekly' | 'monthly' = 'weekly'
      if (server.source === 'official' && !server.syncedAt) {
        changeFreq = 'monthly'
      }

      return {
        url: `${baseUrl}/servers/${encodeURIComponent(server.id)}`,
        lastModified,
        changeFrequency: changeFreq,
        priority,
      }
    })

    return [...staticRoutes, ...categoryRoutes, ...sourceRoutes, ...serverRoutes]
  } catch (error) {
    // If database query fails, return at least static routes
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to generate sitemap:', error instanceof Error ? error.message : 'Unknown error')
    }
    return [...staticRoutes, ...categoryRoutes, ...sourceRoutes]
  }
}
