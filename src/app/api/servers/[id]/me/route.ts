import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { setPrivateCacheHeaders } from '@/lib/cdn-cache'
import { getApprovedReviews, getUserVotes } from '@/lib/server-queries'

interface RouteParams {
  params: Promise<{ id: string }>
}

export interface ServerViewerData {
  /** The viewer already rated this server (hides the rating form) */
  hasRated: boolean
  /** The viewer's votes on the reviews shown on the page, keyed by rating ID */
  votes: Record<string, boolean>
}

/**
 * Viewer-specific data for a server page
 * GET /api/servers/{id}/me
 *
 * The server page itself is cached and identical for everyone; signed-in
 * viewers fetch the few per-user bits from here. Signed-out viewers never call it.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return setPrivateCacheHeaders(
      NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not signed in' } }, { status: 401 })
    )
  }
  const userId = session.user.id

  try {
    const { id } = await params
    const serverId = decodeURIComponent(id)

    const [ownRating, reviews] = await Promise.all([
      prisma.rating.findUnique({
        where: { serverId_userId: { serverId, userId } },
        select: { id: true },
      }),
      getApprovedReviews(serverId),
    ])
    const votes = await getUserVotes(
      userId,
      reviews.filter((r) => r.userId !== userId).map((r) => r.id)
    )

    const data: ServerViewerData = { hasRated: !!ownRating, votes }
    return setPrivateCacheHeaders(NextResponse.json({ data }))
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Viewer data error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load viewer data' } },
      { status: 500 }
    )
  }
}
