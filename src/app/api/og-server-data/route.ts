import { NextRequest } from 'next/server'
import { getServerDetail } from '@/lib/server-queries'

export const runtime = 'nodejs'

// Social crawlers fetch OG images repeatedly; let the CDN absorb them
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serverId = searchParams.get('serverId')

  if (!serverId || serverId.length > 201) {
    return Response.json({ error: 'serverId is required' }, { status: 400 })
  }

  try {
    const server = await getServerDetail(decodeURIComponent(serverId))

    if (!server) {
      return Response.json({ error: 'Server not found' }, { status: 404, headers: CACHE_HEADERS })
    }

    const { name, description, organization, iconUrl, avgRating, totalRatings, category } = server
    return Response.json(
      { name, description, organization, iconUrl, avgRating, totalRatings, category },
      { headers: CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Error fetching server data for OG:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
