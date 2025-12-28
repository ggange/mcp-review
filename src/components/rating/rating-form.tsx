'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface RatingFormProps {
  serverId: string
  existingRating?: {
    trustworthiness: number
    usefulness: number
  } | null
}

function StarRating({
  value,
  onChange,
  label,
  tooltip,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  tooltip: string
}) {
  const [hoverValue, setHoverValue] = useState(0)

  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="text-sm font-medium text-muted-foreground cursor-help border-b border-dashed border-border">
            {label}
          </label>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-popover border-border">
          <p className="text-sm text-popover-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded"
          >
            <svg
              className={`h-6 w-6 transition-colors ${
                (hoverValue || value) >= star
                  ? 'text-amber-400'
                  : 'text-muted-foreground/50'
              }`}
              fill={(hoverValue || value) >= star ? 'currentColor' : 'none'}
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
          </button>
        ))}
      </div>
    </div>
  )
}

export function RatingForm({ serverId, existingRating }: RatingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [trustworthiness, setTrustworthiness] = useState(existingRating?.trustworthiness || 0)
  const [usefulness, setUsefulness] = useState(existingRating?.usefulness || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (trustworthiness === 0 || usefulness === 0) {
      setError('Please rate both categories')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId,
            trustworthiness,
            usefulness,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error?.message || 'Failed to submit rating')
        }

        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit rating')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StarRating
        value={trustworthiness}
        onChange={setTrustworthiness}
        label="Trustworthiness"
        tooltip="Do you trust this server? Consider: Is it from a known org? Is the code open source? Does it request minimal permissions?"
      />
      
      <StarRating
        value={usefulness}
        onChange={setUsefulness}
        label="Usefulness"
        tooltip="How useful is this server? Consider: Does it solve your problem? Is it well documented? Does it work reliably?"
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Submitting...
          </span>
        ) : existingRating ? (
          'Update Rating'
        ) : (
          'Submit Rating'
        )}
      </Button>
    </form>
  )
}

