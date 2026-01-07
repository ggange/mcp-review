'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { RatingForm } from './rating-form'
import { getAvatarColor } from '@/lib/utils'
import type { ReviewWithVotes } from '@/types'

interface ReviewCardProps {
  review: ReviewWithVotes
  currentUserId?: string
  serverId: string
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? 'text-amber-400' : 'text-muted-foreground/50'}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  )
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating - fullStars >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} filled={star <= fullStars || (star === fullStars + 1 && hasHalfStar)} />
      ))}
    </div>
  )
}

export function ReviewCard({ review, currentUserId, serverId }: ReviewCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [isFlagging, setIsFlagging] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount)
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.notHelpfulCount)
  const [userVote, setUserVote] = useState(review.userVote)

  const isOwnReview = !!(currentUserId && review.userId === currentUserId)
  const avatarColor = getAvatarColor(review.user.name || 'U')

  const handleVote = async (helpful: boolean) => {
    if (isVoting || isOwnReview) return

    setIsVoting(true)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reviews/${review.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ helpful }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to submit vote')
        }

        const result = await response.json()
        setHelpfulCount(result.data.helpfulCount)
        setNotHelpfulCount(result.data.notHelpfulCount)
        setUserVote({ helpful })
        router.refresh()
      } catch (err) {
        console.error('Vote error:', err)
      } finally {
        setIsVoting(false)
      }
    })
  }

  const handleFlag = async () => {
    if (isFlagging || isOwnReview) return

    if (!confirm('Are you sure you want to flag this review?')) {
      return
    }

    setIsFlagging(true)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reviews/${review.id}/flag`, {
          method: 'POST',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to flag review')
        }

        router.refresh()
      } catch (err) {
        console.error('Flag error:', err)
        alert(err instanceof Error ? err.message : 'Failed to flag review')
      } finally {
        setIsFlagging(false)
      }
    })
  }

  const handleEditSuccess = () => {
    setIsEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (isDeleting || !isOwnReview) return

    if (!confirm('Are you sure you want to delete your review? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/reviews/${review.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to delete review')
        }

        router.refresh()
      } catch (err) {
        console.error('Delete error:', err)
        alert(err instanceof Error ? err.message : 'Failed to delete review')
      } finally {
        setIsDeleting(false)
      }
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-card-foreground">Edit Your Review</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
        <RatingForm
          serverId={serverId}
          existingRating={{
            id: review.id,
            trustworthiness: review.trustworthiness,
            usefulness: review.usefulness,
            text: review.text,
          }}
          onSuccess={handleEditSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Link href={`/users/${review.userId}`} className="shrink-0">
          <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
            <AvatarImage src={review.user.image || undefined} />
            <AvatarFallback className={avatarColor}>
              {review.user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <Link 
                href={`/users/${review.userId}`}
                className="font-medium text-card-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {review.user.name || 'Anonymous'}
              </Link>
              <div className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {review.updatedAt.getTime() !== review.createdAt.getTime() && (
                  <span className="ml-2 italic">(edited)</span>
                )}
              </div>
            </div>
            {isOwnReview && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Trustworthiness:</span>
              <RatingStars rating={review.trustworthiness} />
              <span className="font-medium text-card-foreground">{review.trustworthiness}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Usefulness:</span>
              <RatingStars rating={review.usefulness} />
              <span className="font-medium text-card-foreground">{review.usefulness}</span>
            </div>
          </div>

          {review.text && (
            <p className="text-sm text-card-foreground whitespace-pre-wrap break-words leading-relaxed">
              {review.text}
            </p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(true)}
                disabled={isVoting || isOwnReview}
                className={`h-8 text-xs ${
                  userVote?.helpful === true ? 'bg-muted' : ''
                }`}
              >
                <svg
                  className="mr-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                Helpful ({helpfulCount})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote(false)}
                disabled={isVoting || isOwnReview}
                className={`h-8 text-xs ${
                  userVote?.helpful === false ? 'bg-muted' : ''
                }`}
              >
                <svg
                  className="mr-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 019.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                  />
                </svg>
                Not Helpful ({notHelpfulCount})
              </Button>
            </div>
            {!isOwnReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFlag}
                disabled={isFlagging}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                Flag
              </Button>
            )}
          </div>
        </div>
      </div>
      <Separator />
    </div>
  )
}

