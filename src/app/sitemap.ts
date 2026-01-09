import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://yourdomain.com'

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

  try {
    // Get all servers for dynamic routes
    const servers = await prisma.server.findMany({
      select: {
        id: true,
        syncedAt: true,
        createdAt: true,
      },
      take: 1000, // Limit to prevent sitemap from being too large
    })

    const serverRoutes: MetadataRoute.Sitemap = servers.map((server) => ({
      url: `${baseUrl}/servers/${encodeURIComponent(server.id)}`,
      lastModified: server.syncedAt || server.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...serverRoutes]
  } catch (error) {
    // If database query fails, return at least static routes
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to generate sitemap:', error instanceof Error ? error.message : 'Unknown error')
    }
    return staticRoutes
  }
}
