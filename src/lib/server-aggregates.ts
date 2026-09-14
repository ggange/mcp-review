import { prisma } from '@/lib/db'

/**
 * Recalculate and persist a server's cached rating aggregates.
 *
 * Only "approved" ratings count. The reviews list on the server detail page
 * filters on that same status, so including flagged or removed ratings here
 * would leave avgRating/totalRatings describing reviews nobody can see — and
 * would mean flagging a review never removes its influence on the score.
 */
export async function recalculateServerAggregates(serverId: string): Promise<void> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [aggregates, recentCount] = await Promise.all([
    prisma.rating.aggregate({
      where: { serverId, status: 'approved' },
      _avg: {
        rating: true,
      },
      _count: true,
    }),
    prisma.rating.count({
      where: {
        serverId,
        status: 'approved',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  const avgRating = aggregates._avg.rating ?? 0
  const combinedScore = avgRating // Same as avgRating

  await prisma.server.update({
    where: { id: serverId },
    data: {
      avgRating,
      totalRatings: aggregates._count,
      combinedScore,
      recentRatingsCount: recentCount,
    } as {
      avgRating: number
      totalRatings: number
      combinedScore: number
      recentRatingsCount: number
    },
  })
}
