'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingForm } from '@/components/rating/rating-form'
import { ReviewCard } from '@/components/rating/review-card'
import { ServerActions } from '@/components/server/server-actions'
import type { PublicReview } from '@/lib/server-queries'
import type { ServerViewerData } from '@/app/api/servers/[id]/me/route'

/**
 * Per-viewer state for a server page. The page HTML is cached and identical
 * for every visitor; this fills in the signed-in viewer's bits on the client:
 * owner actions, whether they already rated, and their votes on reviews.
 */
interface ServerViewerState {
  status: 'loading' | 'signed-out' | 'signed-in'
  userId?: string
  isOwner: boolean
  /** null while the viewer data is loading (or failed to load) */
  data: ServerViewerData | null
}

const ServerViewerContext = createContext<ServerViewerState>({
  status: 'loading',
  isOwner: false,
  data: null,
})

interface ServerViewerProviderProps {
  serverId: string
  ownerId: string | null
  source: string
  /** Changes whenever the rendered reviews change, so viewer data is refetched after router.refresh() */
  reviewsKey: string
  children: React.ReactNode
}

export function ServerViewerProvider({ serverId, ownerId, source, reviewsKey, children }: ServerViewerProviderProps) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const [result, setResult] = useState<{ key: string; data: ServerViewerData } | null>(null)
  const fetchKey = userId ? `${userId}|${serverId}|${reviewsKey}` : null

  useEffect(() => {
    if (!fetchKey) return
    let cancelled = false
    fetch(`/api/servers/${encodeURIComponent(serverId)}/me`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: ServerViewerData } | null) => {
        if (!cancelled && json?.data) setResult({ key: fetchKey, data: json.data })
      })
      .catch(() => {
        // Leave data null: the page still works, minus the personalised bits
      })
    return () => {
      cancelled = true
    }
  }, [fetchKey, serverId])

  const state: ServerViewerState = {
    status: status === 'loading' ? 'loading' : userId ? 'signed-in' : 'signed-out',
    userId,
    isOwner: !!(userId && source === 'user' && ownerId === userId),
    // Ignore data fetched for a previous user/review set
    data: result && result.key === fetchKey ? result.data : null,
  }

  return <ServerViewerContext.Provider value={state}>{children}</ServerViewerContext.Provider>
}

function useServerViewer() {
  return useContext(ServerViewerContext)
}

/** Edit/delete buttons, shown only to the owner of a user-submitted server */
export function ViewerServerActions({ serverId }: { serverId: string }) {
  const { isOwner } = useServerViewer()
  return isOwner ? <ServerActions serverId={serverId} /> : null
}

function RatingCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Rate This Server</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** The "Rate This Server" card, depending on who is viewing */
export function ViewerRatingForm({ serverId }: { serverId: string }) {
  const { status, isOwner, data } = useServerViewer()

  if (status === 'loading' || (status === 'signed-in' && !isOwner && !data)) {
    return (
      <RatingCard>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </RatingCard>
    )
  }

  if (status === 'signed-out') {
    return (
      <RatingCard>
        <div className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">Sign in to rate this server</p>
          <Link href="/auth/signin">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600">
              Sign in
            </Button>
          </Link>
        </div>
      </RatingCard>
    )
  }

  if (isOwner) {
    return (
      <RatingCard>
        <p className="text-center text-sm text-muted-foreground">You cannot rate your own server</p>
      </RatingCard>
    )
  }

  if (data?.hasRated) return null

  return (
    <RatingCard>
      <RatingForm serverId={serverId} />
    </RatingCard>
  )
}

/** Review list, with the viewer's own votes and edit/delete controls */
export function ViewerReviews({ serverId, reviews }: { serverId: string; reviews: PublicReview[] }) {
  const { userId, data } = useServerViewer()
  if (reviews.length === 0) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review) => {
            const vote = data?.votes[review.id]
            return (
              <ReviewCard
                // ReviewCard copies userVote into state, so remount once votes arrive
                key={`${review.id}:${data ? 'v' : '-'}`}
                review={{ ...review, userVote: vote === undefined ? null : { helpful: vote } }}
                currentUserId={userId}
                serverId={serverId}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
