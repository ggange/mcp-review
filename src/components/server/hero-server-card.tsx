"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getAvatarColor } from '@/lib/utils'
import type { ServerWithRatings } from '@/types'

interface HeroServerCardProps {
  server: ServerWithRatings
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
}

export function HeroServerCard({ server }: HeroServerCardProps) {
  const initial = server.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(server.name)
  const hasRatings = server.totalRatings > 0
  const avgRating = hasRatings ? (server.avgTrustworthiness + server.avgUsefulness) / 2 : 0

  const authorDisplay = server.source === 'user' 
    ? (server.authorUsername ? `@${server.authorUsername}` : (server.organization || 'Unknown'))
    : (server.organization || 'Unknown')

  return (
    <Link 
      href={`/servers/${encodeURIComponent(server.id)}`}
      className="group flex items-center gap-3 rounded-lg p-2.5 transition-all hover:bg-muted/50"
    >
      {/* Icon */}
      {server.iconUrl ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border/50">
          <Image
            src={server.iconUrl}
            alt={server.name}
            width={36}
            height={36}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor}`}>
          <span className="text-sm font-bold text-white">{initial}</span>
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {server.name}
        </h4>
        <p className="truncate text-xs text-muted-foreground">
          {server.source === 'user' && server.userId && server.authorUsername ? (
            <Link
              href={`/users/${server.userId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors"
            >
              @{server.authorUsername}
            </Link>
          ) : (
            authorDisplay
          )}
        </p>
      </div>

      {/* Rating and Badge */}
      <div className="flex items-center gap-2 shrink-0">
        {server.source === 'official' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 text-[10px] px-1.5 py-0">
                Official
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Official server uploaded by administrators</p>
            </TooltipContent>
          </Tooltip>
        )}
        {server.source === 'user' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 text-[10px] px-1.5 py-0">
                User
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Server uploaded by users on MCP Review</p>
            </TooltipContent>
          </Tooltip>
        )}
        {hasRatings ? (
          <div className="flex items-center gap-1">
            <StarIcon className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-muted-foreground">{avgRating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">New</span>
        )}
      </div>
    </Link>
  )
}
