"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Github } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { RatingDisplay } from '@/components/rating/rating-display'
import { getAvatarColor } from '@/lib/utils'
import type { ServerWithRatings } from '@/types'

interface ServerCardProps {
  server: ServerWithRatings
}

export function ServerCard({ server }: ServerCardProps) {
  const initial = server.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(server.name)
  const isUserUploaded = server.source === 'user'
  const isOfficial = server.source === 'official'
  const toolsCount = server.tools && Array.isArray(server.tools) ? server.tools.length : 0

  const cardClassName = "group h-full cursor-pointer border-border bg-card transition-all hover:border-border hover:shadow-md"

  return (
    <Link href={`/servers/${encodeURIComponent(server.id)}`}>
      <Card className={`${cardClassName} gap-2`}>
        <CardHeader className="pb-0 overflow-hidden">
          <div className="flex items-start gap-4 w-full min-w-0">
            {/* Icon or Avatar */}
            {server.iconUrl ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border">
                <Image
                  src={server.iconUrl}
                  alt={server.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor}`}
              >
                <span className="text-xl font-bold text-white">{initial}</span>
              </div>
            )}
            
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="truncate text-lg font-semibold text-card-foreground group-hover:text-foreground">
                {server.name}
              </h3>
              {isOfficial ? (
                <p className="truncate text-sm text-muted-foreground">
                  {server.organization}
                </p>
              ) : isUserUploaded ? (
                <p className="truncate text-sm text-muted-foreground">
                  {server.authorUsername && (
                    <span>@{server.authorUsername}</span>
                  )}
                  {server.organization 
                    ? ` (${server.organization})`
                    : ``
                  }
                </p>
              ) : (
                <p className="truncate text-sm text-muted-foreground">
                  {server.organization}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col flex-1 pt-0">
          {server.description ? (
            <div className="mb-2 flex items-start gap-2">
              <p className="line-clamp-2 text-sm text-muted-foreground flex-1">
                {server.description}
              </p>
              {server.source === 'registry' && (server.description.endsWith('...') || server.description.endsWith('…')) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-red-500 text-red-500 font-bold text-xs cursor-help shrink-0">!</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete description was not uploaded by the author</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : (
            <p className="mb-2 text-sm italic text-muted-foreground/70">
              No description available
            </p>
          )}

          <div className="flex items-center justify-between mt-auto">
            <RatingDisplay
              trustworthiness={server.avgTrustworthiness}
              usefulness={server.avgUsefulness}
              totalRatings={server.totalRatings}
              compact
            />
            
            <div className="flex gap-2">
              {/* Source badge */}
              {isOfficial ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950">
                      Official
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Official server uploaded by administrators</p>
                  </TooltipContent>
                </Tooltip>
              ) : server.source === 'registry' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300">
                      MCP Registry
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      From {' '}
                      <a 
                        href="https://registry.modelcontextprotocol.io" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-violet-600 dark:hover:text-violet-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        MCP registry
                      </a>
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      User
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Server uploaded by users on MCP Review</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {server.hasManyTools ? (
                <Badge variant="outline" className="border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30">
                  5+ tools
                </Badge>
              ) : toolsCount > 0 ? (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {toolsCount} {toolsCount === 1 ? 'tool' : 'tools'}
                </Badge>
              ) : null}
              {server.repositoryUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      <Github />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>GitHub repository available</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {server.version && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  v{server.version}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

