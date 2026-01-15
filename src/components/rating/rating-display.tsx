import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface RatingDisplayProps {
  rating: number
  totalRatings: number
  compact?: boolean
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

export function RatingDisplay({ rating, totalRatings, compact }: RatingDisplayProps) {
  if (totalRatings === 0) {
    return (
      <div className="text-sm text-muted-foreground/70">
        No ratings yet
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <RatingStars rating={rating} />
        <span className="text-sm text-muted-foreground">({totalRatings})</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-help border-b border-dashed border-border">
              Rating
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-popover border-border">
            <p className="text-sm text-popover-foreground">
              Overall rating based on community feedback
            </p>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2">
          <RatingStars rating={rating} />
          <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground/70">
        Based on {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
      </p>
    </div>
  )
}


