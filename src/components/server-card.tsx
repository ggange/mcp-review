import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RatingDisplay } from './rating-display'
import type { ServerWithRatings } from '@/types'

interface ServerCardProps {
  server: ServerWithRatings
}

// Generate a consistent color based on the server name
function getAvatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
    'from-cyan-500 to-blue-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export function ServerCard({ server }: ServerCardProps) {
  const initial = server.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(server.name)

  return (
    <Link href={`/servers/${encodeURIComponent(server.id)}`}>
      <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:border-border hover:shadow-md">
        <CardHeader className="pb-3 overflow-hidden">
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor}`}
            >
              <span className="text-xl font-bold text-white">{initial}</span>
            </div>
            
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="truncate text-lg font-semibold text-card-foreground group-hover:text-foreground">
                {server.name}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                by {server.organization}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {server.description ? (
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {server.description}
            </p>
          ) : (
            <p className="mb-4 text-sm italic text-muted-foreground/70">
              No description available
            </p>
          )}

          <div className="flex items-center justify-between">
            <RatingDisplay
              trustworthiness={server.avgTrustworthiness}
              usefulness={server.avgUsefulness}
              totalRatings={server.totalRatings}
              compact
            />
            
            <div className="flex gap-2">
              {server.isOfficial && (
                <Badge variant="secondary" className="bg-violet-500/20 text-violet-600 dark:text-violet-300">
                  Official
                </Badge>
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

