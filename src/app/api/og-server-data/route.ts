import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serverId = searchParams.get('serverId')

  if (!serverId) {
    return Response.json({ error: 'serverId is required' }, { status: 400 })
  }

  try {
    const decodedId = decodeURIComponent(serverId)
    const server = await prisma.server.findUnique({
      where: { id: decodedId },
      select: {
        name: true,
        description: true,
        organization: true,
        iconUrl: true,
        avgRating: true,
        totalRatings: true,
        category: true,
      },
    })

    if (!server) {
      return Response.json({ error: 'Server not found' }, { status: 404 })
    }

    return Response.json(server)
  } catch (error) {
    console.error('Error fetching server data for OG:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
